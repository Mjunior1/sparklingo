import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

initializeApp()

const db = getFirestore()

type AIProvider = 'openrouter' | 'openai' | 'anthropic'
type AIModel =
  | 'deepseek-chat'
  | 'llama-3.3-70b'
  | 'claude-sonnet'
  | 'gpt-4.1-mini'
  | 'gemini-flash'
type PedagogicalMode =
  | 'Beginner Safe'
  | 'Travel Immersion'
  | 'Speaking Heavy'
  | 'Vocabulary Focus'
  | 'Listening Booster'
  | 'Fast Daily Lesson'
type MissionLevel = 'Beginner' | 'Intermediate' | 'Advanced'
type StudentGoal = 'Travel' | 'Business' | 'Immigration' | 'Social' | 'Confidence' | 'Gaming' | 'Movies'
type VisualStyle = 'Cartoon 3D' | 'Modern Flat' | 'Minimal' | 'Realistic' | 'Kids Friendly'
type DraftQuestionType = 'multiple-choice' | 'speaking' | 'drag-fill' | 'matching' | 'fill-blank' | 'listening'
type DifficultyCeiling = 'beginner' | 'intermediate' | 'advanced'
type NaturalnessMode = 'guided' | 'balanced' | 'native'

type AIControlConfig = {
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

type MemoryEngineConfig = {
  trackLearnedWords: boolean
  trackFrequentErrors: boolean
  trackWeakSkills: boolean
  trackFavoriteModes: boolean
  trackSpeakingConfidence: boolean
  trackListeningAvoidance: boolean
  trackResponseLatency: boolean
  trackConfidenceSignals: boolean
  historyDepthDays: number
  continuityMode: 'linked' | 'episodic'
  notes: string
}

type QuestionMix = Record<DraftQuestionType, number>

type LessonComposerInput = {
  template: string
  theme: string
  emotionalContext: string
  practicalGoal: string
  level: MissionLevel
  quizCount: number
  questionsPerQuiz: number
  visualStyle: VisualStyle
  studentGoal: StudentGoal
  pedagogicalMode: PedagogicalMode
  questionMix: QuestionMix
}

type ProviderConnectionResult = {
  ok: boolean
  message: string
  provider: AIProvider
  maskedKey?: string
  usingStoredSecret?: boolean
  latencyMs?: number
}

type SaveAiProviderSecretRequest = {
  provider: AIProvider
  apiKey: string
  apiKeyReference: string
}

type TestAiProviderConnectionRequest = {
  provider: AIProvider
  apiKeyReference: string
  apiKey?: string
}

type GeneratedQuestionDraft = {
  type: DraftQuestionType
  tag: string
  title: string
  prompt: string
  explanation: string
  options: string[]
  correct: string
  sentenceBefore: string
  sentenceAfter: string
  scrambled: string[]
  solution: string[]
  reward: number
  kicker: string
  difficulty: 'Fácil' | 'Médio'
}

type GeneratedQuizDraft = {
  title: string
  objective: string
  storyBeat: string
  reward: number
  difficulty: 'Fácil' | 'Médio'
  kind: 'multiple-choice' | 'drag-fill' | 'ordering' | 'listening' | 'speaking'
  order: number
  questions: GeneratedQuestionDraft[]
}

type GeneratedMissionDraft = {
  title: string
  theme: string
  emotionalContext: string
  practicalGoal: string
  template: string
  level: MissionLevel
  studentGoal: StudentGoal
  pedagogicalMode: PedagogicalMode
  visualStyle: VisualStyle
  tensionLabel: string
  urgencyNote: string
  emotionalGoal: string
  confidenceTarget: string
  perceivedProgress: {
    confidence: string
    fluency: string
    hesitation: string
    mastery: string
  }
  continuity: {
    previousScene: string
    currentScene: string
    nextScene: string
    arc: string[]
  }
  adaptationNotes: {
    speakingSupport: string
    listeningSupport: string
    repetitionStrategy: string
    reviewPressure: string
  }
  questionMix: QuestionMix
  quizzes: GeneratedQuizDraft[]
  coverPrompt: string
  promptsUsed: string[]
  estimatedTokens: number
  estimatedCostUsd: number
  provider: AIProvider
  model: AIModel
  generationMode: 'provider' | 'fallback-template'
  generationNotes: string
}

type GenerateMissionDraftRequest = {
  composer: LessonComposerInput
  aiControl: AIControlConfig
  memoryConfig: MemoryEngineConfig
}

const providerDefaults: Record<AIProvider, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

const questionTypeOrder: DraftQuestionType[] = ['multiple-choice', 'speaking', 'drag-fill', 'matching', 'fill-blank', 'listening']

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const safeString = (value: unknown, fallback = '') => (typeof value === 'string' ? value.trim() : fallback)

const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const safeBoolean = (value: unknown, fallback = false) => (typeof value === 'boolean' ? value : fallback)

const sanitizeQuestionMix = (input: Partial<QuestionMix> | undefined): QuestionMix => ({
  'multiple-choice': Math.max(0, safeNumber(input?.['multiple-choice'], 3)),
  speaking: Math.max(0, safeNumber(input?.speaking, 1)),
  'drag-fill': Math.max(0, safeNumber(input?.['drag-fill'], 1)),
  matching: Math.max(0, safeNumber(input?.matching, 1)),
  'fill-blank': Math.max(0, safeNumber(input?.['fill-blank'], 1)),
  listening: Math.max(0, safeNumber(input?.listening, 1)),
})

const sanitizeComposer = (input: Partial<LessonComposerInput>): LessonComposerInput => ({
  template: safeString(input.template, 'Airport Survival'),
  theme: safeString(input.theme, 'At the Airport'),
  emotionalContext: safeString(input.emotionalContext, 'You missed your flight in London.'),
  practicalGoal: safeString(input.practicalGoal, 'Aluno consegue pedir ajuda e entender o próximo passo.'),
  level: (input.level === 'Intermediate' || input.level === 'Advanced') ? input.level : 'Beginner',
  quizCount: clamp(safeNumber(input.quizCount, 3), 1, 6),
  questionsPerQuiz: clamp(safeNumber(input.questionsPerQuiz, 2), 1, 6),
  visualStyle: input.visualStyle ?? 'Cartoon 3D',
  studentGoal: input.studentGoal ?? 'Travel',
  pedagogicalMode: input.pedagogicalMode ?? 'Travel Immersion',
  questionMix: sanitizeQuestionMix(input.questionMix),
})

const sanitizeAIControl = (input: Partial<AIControlConfig>): AIControlConfig => ({
  provider: input.provider ?? 'openrouter',
  apiKeyMasked: safeString(input.apiKeyMasked),
  apiKeyReference: safeString(input.apiKeyReference, providerDefaults[input.provider ?? 'openrouter']),
  primaryModel: input.primaryModel ?? 'deepseek-chat',
  fallbackModel: input.fallbackModel ?? 'claude-sonnet',
  temperature: clamp(safeNumber(input.temperature, 0.45), 0, 1),
  pedagogicalMode: input.pedagogicalMode ?? 'Travel Immersion',
  limits: {
    maxQuizzes: clamp(safeNumber(input.limits?.maxQuizzes, 4), 1, 8),
    maxQuestions: clamp(safeNumber(input.limits?.maxQuestions, 16), 4, 40),
    dailyDrafts: clamp(safeNumber(input.limits?.dailyDrafts, 12), 1, 100),
    tokenBudget: clamp(safeNumber(input.limits?.tokenBudget, 120000), 1000, 1000000),
    monthlyCostUsd: clamp(safeNumber(input.limits?.monthlyCostUsd, 0), 0, 10000),
  },
  guardrails: {
    difficultyCeiling: input.guardrails?.difficultyCeiling ?? 'intermediate',
    maxSentenceWords: clamp(safeNumber(input.guardrails?.maxSentenceWords, 12), 4, 30),
    maxVocabularyWindow: clamp(safeNumber(input.guardrails?.maxVocabularyWindow, 18), 4, 80),
    repetitionLimit: clamp(safeNumber(input.guardrails?.repetitionLimit, 3), 1, 10),
    naturalness: input.guardrails?.naturalness ?? 'balanced',
    speakingFrequency: clamp(safeNumber(input.guardrails?.speakingFrequency, 2), 0, 6),
    listeningFrequency: clamp(safeNumber(input.guardrails?.listeningFrequency, 2), 0, 6),
  },
})

const sanitizeMemoryConfig = (input: Partial<MemoryEngineConfig>): MemoryEngineConfig => ({
  trackLearnedWords: safeBoolean(input.trackLearnedWords, true),
  trackFrequentErrors: safeBoolean(input.trackFrequentErrors, true),
  trackWeakSkills: safeBoolean(input.trackWeakSkills, true),
  trackFavoriteModes: safeBoolean(input.trackFavoriteModes, true),
  trackSpeakingConfidence: safeBoolean(input.trackSpeakingConfidence, true),
  trackListeningAvoidance: safeBoolean(input.trackListeningAvoidance, true),
  trackResponseLatency: safeBoolean(input.trackResponseLatency, true),
  trackConfidenceSignals: safeBoolean(input.trackConfidenceSignals, true),
  historyDepthDays: clamp(safeNumber(input.historyDepthDays, 30), 7, 180),
  continuityMode: input.continuityMode === 'episodic' ? 'episodic' : 'linked',
  notes: safeString(input.notes),
})

const maskKey = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

const ensureAdmin = async (uid: string | undefined) => {
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login para acessar o controle de IA.')
  const snapshot = await db.collection('users').doc(uid).get()
  if (!snapshot.exists || snapshot.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Somente admins podem operar a engine Spark AI.')
  }
  return uid
}

const getStoredSecret = async (provider: AIProvider, apiKeyReference?: string) => {
  const stored = await db.collection('platformSecure').doc('aiProvider').get()
  const data = stored.data() as { provider?: AIProvider; apiKey?: string; apiKeyReference?: string } | undefined
  if (data?.provider === provider && data.apiKey) {
    return {
      key: data.apiKey,
      reference: data.apiKeyReference ?? providerDefaults[provider],
      usingStoredSecret: true,
    }
  }

  const reference = apiKeyReference || providerDefaults[provider]
  const envValue = process.env[reference] || process.env[providerDefaults[provider]]
  if (envValue) {
    return {
      key: envValue,
      reference,
      usingStoredSecret: false,
    }
  }

  return null
}

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = 12000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const parseProviderMessage = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const json = await response.json() as { error?: { message?: string }; message?: string }
    return json.error?.message ?? json.message ?? `HTTP ${response.status}`
  }
  return response.text()
}

const extractText = (payload: unknown, provider: AIProvider) => {
  if (provider === 'anthropic') {
    const data = payload as { content?: Array<{ type?: string; text?: string }> }
    return data.content?.find((item) => item.type === 'text')?.text ?? ''
  }

  const data = payload as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
}

const extractTokenUsage = (payload: unknown, provider: AIProvider) => {
  if (provider === 'anthropic') {
    const data = payload as { usage?: { input_tokens?: number; output_tokens?: number } }
    return (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)
  }

  const data = payload as { usage?: { total_tokens?: number } }
  return data.usage?.total_tokens ?? 0
}

const estimateCost = (provider: AIProvider, model: AIModel, tokens: number) => {
  const rateByProvider: Record<AIProvider, number> = {
    openrouter: 0.55,
    openai: 1.2,
    anthropic: 1.8,
  }
  const modelFactor =
    model === 'deepseek-chat' ? 0.7
      : model === 'gpt-4.1-mini' ? 1
      : model === 'claude-sonnet' ? 1.35
      : 0.9

  return Number(((tokens / 1_000_000) * rateByProvider[provider] * modelFactor).toFixed(4))
}

const buildSystemPrompt = (config: AIControlConfig, memory: MemoryEngineConfig) => `
You are Spark AI, an emotional learning experience composer for SparkLingo.
Generate experiences, not isolated quizzes.

Pedagogical mode: ${config.pedagogicalMode}
Difficulty ceiling: ${config.guardrails.difficultyCeiling}
Sentence words max: ${config.guardrails.maxSentenceWords}
Vocabulary window max: ${config.guardrails.maxVocabularyWindow}
Repetition limit: ${config.guardrails.repetitionLimit}
Naturalness: ${config.guardrails.naturalness}
Speaking frequency: ${config.guardrails.speakingFrequency}
Listening frequency: ${config.guardrails.listeningFrequency}

Memory engine:
- track learned words: ${memory.trackLearnedWords}
- track recurring errors: ${memory.trackFrequentErrors}
- track weak skills: ${memory.trackWeakSkills}
- track favorite modes: ${memory.trackFavoriteModes}
- track speaking confidence: ${memory.trackSpeakingConfidence}
- track listening avoidance: ${memory.trackListeningAvoidance}
- track response latency: ${memory.trackResponseLatency}
- continuity mode: ${memory.continuityMode}

Always return valid JSON only.
`.trim()

const buildUserPrompt = (composer: LessonComposerInput) => `
Create one SparkLingo mission experience draft with the following:
- Theme: ${composer.theme}
- Emotional context: ${composer.emotionalContext}
- Practical goal: ${composer.practicalGoal}
- Level: ${composer.level}
- Student goal: ${composer.studentGoal}
- Visual style: ${composer.visualStyle}
- Quizzes: ${composer.quizCount}
- Questions per quiz: ${composer.questionsPerQuiz}
- Question mix: ${JSON.stringify(composer.questionMix)}

Requirements:
- missions must feel like real-life tension and urgency
- learner should feel growing confidence
- connect current mission to a broader journey
- use clear narrative progression
- output should support game-like micro challenges
- beginner = short sentences and low cognitive load
- intermediate = context and interpretation
- advanced = nuance and inference

Return JSON with this exact shape:
{
  "title": string,
  "theme": string,
  "emotionalContext": string,
  "practicalGoal": string,
  "tensionLabel": string,
  "urgencyNote": string,
  "emotionalGoal": string,
  "confidenceTarget": string,
  "perceivedProgress": {
    "confidence": string,
    "fluency": string,
    "hesitation": string,
    "mastery": string
  },
  "continuity": {
    "previousScene": string,
    "currentScene": string,
    "nextScene": string,
    "arc": [string]
  },
  "adaptationNotes": {
    "speakingSupport": string,
    "listeningSupport": string,
    "repetitionStrategy": string,
    "reviewPressure": string
  },
  "coverPrompt": string,
  "quizzes": [
    {
      "title": string,
      "objective": string,
      "storyBeat": string,
      "reward": number,
      "difficulty": "Fácil" | "Médio",
      "kind": "multiple-choice" | "drag-fill" | "ordering" | "listening" | "speaking",
      "questions": [
        {
          "type": "multiple-choice" | "speaking" | "drag-fill" | "matching" | "fill-blank" | "listening",
          "tag": string,
          "title": string,
          "prompt": string,
          "explanation": string,
          "options": [string],
          "correct": string,
          "sentenceBefore": string,
          "sentenceAfter": string,
          "scrambled": [string],
          "solution": [string],
          "reward": number,
          "kicker": string,
          "difficulty": "Fácil" | "Médio"
        }
      ]
    }
  ]
}
`.trim()

const extractJsonBlock = (text: string) => {
  const cleaned = text.trim()
  const codeFenceMatch = cleaned.match(/```json\s*([\s\S]*?)```/i) || cleaned.match(/```\s*([\s\S]*?)```/i)
  if (codeFenceMatch?.[1]) return codeFenceMatch[1].trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) return cleaned.slice(firstBrace, lastBrace + 1)
  return cleaned
}

const mapCategory = (goal: StudentGoal) => {
  if (goal === 'Travel' || goal === 'Immigration') return 'Vocabulário'
  if (goal === 'Movies') return 'Listening'
  if (goal === 'Confidence' || goal === 'Social') return 'Speaking'
  return 'Gramática'
}

const mapQuestionTypeToKind = (type: DraftQuestionType): GeneratedQuizDraft['kind'] => {
  if (type === 'drag-fill' || type === 'fill-blank') return 'drag-fill'
  if (type === 'speaking') return 'speaking'
  if (type === 'listening') return 'listening'
  if (type === 'matching') return 'multiple-choice'
  return 'multiple-choice'
}

const buildQuestionTypeSequence = (questionMix: QuestionMix) => {
  const sequence: DraftQuestionType[] = []
  questionTypeOrder.forEach((type) => {
    for (let index = 0; index < Math.max(0, questionMix[type] ?? 0); index += 1) sequence.push(type)
  })
  return sequence.length ? sequence : (['multiple-choice', 'drag-fill', 'speaking'] as DraftQuestionType[])
}

const buildFallbackMissionDraft = (
  composerInput: LessonComposerInput,
  aiControlInput: AIControlConfig,
  memoryInput: MemoryEngineConfig,
  generationNotes: string,
): GeneratedMissionDraft => {
  const composer = sanitizeComposer(composerInput)
  const aiControl = sanitizeAIControl(aiControlInput)
  const memory = sanitizeMemoryConfig(memoryInput)
  const category = mapCategory(composer.studentGoal)
  const typeSequence = buildQuestionTypeSequence(composer.questionMix)
  const arcByGoal: Record<StudentGoal, string[]> = {
    Travel: ['Arriving in London', 'Airport survival', 'Hotel check-in', 'Restaurant interaction'],
    Business: ['Meeting intro', 'Small talk', 'Presenting updates', 'Client follow-up'],
    Immigration: ['Border questions', 'Lost document support', 'Local transport', 'Rental setup'],
    Social: ['Introducing yourself', 'Making plans', 'Keeping conversation going', 'Handling awkward moments'],
    Confidence: ['Safe warm-up', 'Speaking in public', 'Recovering after mistakes', 'Flow state'],
    Gaming: ['Party chat', 'Quick strategy call', 'Explaining a move', 'Friendly banter'],
    Movies: ['Catching dialogue', 'Interpreting emotion', 'Retelling a scene', 'Discussing preferences'],
  }
  const missionArc = arcByGoal[composer.studentGoal]
  const questions: GeneratedQuestionDraft[] = []
  const quizzes: GeneratedQuizDraft[] = []
  let pointer = 0

  for (let quizIndex = 0; quizIndex < composer.quizCount; quizIndex += 1) {
    const quizQuestions: GeneratedQuestionDraft[] = []
    for (let localIndex = 0; localIndex < composer.questionsPerQuiz; localIndex += 1) {
      const type = typeSequence[pointer % typeSequence.length] ?? 'multiple-choice'
      const isBeginner = composer.level === 'Beginner'
      const title =
        type === 'speaking' ? `Say it in the moment ${localIndex + 1}`
          : type === 'listening' ? `Catch the clue ${localIndex + 1}`
          : type === 'drag-fill' || type === 'fill-blank' ? `Complete the line ${localIndex + 1}`
          : `Choose the next move ${localIndex + 1}`

      const prompt =
        type === 'speaking'
          ? `You are in ${composer.theme}. ${composer.emotionalContext} Respond out loud and ask for help naturally.`
          : type === 'listening'
            ? `Listen for the key detail while the scene unfolds: ${composer.emotionalContext}.`
            : type === 'drag-fill' || type === 'fill-blank'
              ? `Complete the missing part inside the situation: ${composer.emotionalContext}.`
              : `Pick the best response to keep the mission moving in ${composer.theme}.`

      const reward = 20 + localIndex * 5 + quizIndex * 3
      const baseOptions =
        composer.studentGoal === 'Travel'
          ? ['ask for help', 'walk away silently', 'ignore the sign', 'cancel the trip']
          : ['choose the best response', 'stay silent', 'change the topic', 'leave the scene']

      quizQuestions.push({
        type,
        tag: category,
        title,
        prompt,
        explanation: isBeginner
          ? 'Use a short, useful sentence and move the scene forward.'
          : 'Focus on a response that feels natural inside the situation.',
        options: type === 'speaking' ? [] : baseOptions,
        correct: type === 'speaking' ? '' : baseOptions[0],
        sentenceBefore: type === 'drag-fill' || type === 'fill-blank' ? 'I need' : '',
        sentenceAfter: type === 'drag-fill' || type === 'fill-blank' ? 'at the airport.' : '',
        scrambled: type === 'matching' ? [] : type === 'speaking' ? [] : type === 'listening' ? [] : ['I', 'need', 'help', 'now'],
        solution: type === 'matching' ? [] : type === 'speaking' ? [] : type === 'listening' ? [] : ['I', 'need', 'help', 'now'],
        reward,
        kicker: `Missão ${quizIndex + 1}.${localIndex + 1}`,
        difficulty: isBeginner ? 'Fácil' : 'Médio',
      })
      pointer += 1
    }

    quizzes.push({
      title: `${composer.theme} • etapa ${quizIndex + 1}`,
      objective: composer.practicalGoal,
      storyBeat: `${missionArc[Math.min(quizIndex, missionArc.length - 1)]} com foco em ${composer.studentGoal.toLowerCase()}.`,
      reward: 20 + quizIndex * 5,
      difficulty: composer.level === 'Beginner' ? 'Fácil' : 'Médio',
      kind: mapQuestionTypeToKind(quizQuestions[0]?.type ?? 'multiple-choice'),
      order: quizIndex + 1,
      questions: quizQuestions,
    })
    questions.push(...quizQuestions)
  }

  const estimatedTokens = Math.max(2000, composer.quizCount * composer.questionsPerQuiz * 260)
  const model = aiControl.primaryModel
  const provider = aiControl.provider

  return {
    title: `${composer.theme} mission`,
    theme: composer.theme,
    emotionalContext: composer.emotionalContext,
    practicalGoal: composer.practicalGoal,
    template: composer.template,
    level: composer.level,
    studentGoal: composer.studentGoal,
    pedagogicalMode: composer.pedagogicalMode,
    visualStyle: composer.visualStyle,
    tensionLabel: composer.emotionalContext || 'Need immediate help',
    urgencyNote: composer.emotionalContext || 'The learner must react before the scene gets worse.',
    emotionalGoal: composer.studentGoal === 'Confidence' ? 'Reduce hesitation and build speaking courage.' : 'Turn confusion into progress with one useful response at a time.',
    confidenceTarget: composer.level === 'Beginner' ? 'Learner finishes feeling able to speak in a short real-life scene.' : 'Learner feels more fluid and less afraid of real interaction.',
    perceivedProgress: {
      confidence: 'from unsure to capable',
      fluency: 'from fragmented to flowing',
      hesitation: memory.trackResponseLatency ? 'reduced through short urgent prompts' : 'kept low with guided moves',
      mastery: 'one more real-life scenario unlocked',
    },
    continuity: {
      previousScene: missionArc[0],
      currentScene: missionArc[1] ?? missionArc[0],
      nextScene: missionArc[2] ?? missionArc[missionArc.length - 1],
      arc: missionArc,
    },
    adaptationNotes: {
      speakingSupport: memory.trackSpeakingConfidence ? 'Give safer speaking turns first, then increase confidence pressure.' : 'Keep speaking optional.',
      listeningSupport: memory.trackListeningAvoidance ? 'Start with one clear clue before using denser audio.' : 'Use balanced listening load.',
      repetitionStrategy: `Limit repeats to ${aiControl.guardrails.repetitionLimit} and vary sentence shells.`,
      reviewPressure: composer.level === 'Beginner' ? 'Low pressure, fast recovery, immediate encouragement.' : 'Moderate pressure with real-world continuity.',
    },
    questionMix: composer.questionMix,
    quizzes,
    coverPrompt: `Create one ${composer.visualStyle} premium cover for SparkLingo mission "${composer.theme}" with the emotional context "${composer.emotionalContext}" and a soft lilac cinematic background.`,
    promptsUsed: questions.map((question) => question.prompt),
    estimatedTokens,
    estimatedCostUsd: estimateCost(provider, model, estimatedTokens),
    provider,
    model,
    generationMode: 'fallback-template',
    generationNotes,
  }
}

const normaliseGeneratedPayload = (
  payload: Partial<GeneratedMissionDraft>,
  composer: LessonComposerInput,
  aiControl: AIControlConfig,
  memory: MemoryEngineConfig,
  generationMode: GeneratedMissionDraft['generationMode'],
  generationNotes: string,
): GeneratedMissionDraft => {
  const fallback = buildFallbackMissionDraft(composer, aiControl, memory, generationNotes)
  const quizzes = Array.isArray(payload.quizzes) && payload.quizzes.length ? payload.quizzes : fallback.quizzes

  return {
    ...fallback,
    ...payload,
    quizzes: quizzes.map((quiz, index) => ({
      title: safeString(quiz.title, fallback.quizzes[index]?.title ?? `Quiz ${index + 1}`),
      objective: safeString(quiz.objective, fallback.practicalGoal),
      storyBeat: safeString(quiz.storyBeat, fallback.continuity.currentScene),
      reward: clamp(safeNumber(quiz.reward, fallback.quizzes[index]?.reward ?? 25), 10, 80),
      difficulty: quiz.difficulty === 'Fácil' ? 'Fácil' : 'Médio',
      kind: quiz.kind ?? fallback.quizzes[index]?.kind ?? 'multiple-choice',
      order: index + 1,
      questions: (Array.isArray(quiz.questions) && quiz.questions.length ? quiz.questions : fallback.quizzes[index]?.questions ?? []).map((question, questionIndex) => ({
        type: question.type ?? fallback.quizzes[index]?.questions?.[questionIndex]?.type ?? 'multiple-choice',
        tag: safeString(question.tag, fallback.quizzes[index]?.questions?.[questionIndex]?.tag ?? mapCategory(composer.studentGoal)),
        title: safeString(question.title, fallback.quizzes[index]?.questions?.[questionIndex]?.title ?? `Questão ${questionIndex + 1}`),
        prompt: safeString(question.prompt, fallback.quizzes[index]?.questions?.[questionIndex]?.prompt ?? composer.practicalGoal),
        explanation: safeString(question.explanation, fallback.quizzes[index]?.questions?.[questionIndex]?.explanation ?? ''),
        options: Array.isArray(question.options) ? question.options.filter((item) => typeof item === 'string') : fallback.quizzes[index]?.questions?.[questionIndex]?.options ?? [],
        correct: safeString(question.correct, fallback.quizzes[index]?.questions?.[questionIndex]?.correct ?? ''),
        sentenceBefore: safeString(question.sentenceBefore, fallback.quizzes[index]?.questions?.[questionIndex]?.sentenceBefore ?? ''),
        sentenceAfter: safeString(question.sentenceAfter, fallback.quizzes[index]?.questions?.[questionIndex]?.sentenceAfter ?? ''),
        scrambled: Array.isArray(question.scrambled) ? question.scrambled.filter((item) => typeof item === 'string') : fallback.quizzes[index]?.questions?.[questionIndex]?.scrambled ?? [],
        solution: Array.isArray(question.solution) ? question.solution.filter((item) => typeof item === 'string') : fallback.quizzes[index]?.questions?.[questionIndex]?.solution ?? [],
        reward: clamp(safeNumber(question.reward, fallback.quizzes[index]?.questions?.[questionIndex]?.reward ?? 25), 10, 80),
        kicker: safeString(question.kicker, `Missão ${index + 1}.${questionIndex + 1}`),
        difficulty: question.difficulty === 'Fácil' ? 'Fácil' : 'Médio',
      })),
    })),
    generationMode,
    generationNotes,
    promptsUsed:
      Array.isArray(payload.promptsUsed) && payload.promptsUsed.length
        ? payload.promptsUsed.filter((item): item is string => typeof item === 'string')
        : quizzes.flatMap((quiz) => quiz.questions?.map((question) => question.prompt ?? '') ?? []).filter(Boolean),
    estimatedTokens: clamp(safeNumber(payload.estimatedTokens, fallback.estimatedTokens), 1000, 250000),
    estimatedCostUsd: safeNumber(payload.estimatedCostUsd, fallback.estimatedCostUsd),
    provider: payload.provider ?? aiControl.provider,
    model: payload.model ?? aiControl.primaryModel,
  }
}

const requestProviderContent = async (
  provider: AIProvider,
  model: AIModel,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
) => {
  if (provider === 'anthropic') {
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    }, 25000)

    if (!response.ok) {
      throw new Error(await parseProviderMessage(response))
    }

    const payload = await response.json()
    return {
      text: extractText(payload, provider),
      tokens: extractTokenUsage(payload, provider),
    }
  }

  const endpoint = provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...(provider === 'openrouter'
          ? {
              'http-referer': 'https://sparklingo.app',
              'x-title': 'SparkLingo',
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    },
    25000,
  )

  if (!response.ok) {
    throw new Error(await parseProviderMessage(response))
  }

  const payload = await response.json()
  return {
    text: extractText(payload, provider),
    tokens: extractTokenUsage(payload, provider),
  }
}

export const syncUserProfileFromProgress = onDocumentWritten('userProgress/{userId}', async (event) => {
  const after = event.data?.after
  if (!after?.exists) return

  const userId = event.params.userId
  const data = after.data() as {
    totalXp?: number
    streakDays?: number
    level?: number
    emotional?: {
      confidence?: number
      fluency?: number
      hesitation?: number
      emotionalStreak?: number
    }
    recentMissionTheme?: string
  }

  await db.collection('users').doc(userId).set(
    {
      xp: data.totalXp ?? 0,
      streak: data.streakDays ?? 0,
      level: data.level ?? 1,
      confidence: data.emotional?.confidence ?? 0,
      fluency: data.emotional?.fluency ?? 0,
      hesitation: data.emotional?.hesitation ?? 0,
      emotionalStreak: data.emotional?.emotionalStreak ?? 0,
      recentMissionTheme: data.recentMissionTheme ?? '',
      updatedAt: new Date(),
    },
    { merge: true },
  )
})

export const saveAiProviderSecret = onCall<SaveAiProviderSecretRequest>(async (request) => {
  const uid = await ensureAdmin(request.auth?.uid)
  const provider = request.data?.provider ?? 'openrouter'
  const apiKey = safeString(request.data?.apiKey)
  const apiKeyReference = safeString(request.data?.apiKeyReference, providerDefaults[provider])

  if (!apiKey) {
    throw new HttpsError('invalid-argument', 'Informe uma chave antes de salvar a configuração segura do provider.')
  }

  await db.collection('platformSecure').doc('aiProvider').set(
    {
      provider,
      apiKey,
      apiKeyReference,
      updatedAt: new Date(),
      updatedBy: uid,
    },
    { merge: true },
  )

  return {
    ok: true,
    provider,
    message: 'Chave salva no backend com sucesso.',
    maskedKey: maskKey(apiKey),
    usingStoredSecret: true,
  } satisfies ProviderConnectionResult
})

export const testAiProviderConnection = onCall<TestAiProviderConnectionRequest>(async (request) => {
  await ensureAdmin(request.auth?.uid)
  const provider = request.data?.provider ?? 'openrouter'
  const inlineKey = safeString(request.data?.apiKey)
  const apiKeyReference = safeString(request.data?.apiKeyReference, providerDefaults[provider])

  const secret =
    inlineKey
      ? { key: inlineKey, reference: apiKeyReference, usingStoredSecret: false }
      : await getStoredSecret(provider, apiKeyReference)

  if (!secret?.key) {
    throw new HttpsError(
      'failed-precondition',
      `Nenhuma chave disponível para ${provider}. Configure a referência ${apiKeyReference} no backend ou salve uma chave segura antes do teste.`,
    )
  }

  const startedAt = Date.now()
  const response = await fetchWithTimeout(
    provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/models'
      : provider === 'openai'
        ? 'https://api.openai.com/v1/models'
        : 'https://api.anthropic.com/v1/models',
    {
      method: 'GET',
      headers:
        provider === 'anthropic'
          ? {
              'x-api-key': secret.key,
              'anthropic-version': '2023-06-01',
            }
          : {
              authorization: `Bearer ${secret.key}`,
            },
    },
    12000,
  )

  const latencyMs = Date.now() - startedAt
  if (!response.ok) {
    throw new HttpsError('unknown', await parseProviderMessage(response))
  }

  return {
    ok: true,
    provider,
    message: `${provider} respondeu corretamente.`,
    maskedKey: maskKey(secret.key),
    usingStoredSecret: secret.usingStoredSecret,
    latencyMs,
  } satisfies ProviderConnectionResult
})

export const generateMissionDraft = onCall<GenerateMissionDraftRequest>(async (request) => {
  const uid = await ensureAdmin(request.auth?.uid)
  const composer = sanitizeComposer(request.data?.composer ?? {})
  const aiControl = sanitizeAIControl(request.data?.aiControl ?? {})
  const memory = sanitizeMemoryConfig(request.data?.memoryConfig ?? {})

  const secret = await getStoredSecret(aiControl.provider, aiControl.apiKeyReference)
  const fallback = buildFallbackMissionDraft(
    composer,
    aiControl,
    memory,
    'Spark AI usou o template contextual porque nenhuma chave segura estava disponível no backend.',
  )

  if (!secret?.key) {
    await db.collection('aiLogs').add({
      type: 'draft_generation',
      mode: 'fallback-template',
      provider: aiControl.provider,
      model: aiControl.primaryModel,
      reason: 'missing_secret',
      draftTitle: fallback.title,
      createdBy: uid,
      createdAt: new Date(),
    })
    return fallback
  }

  const systemPrompt = buildSystemPrompt(aiControl, memory)
  const userPrompt = buildUserPrompt(composer)

  const runAttempt = async (model: AIModel) => {
    const startedAt = Date.now()
    const response = await requestProviderContent(
      aiControl.provider,
      model,
      secret.key,
      systemPrompt,
      userPrompt,
      aiControl.temperature,
    )
    const latencyMs = Date.now() - startedAt
    const parsed = JSON.parse(extractJsonBlock(response.text)) as Partial<GeneratedMissionDraft>
    const draft = normaliseGeneratedPayload(
      parsed,
      composer,
      aiControl,
      memory,
      'provider',
      `Gerado via ${aiControl.provider}/${model} em ${latencyMs}ms.`,
    )
    draft.provider = aiControl.provider
    draft.model = model
    draft.estimatedTokens = response.tokens || draft.estimatedTokens
    draft.estimatedCostUsd = estimateCost(aiControl.provider, model, draft.estimatedTokens)
    return { draft, latencyMs }
  }

  try {
    const primary = await runAttempt(aiControl.primaryModel)
    await db.collection('aiLogs').add({
      type: 'draft_generation',
      mode: 'provider',
      provider: aiControl.provider,
      model: aiControl.primaryModel,
      latencyMs: primary.latencyMs,
      estimatedCostUsd: primary.draft.estimatedCostUsd,
      draftTitle: primary.draft.title,
      createdBy: uid,
      createdAt: new Date(),
    })
    return primary.draft
  } catch (primaryError) {
    if (aiControl.fallbackModel !== aiControl.primaryModel) {
      try {
        const fallbackProviderDraft = await runAttempt(aiControl.fallbackModel)
        fallbackProviderDraft.draft.generationNotes = `Modelo principal falhou. Fallback automático acionado para ${aiControl.fallbackModel}.`
        await db.collection('aiLogs').add({
          type: 'draft_generation',
          mode: 'provider-fallback',
          provider: aiControl.provider,
          model: aiControl.fallbackModel,
          latencyMs: fallbackProviderDraft.latencyMs,
          estimatedCostUsd: fallbackProviderDraft.draft.estimatedCostUsd,
          draftTitle: fallbackProviderDraft.draft.title,
          createdBy: uid,
          createdAt: new Date(),
        })
        return fallbackProviderDraft.draft
      } catch (fallbackError) {
        const failSafe = {
          ...fallback,
          generationNotes: `OpenRouter/IA falhou no modelo principal e no fallback. Template contextual usado. Erros: ${primaryError instanceof Error ? primaryError.message : 'unknown'} / ${fallbackError instanceof Error ? fallbackError.message : 'unknown'}.`,
        }
        await db.collection('aiLogs').add({
          type: 'draft_generation',
          mode: 'fallback-template',
          provider: aiControl.provider,
          model: aiControl.fallbackModel,
          reason: 'provider_failed',
          draftTitle: failSafe.title,
          createdBy: uid,
          createdAt: new Date(),
        })
        return failSafe
      }
    }

    const failSafe = {
      ...fallback,
      generationNotes: `Falha ao gerar com ${aiControl.primaryModel}. Template contextual usado. Erro: ${primaryError instanceof Error ? primaryError.message : 'unknown'}.`,
    }
    await db.collection('aiLogs').add({
      type: 'draft_generation',
      mode: 'fallback-template',
      provider: aiControl.provider,
      model: aiControl.primaryModel,
      reason: 'provider_failed',
      draftTitle: failSafe.title,
      createdBy: uid,
      createdAt: new Date(),
    })
    return failSafe
  }
})
