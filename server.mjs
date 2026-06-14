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
const openRouterApiKey = (process.env.OPENROUTER_API_KEY || '').trim()
const openRouterModel = (process.env.OPENROUTER_MODEL || '').trim() || 'openai/gpt-4o-mini'
const runtimeVoiceRoles = ['narration', 'npc', 'spark', 'learner-guide']
const runtimeVoiceRoleConfig = {
  narration: (process.env.ELEVENLABS_VOICE_ID_NARRATION || '').trim(),
  npc: (process.env.ELEVENLABS_VOICE_ID_NPC || '').trim(),
  spark: (process.env.ELEVENLABS_VOICE_ID_SPARK || '').trim(),
  'learner-guide': (process.env.ELEVENLABS_VOICE_ID_LEARNER_GUIDE || '').trim(),
}
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

const aiMissionLog = (event, payload) => {
  console.log(`[ai-mission-studio] ${event}`, payload)
}

const runtimeSpeechLog = (event, payload) => {
  console.log(`[runtime-speech] ${event}`, payload)
}

const parseJsonBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

const safeString = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const buildAiMetric = (label, value, why) => ({ label, value, why })

const buildLocalSceneDraft = (brief, sceneAsset = null, defaults = {}) => {
  const nextId = safeString(defaults.nextId, `RT-AI-${Date.now()}`)
  const order = Number(defaults.order) || 1
  const background =
    safeString(sceneAsset?.heroBackgroundImageUrl) ||
    safeString(sceneAsset?.backgroundImageUrl) ||
    safeString(sceneAsset?.imageUrlDesktop) ||
    safeString(sceneAsset?.imageUrl) ||
    '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png'
  const mobileBackground =
    safeString(sceneAsset?.imageUrlMobile) ||
    safeString(sceneAsset?.mobileImageUrl) ||
    background
  const character = safeString(brief.scenario, 'Immigration Officer')

  return {
    source: 'local-fallback',
    brief,
    runtimeScene: {
      id: nextId,
      sceneAssetId: safeString(brief.sceneAssetId, safeString(sceneAsset?.id)),
      lessonId: safeString(defaults.lessonId),
      missionTitle: safeString(brief.mission, 'Airport Arrival'),
      chapter: 'Chapter 1',
      sceneNumber: 1,
      sceneTotal: 1,
      title: safeString(brief.mission, 'Airport Arrival'),
      subtitle: safeString(brief.learningIntent, safeString(brief.learningOutcome)),
      character: character.toUpperCase(),
      dialogue: character,
      question: "What's the purpose of your trip?",
      questionTranslation: 'Qual é o propósito da sua viagem?',
      backgroundImageUrl: background,
      backgroundImageUrlMobile: mobileBackground,
      backgroundFocalX: Number(sceneAsset?.focalPointX) || 56,
      backgroundFocalY: Number(sceneAsset?.focalPointY) || 52,
      backgroundOffsetX: 0,
      backgroundOffsetY: 0,
      backgroundScale: 104,
      companionImageUrl: '/Images/Mascote/Sparklingo.png',
      companionScale: 92,
      companionOffsetX: 0,
      companionOffsetY: -55,
      companionGlowStrength: 54,
      feedbackCompanionPositiveImageUrl: '/Images/Mascote/spark-happy.png',
      feedbackCompanionRetryImageUrl: '/Images/Mascote/spark-try-again.png',
      storyFeedbackCompanionPositiveImageUrl: '/Images/Mascote/spark-happy.png',
      storyFeedbackCompanionRetryImageUrl: '/Images/Mascote/spark-try-again.png',
      audioUrl: '',
      promptAudioIconUrl: '',
      answerAudioIconUrl: '',
      feedbackIconUrl: '',
      rewardIconUrl: '',
      rewardChestIconUrl: '',
      xpReward: 25,
      emotionalFeedbackTitle: 'That sounded natural.',
      emotionalFeedbackBody: 'Resposta clara, simples e natural para a imigração.',
      emotionalFeedbackTone: 'celebration',
      nextSceneId: '',
      active: true,
      order,
      answers: [
        {
          id: 'answer-tourism',
          text: "I'm here for tourism.",
          translation: 'Estou aqui para turismo.',
          audioUrl: '',
          isCorrect: true,
          feedbackTitle: 'Nice choice.',
          feedbackBody: 'You answered clearly and matched the officer’s question.',
          xpReward: 25,
        },
        {
          id: 'answer-study',
          text: "I'm here to study English.",
          translation: 'Estou aqui para estudar inglês.',
          audioUrl: '',
          isCorrect: false,
          feedbackTitle: 'Almost there.',
          feedbackBody: 'This is clear, but it does not match this travel purpose.',
          xpReward: 15,
        },
        {
          id: 'answer-vague',
          text: "I'm here.",
          translation: 'Estou aqui.',
          audioUrl: '',
          isCorrect: false,
          feedbackTitle: 'Keep going.',
          feedbackBody: 'The officer needs one clear purpose. Add tourism, business or study.',
          xpReward: 10,
        },
      ],
    },
    quality: {
      linguisticQuality: {
        grammarCoverage: buildAiMetric('Grammar Coverage', '92%', `Usa ${safeString(brief.grammarTarget, 'a estrutura alvo')} em fala curta e funcional.`),
        vocabularyDifficulty: buildAiMetric('Vocabulary Difficulty', safeString(brief.level, 'A1'), 'Chunks de sobrevivência e vocabulário previsível.'),
        estimatedDuration: buildAiMetric('Estimated Duration', '2 min', 'Uma escuta curta, uma escolha e feedback sem alongar a tensão.'),
        listeningLoad: buildAiMetric('Listening Load', 'Medium', 'Pergunta realista, curta e contextual.'),
        speakingLoad: buildAiMetric('Speaking Load', 'Low', 'Resposta resolvida com uma frase simples.'),
        learningOutcomeCoverage: buildAiMetric('Learning Outcome Coverage', 'High', safeString(brief.learningOutcome)),
      },
      confidenceImpact: {
        anxietyReduction: buildAiMetric('Anxiety Reduction', 'High', safeString(brief.confidenceGoal)),
        recoverySupport: buildAiMetric('Recovery Support', 'High', `Recuperação ${safeString(brief.recoveryStyle, 'gentil').toLowerCase()}.`),
        speakingConfidenceImpact: buildAiMetric('Speaking Confidence Impact', 'High', 'Reforça resposta curta e natural sem penalizar pequenos erros.'),
        emotionalSafety: buildAiMetric('Emotional Safety', 'High', safeString(brief.emotionalTone, 'Leve tensão.')),
        realWorldTransfer: buildAiMetric('Real World Transfer', 'High', safeString(brief.realLifeTransfer)),
      },
    },
    validation: {
      valid: true,
      issues: [],
    },
  }
}

const extractJsonObject = (content) => {
  const text = safeString(content)
  if (!text) throw new Error('Resposta vazia do provider de IA.')
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Provider de IA não retornou JSON.')
    return JSON.parse(match[0])
  }
}

const fetchAiSceneDraft = async (brief, sceneAsset, defaults) => {
  const fallback = buildLocalSceneDraft(brief, sceneAsset, defaults)
  if (!openRouterApiKey) return fallback

  const prompt = `
You are SparkLingo's AI Mission Studio.
Generate exactly one complete runtime Scene Draft for a cinematic language-learning mission.
Return strict JSON only. No markdown.

Brief:
${JSON.stringify(brief, null, 2)}

Scene asset context:
${JSON.stringify(sceneAsset || {}, null, 2)}

Required JSON shape:
{
  "runtimeScene": {
    "title": string,
    "subtitle": string,
    "character": string,
    "dialogue": string,
    "question": string,
    "questionTranslation": string,
    "xpReward": number,
    "emotionalFeedbackTitle": string,
    "emotionalFeedbackBody": string,
    "emotionalFeedbackTone": "celebration" | "recovery" | "calm" | "confidence",
    "answers": [
      { "id": string, "text": string, "translation": string, "isCorrect": boolean, "feedbackTitle": string, "feedbackBody": string, "xpReward": number }
    ]
  },
  "quality": {
    "linguisticQuality": {
      "grammarCoverage": { "label": "Grammar Coverage", "value": string, "why": string },
      "vocabularyDifficulty": { "label": "Vocabulary Difficulty", "value": string, "why": string },
      "estimatedDuration": { "label": "Estimated Duration", "value": string, "why": string },
      "listeningLoad": { "label": "Listening Load", "value": "Low" | "Medium" | "High", "why": string },
      "speakingLoad": { "label": "Speaking Load", "value": "Low" | "Medium" | "High", "why": string },
      "learningOutcomeCoverage": { "label": "Learning Outcome Coverage", "value": "Low" | "Medium" | "High", "why": string }
    },
    "confidenceImpact": {
      "anxietyReduction": { "label": "Anxiety Reduction", "value": "Low" | "Medium" | "High", "why": string },
      "recoverySupport": { "label": "Recovery Support", "value": "Low" | "Medium" | "High", "why": string },
      "speakingConfidenceImpact": { "label": "Speaking Confidence Impact", "value": "Low" | "Medium" | "High", "why": string },
      "emotionalSafety": { "label": "Emotional Safety", "value": "Low" | "Medium" | "High", "why": string },
      "realWorldTransfer": { "label": "Real World Transfer", "value": "Low" | "Medium" | "High", "why": string }
    }
  }
}

Rules:
- Generate one scene only.
- Do not generate a full mission.
- Exactly 3 answers.
- Exactly one correct answer.
- Keep text appropriate for level ${safeString(brief.level, 'A1')}.
- The scene must feel like a real situation, not a school quiz.
- Preserve short, speakable English answers.
`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${openRouterApiKey}`,
      'content-type': 'application/json',
      'http-referer': 'https://sparklingo.app',
      'x-title': 'SparkLingo AI Mission Studio',
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.45,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `OpenRouter HTTP ${response.status}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  const aiDraft = extractJsonObject(content)

  return {
    ...fallback,
    source: 'ai',
    runtimeScene: {
      ...fallback.runtimeScene,
      ...aiDraft.runtimeScene,
      id: fallback.runtimeScene.id,
      sceneAssetId: fallback.runtimeScene.sceneAssetId,
      lessonId: fallback.runtimeScene.lessonId,
      missionTitle: fallback.runtimeScene.missionTitle,
      chapter: fallback.runtimeScene.chapter,
      sceneNumber: fallback.runtimeScene.sceneNumber,
      sceneTotal: fallback.runtimeScene.sceneTotal,
      backgroundImageUrl: fallback.runtimeScene.backgroundImageUrl,
      backgroundImageUrlMobile: fallback.runtimeScene.backgroundImageUrlMobile,
      active: true,
      order: fallback.runtimeScene.order,
      answers: Array.isArray(aiDraft.runtimeScene?.answers) && aiDraft.runtimeScene.answers.length
        ? aiDraft.runtimeScene.answers.slice(0, 3).map((answer, index) => ({
            ...fallback.runtimeScene.answers[index],
            ...answer,
            id: safeString(answer?.id, `answer-${index + 1}`),
            audioUrl: '',
          }))
        : fallback.runtimeScene.answers,
    },
    quality: aiDraft.quality || fallback.quality,
    validation: {
      valid: true,
      issues: [],
    },
  }
}

const maskVoiceId = (voiceId) => {
  if (!voiceId) return 'missing'
  if (voiceId.length <= 8) return voiceId
  return `${voiceId.slice(0, 4)}...${voiceId.slice(-4)}`
}

const buildRuntimeSpeechCacheKey = (text, voiceId, modelId) =>
  createHash('sha256')
    .update(`${voiceId}::${modelId}::${text.trim().toLowerCase()}`)
    .digest('hex')

const isRuntimeVoiceRole = (value) => runtimeVoiceRoles.includes(value)

const resolveRuntimeVoiceId = (requestedVoiceId, voiceRole) => {
  if (requestedVoiceId) return requestedVoiceId
  if (voiceRole && runtimeVoiceRoleConfig[voiceRole]) {
    return runtimeVoiceRoleConfig[voiceRole]
  }
  return defaultVoiceId
}

const resolveRuntimeVoiceSource = (requestedVoiceId, voiceRole) => {
  if (requestedVoiceId) return 'explicit'
  if (voiceRole && runtimeVoiceRoleConfig[voiceRole]) return `role:${voiceRole}`
  return 'default'
}

const fetchElevenLabsSpeech = async (text, voiceId, modelId) => {
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
        stability: 0.5,
        similarity_boost: 0.78,
        style: 0.08,
        speed: 0.86,
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

  return {
    contentType: response.headers.get('content-type') || 'audio/mpeg',
    audioBase64: Buffer.from(await response.arrayBuffer()).toString('base64'),
  }
}

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
      fallbackUsed: false,
      cacheHit: true,
      resolvedVoiceId: voiceId,
    }
  }

  let contentType = 'audio/mpeg'
  let audioBase64 = ''
  let fallbackUsed = false

  try {
    const response = await fetchElevenLabsSpeech(text, voiceId, modelId)
    contentType = response.contentType
    audioBase64 = response.audioBase64
  } catch (error) {
    if (voiceId !== defaultVoiceId) {
      console.warn(`[runtime-speech] role voice failed for ${voiceId}, retrying default voice`, error instanceof Error ? error.message : error)
      const fallbackResponse = await fetchElevenLabsSpeech(text, defaultVoiceId, modelId)
      contentType = fallbackResponse.contentType
      audioBase64 = fallbackResponse.audioBase64
      voiceId = defaultVoiceId
      fallbackUsed = true
    } else {
      throw error
    }
  }

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
    fallbackUsed,
    cacheHit: false,
    resolvedVoiceId: voiceId,
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

    if (req.method === 'POST' && url.pathname === '/api/ai/scene-draft') {
      const body = await parseJsonBody(req)
      const brief = body?.brief && typeof body.brief === 'object' ? body.brief : {}
      const sceneAsset = body?.sceneAsset && typeof body.sceneAsset === 'object' ? body.sceneAsset : null
      const defaults = body?.defaults && typeof body.defaults === 'object' ? body.defaults : {}
      const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

      aiMissionLog('request', {
        requestId,
        providerConfigured: Boolean(openRouterApiKey),
        model: openRouterModel,
        world: safeString(brief.world),
        mission: safeString(brief.mission),
        level: safeString(brief.level),
        skill: safeString(brief.skill),
        sceneAssetId: safeString(brief.sceneAssetId, safeString(sceneAsset?.id)),
      })

      try {
        const draft = await fetchAiSceneDraft(brief, sceneAsset, defaults)
        aiMissionLog('response', {
          requestId,
          source: draft.source,
          title: draft.runtimeScene?.title,
          answers: draft.runtimeScene?.answers?.length || 0,
        })
        sendJson(res, 200, {
          ok: true,
          requestId,
          draft,
        })
      } catch (error) {
        aiMissionLog('fallback-after-error', {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        })
        sendJson(res, 200, {
          ok: true,
          requestId,
          draft: buildLocalSceneDraft(brief, sceneAsset, defaults),
        })
      }
      return
    }

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
      const requestedVoiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : ''
      const voiceRole = typeof body.voiceRole === 'string' && isRuntimeVoiceRole(body.voiceRole.trim())
        ? body.voiceRole.trim()
        : ''
      const voiceId = resolveRuntimeVoiceId(requestedVoiceId, voiceRole)
      const voiceSource = resolveRuntimeVoiceSource(requestedVoiceId, voiceRole)
      const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : defaultModelId
      const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

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

      runtimeSpeechLog('request', {
        requestId,
        voiceRole: voiceRole || 'default',
        voiceSource,
        requestedVoiceId: maskVoiceId(requestedVoiceId),
        resolvedVoiceId: maskVoiceId(voiceId),
        modelId,
        textPreview: text.slice(0, 80),
      })

      const payload = await synthesizeRuntimeSpeech(text, voiceId, modelId)
      runtimeSpeechLog('response', {
        requestId,
        voiceRole: voiceRole || 'default',
        voiceSource,
        finalVoiceId: maskVoiceId(payload.voiceId),
        cacheHit: Boolean(payload.cacheHit),
        fallbackUsed: Boolean(payload.fallbackUsed),
      })
      sendJson(res, 200, {
        ...payload,
        requestId,
        voiceRole: voiceRole || 'default',
        voiceSource,
        requestedVoiceId,
        resolvedVoiceId: payload.resolvedVoiceId || voiceId,
      })
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
  runtimeSpeechLog('voice-config', {
    defaultVoiceId: maskVoiceId(defaultVoiceId),
    narrationVoiceId: maskVoiceId(runtimeVoiceRoleConfig.narration),
    npcVoiceId: maskVoiceId(runtimeVoiceRoleConfig.npc),
    sparkVoiceId: maskVoiceId(runtimeVoiceRoleConfig.spark),
    learnerGuideVoiceId: maskVoiceId(runtimeVoiceRoleConfig['learner-guide']),
    modelId: defaultModelId,
    ttsConfigured: Boolean(elevenLabsApiKey),
  })
})
