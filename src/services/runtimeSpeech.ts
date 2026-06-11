type SynthesizeRuntimeSpeechRequest = {
  text: string
  voiceId?: string
  modelId?: string
}

type SynthesizeRuntimeSpeechResponse = {
  ok: true
  audioBase64: string
  contentType: string
  voiceId: string
  modelId: string
  cacheKey: string
}

const speechUrlCache = new Map<string, string>()
const runtimeSpeechBaseUrl = (import.meta.env.VITE_RUNTIME_SPEECH_BASE_URL || '').trim()

const buildCacheKey = (text: string, voiceId?: string, modelId?: string) =>
  `${voiceId || 'default'}::${modelId || 'default'}::${text.trim().toLowerCase()}`

const buildRuntimeSpeechEndpoint = () => {
  if (runtimeSpeechBaseUrl) {
    return `${runtimeSpeechBaseUrl.replace(/\/+$/, '')}/api/runtime-speech`
  }

  return '/api/runtime-speech'
}

export const getRuntimeSpeechAudioUrl = async (
  text: string,
  options?: {
    voiceId?: string
    modelId?: string
  },
) => {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const cacheKey = buildCacheKey(trimmed, options?.voiceId, options?.modelId)
  const cachedUrl = speechUrlCache.get(cacheKey)
  if (cachedUrl) return cachedUrl

  try {
    const response = await fetch(buildRuntimeSpeechEndpoint(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text: trimmed,
        voiceId: options?.voiceId,
        modelId: options?.modelId,
      } satisfies SynthesizeRuntimeSpeechRequest),
    })

    if (!response.ok) return ''

    const result = await response.json() as SynthesizeRuntimeSpeechResponse
    const audioUrl = `data:${result.contentType};base64,${result.audioBase64}`
    speechUrlCache.set(cacheKey, audioUrl)
    return audioUrl
  } catch {
    return ''
  }
}
