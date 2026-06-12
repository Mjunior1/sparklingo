type SynthesizeRuntimeSpeechRequest = {
  text: string
  voiceId?: string
  voiceRole?: RuntimeSpeechVoiceRole
  modelId?: string
}

type SynthesizeRuntimeSpeechResponse = {
  ok: true
  audioBase64: string
  contentType: string
  voiceId: string
  modelId: string
  cacheKey: string
  requestId?: string
  voiceRole?: RuntimeSpeechVoiceRole | 'default'
  voiceSource?: string
  requestedVoiceId?: string
  resolvedVoiceId?: string
  fallbackUsed?: boolean
  cacheHit?: boolean
}

export type RuntimeSpeechVoiceRole = 'narration' | 'npc' | 'spark' | 'learner-guide'

const speechUrlCache = new Map<string, string>()
const speechRequestCache = new Map<string, Promise<string>>()
const runtimeSpeechBaseUrl = (import.meta.env.VITE_RUNTIME_SPEECH_BASE_URL || '').trim()

const buildCacheKey = (text: string, voiceId?: string, voiceRole?: RuntimeSpeechVoiceRole, modelId?: string) =>
  `${voiceId || `role:${voiceRole || 'default'}`}::${modelId || 'default'}::${text.trim().toLowerCase()}`

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
    voiceRole?: RuntimeSpeechVoiceRole
    modelId?: string
  },
) => {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const cacheKey = buildCacheKey(trimmed, options?.voiceId, options?.voiceRole, options?.modelId)
  const cachedUrl = speechUrlCache.get(cacheKey)
  if (cachedUrl) {
    console.log('[runtime-speech] frontend cache hit', {
      cacheKey,
      voiceId: options?.voiceId || 'none',
      voiceRole: options?.voiceRole || 'default',
      modelId: options?.modelId || 'default',
    })
    return cachedUrl
  }

  const inFlightRequest = speechRequestCache.get(cacheKey)
  if (inFlightRequest) {
    console.log('[runtime-speech] frontend request reuse', {
      cacheKey,
      voiceId: options?.voiceId || 'none',
      voiceRole: options?.voiceRole || 'default',
      modelId: options?.modelId || 'default',
    })
    return inFlightRequest
  }

  const request = (async () => {
    try {
      console.log('[runtime-speech] frontend request', {
        cacheKey,
        voiceId: options?.voiceId || 'none',
        voiceRole: options?.voiceRole || 'default',
        modelId: options?.modelId || 'default',
        textPreview: trimmed.slice(0, 80),
      })
      const response = await fetch(buildRuntimeSpeechEndpoint(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmed,
          voiceId: options?.voiceId,
          voiceRole: options?.voiceRole,
          modelId: options?.modelId,
        } satisfies SynthesizeRuntimeSpeechRequest),
      })

      if (!response.ok) {
        const responseBody = await response.text().catch(() => '')
        console.log('[runtime-speech] frontend request failed', {
          cacheKey,
          status: response.status,
          voiceRole: options?.voiceRole || 'default',
          body: responseBody.slice(0, 240),
        })
        return ''
      }

      const result = await response.json() as SynthesizeRuntimeSpeechResponse
      console.log('[runtime-speech] frontend resolved voice', {
        requestId: result.requestId || 'n/a',
        requestedVoiceRole: options?.voiceRole || 'default',
        serverVoiceRole: result.voiceRole || 'default',
        voiceSource: result.voiceSource || 'default',
        requestedVoiceId: result.requestedVoiceId || 'none',
        resolvedVoiceId: result.resolvedVoiceId || result.voiceId,
        voiceId: result.voiceId,
        modelId: result.modelId,
        cacheKey: result.cacheKey,
        fallbackUsed: Boolean(result.fallbackUsed),
        cacheHit: Boolean(result.cacheHit),
      })
      const audioUrl = `data:${result.contentType};base64,${result.audioBase64}`
      speechUrlCache.set(cacheKey, audioUrl)
      return audioUrl
    } catch {
      console.log('[runtime-speech] frontend exception', {
        cacheKey,
        voiceRole: options?.voiceRole || 'default',
      })
      return ''
    } finally {
      speechRequestCache.delete(cacheKey)
    }
  })()

  speechRequestCache.set(cacheKey, request)
  return request
}

export const prefetchRuntimeSpeechAudio = async (
  text: string,
  options?: {
    voiceId?: string
    voiceRole?: RuntimeSpeechVoiceRole
    modelId?: string
  },
) => {
  void (await getRuntimeSpeechAudioUrl(text, options))
}
