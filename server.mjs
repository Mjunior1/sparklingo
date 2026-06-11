import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, 'dist')
const defaultVoiceId = (process.env.ELEVENLABS_VOICE_ID || '').trim() || 'Gfpl8Yo74Is0W6cPUWWT'
const defaultModelId = (process.env.ELEVENLABS_MODEL_ID || '').trim() || 'eleven_multilingual_v2'
const elevenLabsApiKey = (process.env.ELEVENLABS_API_KEY || '').trim()
const speechCache = new Map()
const speechCacheTtlMs = 1000 * 60 * 60 * 12
const port = Number(process.env.PORT || 3000)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

const parseJsonBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

const buildRuntimeSpeechCacheKey = (text, voiceId, modelId) =>
  createHash('sha256')
    .update(`${voiceId}::${modelId}::${text.trim().toLowerCase()}`)
    .digest('hex')

const synthesizeRuntimeSpeech = async (text, voiceId = defaultVoiceId, modelId = defaultModelId) => {
  const cacheKey = buildRuntimeSpeechCacheKey(text, voiceId, modelId)
  const cached = speechCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ok: true,
      audioBase64: cached.audioBase64,
      contentType: cached.contentType,
      voiceId,
      modelId,
      cacheKey,
    }
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      accept: 'audio/mpeg',
      'content-type': 'application/json',
      'xi-api-key': elevenLabsApiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.42,
        similarity_boost: 0.78,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    let message = `ElevenLabs respondeu com HTTP ${response.status}.`
    if (contentType.includes('application/json')) {
      const json = await response.json().catch(() => null)
      message = json?.detail?.message || json?.message || message
    } else {
      const textResponse = await response.text().catch(() => '')
      if (textResponse) message = textResponse
    }
    throw new Error(message)
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg'
  const audioBase64 = Buffer.from(await response.arrayBuffer()).toString('base64')

  speechCache.set(cacheKey, {
    audioBase64,
    contentType,
    expiresAt: Date.now() + speechCacheTtlMs,
  })

  return {
    ok: true,
    audioBase64,
    contentType,
    voiceId,
    modelId,
    cacheKey,
  }
}

const serveStatic = async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  let requestedPath = join(distDir, safePath)

  try {
    const details = await stat(requestedPath)
    if (details.isDirectory()) requestedPath = join(requestedPath, 'index.html')
  } catch {
    requestedPath = join(distDir, safePath)
  }

  let filePath = requestedPath
  try {
    const details = await stat(filePath)
    if (details.isDirectory()) filePath = join(filePath, 'index.html')
  } catch {
    filePath = join(distDir, 'index.html')
  }

  try {
    const content = await readFile(filePath)
    const extension = extname(filePath).toLowerCase()
    res.writeHead(200, {
      'content-type': mimeTypes[extension] || 'application/octet-stream',
    })
    res.end(content)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (req.method === 'POST' && url.pathname === '/api/runtime-speech') {
      if (!elevenLabsApiKey) {
        sendJson(res, 503, {
          ok: false,
          error: 'ElevenLabs não está configurado no Railway.',
        })
        return
      }

      const body = await parseJsonBody(req)
      const text = typeof body.text === 'string' ? body.text.trim() : ''
      const voiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : defaultVoiceId
      const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : defaultModelId

      if (!text) {
        sendJson(res, 400, {
          ok: false,
          error: 'Informe um texto para sintetizar.',
        })
        return
      }

      if (text.length > 420) {
        sendJson(res, 400, {
          ok: false,
          error: 'O texto do runtime precisa ter no máximo 420 caracteres.',
        })
        return
      }

      const payload = await synthesizeRuntimeSpeech(text, voiceId, modelId)
      sendJson(res, 200, payload)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        ttsConfigured: Boolean(elevenLabsApiKey),
      })
      return
    }

    await serveStatic(req, res)
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro interno do runtime speech.',
    })
  }
})

server.listen(port, () => {
  console.log(`SparkLingo server listening on port ${port}`)
})
