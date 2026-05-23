import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type AIProvider = 'openrouter' | 'openai' | 'anthropic'
export type AIModel =
  | 'deepseek-chat'
  | 'llama-3.3-70b'
  | 'claude-sonnet'
  | 'gpt-4.1-mini'
  | 'gemini-flash'
export type PedagogicalMode =
  | 'Beginner Safe'
  | 'Travel Immersion'
  | 'Speaking Heavy'
  | 'Vocabulary Focus'
  | 'Listening Booster'
  | 'Fast Daily Lesson'
export type DifficultyCeiling = 'beginner' | 'intermediate' | 'advanced'
export type NaturalnessMode = 'guided' | 'balanced' | 'native'

export type AIControlConfig = {
  provider: AIProvider
  apiKeyMasked: string
  apiKeyReference: string
  primaryModel: AIModel
  fallbackModel: AIModel
  temperature: number
  pedagogicalMode: PedagogicalMode
  limits: {
    maxQuizzes: number
    maxQuestions: number
    dailyDrafts: number
    tokenBudget: number
    monthlyCostUsd: number
  }
  guardrails: {
    difficultyCeiling: DifficultyCeiling
    maxSentenceWords: number
    maxVocabularyWindow: number
    repetitionLimit: number
    naturalness: NaturalnessMode
    speakingFrequency: number
    listeningFrequency: number
  }
}

export type MemoryEngineConfig = {
  trackLearnedWords: boolean
  trackFrequentErrors: boolean
  trackWeakSkills: boolean
  trackFavoriteModes: boolean
  historyDepthDays: number
  notes: string
}

export type ProviderConnectionResult = {
  ok: boolean
  message: string
  provider: AIProvider
}

export const providerModels: Record<AIProvider, AIModel[]> = {
  openrouter: ['deepseek-chat', 'llama-3.3-70b', 'claude-sonnet', 'gpt-4.1-mini', 'gemini-flash'],
  openai: ['gpt-4.1-mini'],
  anthropic: ['claude-sonnet'],
}

export const defaultAIControlConfig: AIControlConfig = {
  provider: 'openrouter',
  apiKeyMasked: '',
  apiKeyReference: 'OPENROUTER_API_KEY',
  primaryModel: 'deepseek-chat',
  fallbackModel: 'claude-sonnet',
  temperature: 0.45,
  pedagogicalMode: 'Beginner Safe',
  limits: {
    maxQuizzes: 4,
    maxQuestions: 16,
    dailyDrafts: 12,
    tokenBudget: 120000,
    monthlyCostUsd: 0,
  },
  guardrails: {
    difficultyCeiling: 'intermediate',
    maxSentenceWords: 12,
    maxVocabularyWindow: 18,
    repetitionLimit: 3,
    naturalness: 'balanced',
    speakingFrequency: 2,
    listeningFrequency: 2,
  },
}

export const defaultMemoryEngineConfig: MemoryEngineConfig = {
  trackLearnedWords: true,
  trackFrequentErrors: true,
  trackWeakSkills: true,
  trackFavoriteModes: true,
  historyDepthDays: 30,
  notes: 'Preparado para rastrear palavras ensinadas, erros frequentes e habilidades fracas sem pesar o produto.',
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const cleanString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)
const cleanBoolean = (value: unknown, fallback = false) => (typeof value === 'boolean' ? value : fallback)
const cleanNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const sanitizeAIControlConfig = (input: Partial<AIControlConfig>): AIControlConfig => ({
  provider: input.provider && providerModels[input.provider] ? input.provider : defaultAIControlConfig.provider,
  apiKeyMasked: cleanString(input.apiKeyMasked),
  apiKeyReference: cleanString(input.apiKeyReference, defaultAIControlConfig.apiKeyReference),
  primaryModel:
    input.primaryModel && Object.values(providerModels).flat().includes(input.primaryModel)
      ? input.primaryModel
      : defaultAIControlConfig.primaryModel,
  fallbackModel:
    input.fallbackModel && Object.values(providerModels).flat().includes(input.fallbackModel)
      ? input.fallbackModel
      : defaultAIControlConfig.fallbackModel,
  temperature: clamp(cleanNumber(input.temperature, defaultAIControlConfig.temperature), 0, 1),
  pedagogicalMode:
    input.pedagogicalMode ?? defaultAIControlConfig.pedagogicalMode,
  limits: {
    maxQuizzes: clamp(cleanNumber(input.limits?.maxQuizzes, defaultAIControlConfig.limits.maxQuizzes), 1, 8),
    maxQuestions: clamp(cleanNumber(input.limits?.maxQuestions, defaultAIControlConfig.limits.maxQuestions), 4, 40),
    dailyDrafts: clamp(cleanNumber(input.limits?.dailyDrafts, defaultAIControlConfig.limits.dailyDrafts), 1, 100),
    tokenBudget: clamp(cleanNumber(input.limits?.tokenBudget, defaultAIControlConfig.limits.tokenBudget), 1000, 1000000),
    monthlyCostUsd: clamp(cleanNumber(input.limits?.monthlyCostUsd, defaultAIControlConfig.limits.monthlyCostUsd), 0, 10000),
  },
  guardrails: {
    difficultyCeiling: input.guardrails?.difficultyCeiling ?? defaultAIControlConfig.guardrails.difficultyCeiling,
    maxSentenceWords: clamp(cleanNumber(input.guardrails?.maxSentenceWords, defaultAIControlConfig.guardrails.maxSentenceWords), 4, 30),
    maxVocabularyWindow: clamp(cleanNumber(input.guardrails?.maxVocabularyWindow, defaultAIControlConfig.guardrails.maxVocabularyWindow), 4, 80),
    repetitionLimit: clamp(cleanNumber(input.guardrails?.repetitionLimit, defaultAIControlConfig.guardrails.repetitionLimit), 1, 10),
    naturalness: input.guardrails?.naturalness ?? defaultAIControlConfig.guardrails.naturalness,
    speakingFrequency: clamp(cleanNumber(input.guardrails?.speakingFrequency, defaultAIControlConfig.guardrails.speakingFrequency), 0, 6),
    listeningFrequency: clamp(cleanNumber(input.guardrails?.listeningFrequency, defaultAIControlConfig.guardrails.listeningFrequency), 0, 6),
  },
})

const sanitizeMemoryEngineConfig = (input: Partial<MemoryEngineConfig>): MemoryEngineConfig => ({
  trackLearnedWords: cleanBoolean(input.trackLearnedWords, defaultMemoryEngineConfig.trackLearnedWords),
  trackFrequentErrors: cleanBoolean(input.trackFrequentErrors, defaultMemoryEngineConfig.trackFrequentErrors),
  trackWeakSkills: cleanBoolean(input.trackWeakSkills, defaultMemoryEngineConfig.trackWeakSkills),
  trackFavoriteModes: cleanBoolean(input.trackFavoriteModes, defaultMemoryEngineConfig.trackFavoriteModes),
  historyDepthDays: clamp(cleanNumber(input.historyDepthDays, defaultMemoryEngineConfig.historyDepthDays), 7, 180),
  notes: cleanString(input.notes, defaultMemoryEngineConfig.notes),
})

const aiControlDoc = () => {
  const { db } = requireFirebase()
  return doc(db, 'platform', 'aiControl')
}

const memoryDoc = () => {
  const { db } = requireFirebase()
  return doc(db, 'platform', 'memoryEngine')
}

export const getAIControlConfig = async () => {
  try {
    const snapshot = await getDoc(aiControlDoc())
    if (!snapshot.exists()) return defaultAIControlConfig
    return sanitizeAIControlConfig(snapshot.data() as Partial<AIControlConfig>)
  } catch {
    return defaultAIControlConfig
  }
}

export const saveAIControlConfig = async (config: AIControlConfig) => {
  const safeConfig = sanitizeAIControlConfig(config)
  await setDoc(aiControlDoc(), {
    ...safeConfig,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export const getMemoryEngineConfig = async () => {
  try {
    const snapshot = await getDoc(memoryDoc())
    if (!snapshot.exists()) return defaultMemoryEngineConfig
    return sanitizeMemoryEngineConfig(snapshot.data() as Partial<MemoryEngineConfig>)
  } catch {
    return defaultMemoryEngineConfig
  }
}

export const saveMemoryEngineConfig = async (config: MemoryEngineConfig) => {
  const safeConfig = sanitizeMemoryEngineConfig(config)
  await setDoc(memoryDoc(), {
    ...safeConfig,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export const maskApiKey = (value: string) => {
  if (!value.trim()) return ''
  const trimmed = value.trim()
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

export const testProviderConnection = async (
  provider: AIProvider,
  apiKey: string,
): Promise<ProviderConnectionResult> => {
  const trimmed = apiKey.trim()
  if (!trimmed) {
    return { ok: false, message: 'Informe uma chave antes de testar a conexão.', provider }
  }

  try {
    if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${trimmed}` },
      })
      return {
        ok: response.ok,
        message: response.ok ? 'OpenRouter respondeu corretamente.' : `OpenRouter retornou ${response.status}.`,
        provider,
      }
    }

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${trimmed}` },
      })
      return {
        ok: response.ok,
        message: response.ok ? 'OpenAI respondeu corretamente.' : `OpenAI retornou ${response.status}.`,
        provider,
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': trimmed,
        'anthropic-version': '2023-06-01',
      },
    })
    return {
      ok: response.ok,
      message: response.ok ? 'Anthropic respondeu corretamente.' : `Anthropic retornou ${response.status}.`,
      provider,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Falha ao testar a conexão do provider.',
      provider,
    }
  }
}
