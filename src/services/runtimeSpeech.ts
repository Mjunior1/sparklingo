import { httpsCallable } from 'firebase/functions'
import { requireFirebase } from '../lib/firebase'

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

const runtimeSpeechCall = () => {
  const { functions } = requireFirebase()
  return httpsCallable<SynthesizeRuntimeSpeechRequest, SynthesizeRuntimeSpeechResponse>(functions, 'synthesizeRuntimeSpeech')
}

const buildCacheKey = (text: string, voiceId?: string, modelId?: string) =>
  `${voiceId || 'default'}::${modelId || 'default'}::${text.trim().toLowerCase()}`

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
    const callable = runtimeSpeechCall()
    const result = await callable({
      text: trimmed,
      voiceId: options?.voiceId,
      modelId: options?.modelId,
    })

    const audioUrl = `data:${result.data.contentType};base64,${result.data.audioBase64}`
    speechUrlCache.set(cacheKey, audioUrl)
    return audioUrl
  } catch {
    return ''
  }
}
