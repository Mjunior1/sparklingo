import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { requireFirebase } from '../lib/firebase'
import type { AIControlConfig, MemoryEngineConfig, PedagogicalMode } from './aiControl'
import type { ExerciseKind, FilterKey, LessonCatalogItem, LessonTone, QuizCatalogItem, QuizQuestionItem } from './catalog'

export type MissionTemplate =
  | 'Travel Beginner'
  | 'Airport Survival'
  | 'Restaurant Mission'
  | 'Speaking Heavy'
  | 'Listening Booster'
  | 'Daily Fast Lesson'

export type MissionLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type StudentGoal = 'Travel' | 'Business' | 'Immigration' | 'Social' | 'Confidence' | 'Gaming' | 'Movies'
export type VisualStyle = 'Cartoon 3D' | 'Modern Flat' | 'Minimal' | 'Realistic' | 'Kids Friendly'
export type DraftQuestionType = 'multiple-choice' | 'speaking' | 'drag-fill' | 'matching' | 'fill-blank' | 'listening'
export type DraftStatus = 'draft' | 'approved' | 'published' | 'rejected'
export type DraftGenerationMode = 'provider' | 'fallback-template'

export type QuestionMix = Record<DraftQuestionType, number>

export type LessonComposerInput = {
  template: MissionTemplate
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

export type PartialRegenerationMode = 'question' | 'alternatives' | 'speaking' | 'cover'

export type GeneratedQuestionDraft = {
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

export type GeneratedQuizDraft = {
  title: string
  objective: string
  storyBeat: string
  reward: number
  difficulty: 'Fácil' | 'Médio'
  kind: 'multiple-choice' | 'drag-fill' | 'ordering' | 'listening' | 'speaking'
  order: number
  questions: GeneratedQuestionDraft[]
}

export type GeneratedMissionDraft = {
  title: string
  theme: string
  emotionalContext: string
  practicalGoal: string
  template: MissionTemplate
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
  provider: AIControlConfig['provider']
  model: AIControlConfig['primaryModel']
  generationMode: DraftGenerationMode
  generationNotes: string
}

export type AIDraftRecord = {
  id: string
  status: DraftStatus
  title: string
  theme: string
  emotionalContext: string
  practicalGoal: string
  level: MissionLevel
  template: MissionTemplate
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
  skills: string[]
  xpTotal: number
  coverPrompt: string
  promptsUsed: string[]
  provider: AIControlConfig['provider']
  model: AIControlConfig['primaryModel']
  estimatedTokens: number
  estimatedCostUsd: number
  generationMode: DraftGenerationMode
  generationNotes: string
  lesson: LessonCatalogItem
  quizzes: QuizCatalogItem[]
  questions: QuizQuestionItem[]
}

export const defaultQuestionMix: QuestionMix = {
  'multiple-choice': 3,
  speaking: 1,
  'drag-fill': 1,
  matching: 1,
  'fill-blank': 1,
  listening: 1,
}

export const missionTemplateOptions: MissionTemplate[] = [
  'Travel Beginner',
  'Airport Survival',
  'Restaurant Mission',
  'Speaking Heavy',
  'Listening Booster',
  'Daily Fast Lesson',
]

export const missionLevelOptions: MissionLevel[] = ['Beginner', 'Intermediate', 'Advanced']
export const studentGoalOptions: StudentGoal[] = ['Travel', 'Business', 'Immigration', 'Social', 'Confidence', 'Gaming', 'Movies']
export const visualStyleOptions: VisualStyle[] = ['Cartoon 3D', 'Modern Flat', 'Minimal', 'Realistic', 'Kids Friendly']
export const draftQuestionTypeOptions: DraftQuestionType[] = ['multiple-choice', 'speaking', 'drag-fill', 'matching', 'fill-blank', 'listening']

const safeQuestionTypes: DraftQuestionType[] = ['multiple-choice', 'speaking', 'drag-fill', 'matching', 'fill-blank', 'listening']
const safeStatuses: DraftStatus[] = ['draft', 'approved', 'published', 'rejected']

const templateDefaults: Record<MissionTemplate, Partial<LessonComposerInput>> = {
  'Travel Beginner': {
    studentGoal: 'Travel',
    pedagogicalMode: 'Beginner Safe',
    visualStyle: 'Cartoon 3D',
    level: 'Beginner',
  },
  'Airport Survival': {
    studentGoal: 'Travel',
    pedagogicalMode: 'Travel Immersion',
    visualStyle: 'Cartoon 3D',
    level: 'Beginner',
  },
  'Restaurant Mission': {
    studentGoal: 'Social',
    pedagogicalMode: 'Vocabulary Focus',
    visualStyle: 'Modern Flat',
    level: 'Beginner',
  },
  'Speaking Heavy': {
    studentGoal: 'Confidence',
    pedagogicalMode: 'Speaking Heavy',
    visualStyle: 'Minimal',
    level: 'Intermediate',
  },
  'Listening Booster': {
    studentGoal: 'Movies',
    pedagogicalMode: 'Listening Booster',
    visualStyle: 'Modern Flat',
    level: 'Intermediate',
  },
  'Daily Fast Lesson': {
    studentGoal: 'Travel',
    pedagogicalMode: 'Fast Daily Lesson',
    visualStyle: 'Minimal',
    level: 'Beginner',
  },
}

const cleanString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)
const cleanNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const cleanStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const mapQuestionKind = (kind: DraftQuestionType): ExerciseKind => {
  if (kind === 'drag-fill' || kind === 'fill-blank') return 'drag-fill'
  if (kind === 'matching') return 'multiple-choice'
  if (kind === 'listening') return 'listening'
  if (kind === 'speaking') return 'speaking'
  return 'multiple-choice'
}

const mapCategory = (goal: StudentGoal): Exclude<FilterKey, 'Todos'> => {
  if (goal === 'Travel' || goal === 'Immigration') return 'Vocabulário'
  if (goal === 'Movies') return 'Listening'
  if (goal === 'Confidence' || goal === 'Social') return 'Speaking'
  return 'Gramática'
}

const mapTone = (style: VisualStyle): LessonTone => {
  if (style === 'Minimal') return 'mint'
  if (style === 'Realistic') return 'sky'
  return 'violet'
}

const stripUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => stripUndefinedDeep(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, stripUndefinedDeep(nested)]),
    ) as T
  }
  return value
}

const nextId = (existingIds: string[], prefix: string, offset = 1) => {
  const numeric = existingIds
    .map((id) => {
      const match = id.match(/(\d+)(?!.*\d)/)
      return match ? Number(match[1]) : Number.NaN
    })
    .filter((value) => Number.isFinite(value))

  return `${prefix}-${String((numeric.length ? Math.max(...numeric) : 0) + offset).padStart(5, '0')}`
}

const buildExperienceName = (theme: string, context: string) => {
  if (!context.trim()) return theme.trim()
  return `${theme.trim()} • ${context.trim()}`
}

const buildBlueprintFromComposer = (input: LessonComposerInput, config: AIControlConfig): GeneratedMissionDraft => {
  const mergedInput: LessonComposerInput = { ...templateDefaults[input.template], ...input }
  const category = mapCategory(mergedInput.studentGoal)
  const routeByGoal: Record<StudentGoal, string[]> = {
    Travel: ['Arriving in London', 'Airport survival', 'Hotel check-in', 'Restaurant interaction'],
    Business: ['Meeting intro', 'Boardroom briefing', 'Client objection', 'Follow-up call'],
    Immigration: ['Border questions', 'Lost document support', 'Public transport', 'Rental setup'],
    Social: ['First hello', 'Making plans', 'Explaining yourself', 'Keeping the vibe alive'],
    Confidence: ['Safe warm-up', 'Low-pressure response', 'Live interaction', 'Confident recovery'],
    Gaming: ['Party chat', 'Quick strategy call', 'Live teamwork', 'Friendly banter'],
    Movies: ['Catch the clue', 'Interpret the scene', 'Retell the moment', 'Discuss what changed'],
  }
  const arc = routeByGoal[mergedInput.studentGoal]
  const questionTypes: DraftQuestionType[] = []
  safeQuestionTypes.forEach((type) => {
    const total = Math.max(0, mergedInput.questionMix[type] ?? 0)
    for (let index = 0; index < total; index += 1) questionTypes.push(type)
  })
  const sequence: DraftQuestionType[] = questionTypes.length ? questionTypes : ['multiple-choice', 'drag-fill', 'speaking']
  const quizzes: GeneratedQuizDraft[] = []
  let questionIndex = 0

  for (let quizIndex = 0; quizIndex < mergedInput.quizCount; quizIndex += 1) {
    const questions: GeneratedQuestionDraft[] = []
    for (let localIndex = 0; localIndex < mergedInput.questionsPerQuiz; localIndex += 1) {
      const type = sequence[questionIndex % sequence.length] ?? 'multiple-choice'
      questions.push({
        type,
        tag: category,
        title:
          type === 'speaking' ? `Say it with confidence ${localIndex + 1}`
            : type === 'listening' ? `Catch the clue ${localIndex + 1}`
            : type === 'drag-fill' || type === 'fill-blank' ? `Complete the line ${localIndex + 1}`
            : `Choose the next move ${localIndex + 1}`,
        prompt:
          type === 'speaking'
            ? `Você está em ${mergedInput.theme}. ${mergedInput.emotionalContext} Responda em voz alta e peça ajuda com naturalidade.`
            : type === 'listening'
              ? `Escute o detalhe-chave enquanto a cena acontece: ${mergedInput.emotionalContext}.`
              : type === 'drag-fill' || type === 'fill-blank'
                ? `Complete a frase dentro do contexto: ${mergedInput.emotionalContext}.`
                : `Escolha a melhor resposta para manter a missão avançando em ${mergedInput.theme}.`,
        explanation:
          mergedInput.level === 'Beginner'
            ? 'Use uma frase curta, útil e emocionalmente segura.'
            : 'Mantenha naturalidade, clareza e progresso contextual.',
        options: type === 'speaking' ? [] : ['ask for help', 'stay silent', 'walk away', 'change the subject'],
        correct: type === 'speaking' ? '' : 'ask for help',
        sentenceBefore: type === 'drag-fill' || type === 'fill-blank' ? 'I need' : '',
        sentenceAfter: type === 'drag-fill' || type === 'fill-blank' ? 'right now.' : '',
        scrambled: type === 'matching' ? [] : type === 'speaking' ? [] : type === 'listening' ? [] : ['I', 'need', 'help', 'now'],
        solution: type === 'matching' ? [] : type === 'speaking' ? [] : type === 'listening' ? [] : ['I', 'need', 'help', 'now'],
        reward: 20 + localIndex * 5 + quizIndex * 4,
        kicker: `Missão ${quizIndex + 1}.${localIndex + 1}`,
        difficulty: mergedInput.level === 'Beginner' ? 'Fácil' : 'Médio',
      })
      questionIndex += 1
    }

    quizzes.push({
      title: `${mergedInput.theme} • etapa ${quizIndex + 1}`,
      objective: mergedInput.practicalGoal,
      storyBeat: arc[Math.min(quizIndex + 1, arc.length - 1)] ?? arc[arc.length - 1],
      reward: 20 + quizIndex * 5,
      difficulty: mergedInput.level === 'Beginner' ? 'Fácil' : 'Médio',
      kind: mapQuestionKind(questions[0]?.type ?? 'multiple-choice'),
      order: quizIndex + 1,
      questions,
    })
  }

  const promptsUsed = quizzes.flatMap((quiz) => quiz.questions.map((question) => question.prompt))
  const estimatedTokens = Math.max(2000, quizzes.length * mergedInput.questionsPerQuiz * 220)

  return {
    title: `${mergedInput.theme} mission`,
    theme: mergedInput.theme,
    emotionalContext: mergedInput.emotionalContext,
    practicalGoal: mergedInput.practicalGoal,
    template: mergedInput.template,
    level: mergedInput.level,
    studentGoal: mergedInput.studentGoal,
    pedagogicalMode: mergedInput.pedagogicalMode,
    visualStyle: mergedInput.visualStyle,
    tensionLabel: mergedInput.emotionalContext || 'Urgência contextual',
    urgencyNote: mergedInput.emotionalContext || 'O aluno precisa agir antes que a situação piore.',
    emotionalGoal: mergedInput.studentGoal === 'Confidence' ? 'Diminuir medo de falar e aumentar coragem contextual.' : 'Trocar hesitação por ação útil em contexto real.',
    confidenceTarget: mergedInput.level === 'Beginner' ? 'Terminar sentindo: eu consigo responder essa situação.' : 'Sentir mais fluidez e menos bloqueio para agir.',
    perceivedProgress: {
      confidence: 'mais coragem ao responder',
      fluency: 'menos travas no fluxo',
      hesitation: 'redução de pausa antes de agir',
      mastery: 'uma cena real desbloqueada',
    },
    continuity: {
      previousScene: arc[0] ?? mergedInput.theme,
      currentScene: arc[1] ?? mergedInput.theme,
      nextScene: arc[2] ?? mergedInput.theme,
      arc,
    },
    adaptationNotes: {
      speakingSupport: 'Começar com respostas curtas e aumentar confiança gradualmente.',
      listeningSupport: 'Usar pistas curtas antes de aumentar ruído ou densidade.',
      repetitionStrategy: `Repetição máxima ${config.guardrails.repetitionLimit}, variando intenção e contexto.`,
      reviewPressure: mergedInput.level === 'Beginner' ? 'Baixa pressão e recuperação rápida.' : 'Pressão moderada com continuidade narrativa.',
    },
    questionMix: mergedInput.questionMix,
    quizzes,
    coverPrompt: `Create one premium ${mergedInput.visualStyle} mission cover for "${mergedInput.theme}" with emotional context "${mergedInput.emotionalContext}", no text, lilac-driven palette, warm urgency, educational game feel.`,
    promptsUsed,
    estimatedTokens,
    estimatedCostUsd: Number(((estimatedTokens / 1_000_000) * 0.55).toFixed(4)),
    provider: config.provider,
    model: config.primaryModel,
    generationMode: 'fallback-template',
    generationNotes: 'Blueprint local contextual usado como fallback seguro.',
  }
}

const sanitizeDraft = (draft: AIDraftRecord): AIDraftRecord => ({
  id: cleanString(draft.id),
  status: safeStatuses.includes(draft.status) ? draft.status : 'draft',
  title: cleanString(draft.title),
  theme: cleanString(draft.theme),
  emotionalContext: cleanString(draft.emotionalContext),
  practicalGoal: cleanString(draft.practicalGoal),
  level: draft.level ?? 'Beginner',
  template: draft.template,
  studentGoal: draft.studentGoal,
  pedagogicalMode: draft.pedagogicalMode,
  visualStyle: draft.visualStyle,
  tensionLabel: cleanString(draft.tensionLabel),
  urgencyNote: cleanString(draft.urgencyNote),
  emotionalGoal: cleanString(draft.emotionalGoal),
  confidenceTarget: cleanString(draft.confidenceTarget),
  perceivedProgress: {
    confidence: cleanString(draft.perceivedProgress?.confidence),
    fluency: cleanString(draft.perceivedProgress?.fluency),
    hesitation: cleanString(draft.perceivedProgress?.hesitation),
    mastery: cleanString(draft.perceivedProgress?.mastery),
  },
  continuity: {
    previousScene: cleanString(draft.continuity?.previousScene),
    currentScene: cleanString(draft.continuity?.currentScene),
    nextScene: cleanString(draft.continuity?.nextScene),
    arc: cleanStringArray(draft.continuity?.arc),
  },
  adaptationNotes: {
    speakingSupport: cleanString(draft.adaptationNotes?.speakingSupport),
    listeningSupport: cleanString(draft.adaptationNotes?.listeningSupport),
    repetitionStrategy: cleanString(draft.adaptationNotes?.repetitionStrategy),
    reviewPressure: cleanString(draft.adaptationNotes?.reviewPressure),
  },
  questionMix: {
    'multiple-choice': cleanNumber(draft.questionMix?.['multiple-choice'], 0),
    speaking: cleanNumber(draft.questionMix?.speaking, 0),
    'drag-fill': cleanNumber(draft.questionMix?.['drag-fill'], 0),
    matching: cleanNumber(draft.questionMix?.matching, 0),
    'fill-blank': cleanNumber(draft.questionMix?.['fill-blank'], 0),
    listening: cleanNumber(draft.questionMix?.listening, 0),
  },
  skills: cleanStringArray(draft.skills),
  xpTotal: cleanNumber(draft.xpTotal, 0),
  coverPrompt: cleanString(draft.coverPrompt),
  promptsUsed: cleanStringArray(draft.promptsUsed),
  provider: draft.provider,
  model: draft.model,
  estimatedTokens: cleanNumber(draft.estimatedTokens, 0),
  estimatedCostUsd: cleanNumber(draft.estimatedCostUsd, 0),
  generationMode: draft.generationMode ?? 'fallback-template',
  generationNotes: cleanString(draft.generationNotes),
  lesson: draft.lesson,
  quizzes: draft.quizzes,
  questions: draft.questions,
})

const assembleDraftRecord = (
  generated: GeneratedMissionDraft,
  input: LessonComposerInput,
  context: {
    lessonIds: string[]
    quizIds: string[]
    questionIds: string[]
    existingDraftIds: string[]
  },
): AIDraftRecord => {
  const mergedInput: LessonComposerInput = { ...templateDefaults[input.template], ...input }
  const category = mapCategory(mergedInput.studentGoal)
  const lessonId = nextId(context.lessonIds, 'LS')
  const draftId = nextId(context.existingDraftIds, 'DR')
  const tone = mapTone(mergedInput.visualStyle)
  const quizzes: QuizCatalogItem[] = []
  const questions: QuizQuestionItem[] = []
  const availableQuizIds = [...context.quizIds]
  const availableQuestionIds = [...context.questionIds]

  const lesson: LessonCatalogItem = {
    id: lessonId,
    category,
    title: buildExperienceName(generated.theme, generated.emotionalContext || generated.studentGoal),
    blurb: generated.practicalGoal,
    image: '/pollinations/airport-card.png',
    tone,
    progress: 0,
    missionTitle: generated.title,
    emotionalContext: generated.emotionalContext,
    practicalGoal: generated.practicalGoal,
    tensionLabel: generated.tensionLabel,
    urgencyNote: generated.urgencyNote,
    emotionalGoal: generated.emotionalGoal,
    confidenceTarget: generated.confidenceTarget,
    nextMissionHook: generated.continuity.nextScene,
    journeyArc: generated.continuity.arc,
  }

  generated.quizzes.forEach((quizBlueprint, quizIndex) => {
    const quizId = nextId(availableQuizIds, 'QZ', quizIndex + 1)
    availableQuizIds.push(quizId)
    const quiz: QuizCatalogItem = {
      id: quizId,
      lessonId,
      tag: category,
      title: quizBlueprint.title,
      coverArt: lesson.image,
      objective: quizBlueprint.objective,
      storyBeat: quizBlueprint.storyBeat,
      difficulty: quizBlueprint.difficulty,
      reward: quizBlueprint.reward,
      kind: quizBlueprint.kind,
      order: quizBlueprint.order,
      active: true,
    }
    quizzes.push(quiz)

    quizBlueprint.questions.forEach((questionBlueprint, questionIndex) => {
      const questionId = nextId(availableQuestionIds, 'QT', questions.length + 1)
      availableQuestionIds.push(questionId)
      const kind = mapQuestionKind(questionBlueprint.type)
      questions.push({
        id: questionId,
        quizId,
        lessonId,
        tag: category,
        kind,
        difficulty: questionBlueprint.difficulty,
        kicker: questionBlueprint.kicker || `Missão ${quizIndex + 1}.${questionIndex + 1}`,
        title: questionBlueprint.title,
        prompt: questionBlueprint.prompt,
        art: quiz.coverArt || lesson.image,
        artAlt: `${generated.theme} visual`,
        reward: questionBlueprint.reward,
        active: true,
        contextCue: quizBlueprint.storyBeat,
        options: kind === 'multiple-choice' || kind === 'drag-fill' || kind === 'listening' ? (questionBlueprint.options ?? []) : [],
        correct: kind === 'ordering' || kind === 'speaking' ? '' : questionBlueprint.correct,
        explanation: questionBlueprint.explanation,
        sentenceBefore: kind === 'drag-fill' ? questionBlueprint.sentenceBefore : '',
        sentenceAfter: kind === 'drag-fill' ? questionBlueprint.sentenceAfter : '',
        scrambled: kind === 'ordering' ? questionBlueprint.scrambled : [],
        solution: kind === 'ordering' ? questionBlueprint.solution : [],
      })
    })
  })

  const xpTotal = questions.reduce((sum, item) => sum + item.reward, 0)
  const skills = Array.from(new Set([mergedInput.studentGoal, category, mergedInput.pedagogicalMode, generated.emotionalGoal]))

  return sanitizeDraft({
    id: draftId,
    status: 'draft',
    title: generated.title,
    theme: generated.theme,
    emotionalContext: generated.emotionalContext,
    practicalGoal: generated.practicalGoal,
    level: generated.level,
    template: generated.template,
    studentGoal: generated.studentGoal,
    pedagogicalMode: generated.pedagogicalMode,
    visualStyle: generated.visualStyle,
    tensionLabel: generated.tensionLabel,
    urgencyNote: generated.urgencyNote,
    emotionalGoal: generated.emotionalGoal,
    confidenceTarget: generated.confidenceTarget,
    perceivedProgress: generated.perceivedProgress,
    continuity: generated.continuity,
    adaptationNotes: generated.adaptationNotes,
    questionMix: generated.questionMix,
    skills,
    xpTotal,
    coverPrompt: generated.coverPrompt,
    promptsUsed: generated.promptsUsed,
    provider: generated.provider,
    model: generated.model,
    estimatedTokens: generated.estimatedTokens,
    estimatedCostUsd: generated.estimatedCostUsd,
    generationMode: generated.generationMode,
    generationNotes: generated.generationNotes,
    lesson,
    quizzes,
    questions,
  })
}

const generateDraftCallable = () => {
  const { functions } = requireFirebase()
  return httpsCallable<
    {
      composer: LessonComposerInput
      aiControl: AIControlConfig
      memoryConfig: MemoryEngineConfig
    },
    GeneratedMissionDraft
  >(functions, 'generateMissionDraft')
}

export const buildDraftFromComposer = (
  input: LessonComposerInput,
  config: AIControlConfig,
  context: {
    lessonIds: string[]
    quizIds: string[]
    questionIds: string[]
    existingDraftIds: string[]
  },
): AIDraftRecord => {
  const generated = buildBlueprintFromComposer(input, config)
  return assembleDraftRecord(generated, input, context)
}

export const generateAIDraftWithSpark = async (
  input: LessonComposerInput,
  config: AIControlConfig,
  memoryConfig: MemoryEngineConfig,
  context: {
    lessonIds: string[]
    quizIds: string[]
    questionIds: string[]
    existingDraftIds: string[]
  },
) => {
  try {
    const result = await generateDraftCallable()({
      composer: input,
      aiControl: config,
      memoryConfig,
    })
    return assembleDraftRecord(result.data, input, context)
  } catch {
    return buildDraftFromComposer(input, config, context)
  }
}

export const regenerateDraftPart = (
  draft: AIDraftRecord,
  mode: PartialRegenerationMode,
  targetQuestionId?: string,
): AIDraftRecord => {
  const updated = structuredClone(draft)

  if (mode === 'cover') {
    updated.coverPrompt = `${draft.coverPrompt} Variation ${Date.now()}.`
    updated.generationNotes = 'Capa regenerada localmente para revisão manual.'
    return updated
  }

  const targetIndex = updated.questions.findIndex((item) => item.id === targetQuestionId)
  if (targetIndex === -1) return updated
  const question = updated.questions[targetIndex]

  if (mode === 'alternatives') {
    const seed = question.title || draft.theme
    question.options = [
      `${seed} option A`,
      `${seed} option B`,
      `${seed} option C`,
      `${seed} option D`,
    ]
    question.correct = question.options[0]
  } else if (mode === 'speaking') {
    question.kind = 'speaking'
    question.prompt = `Speak naturally inside the context: ${draft.emotionalContext || draft.practicalGoal}.`
    question.explanation = 'Focus on confidence, clarity, and useful real-world output.'
    question.options = []
    question.correct = ''
  } else {
    question.title = `${question.title} • remix`
    question.prompt = `${question.prompt} Add one fresh variation with the same learning goal.`
  }

  updated.generationNotes = `Trecho regenerado manualmente (${mode}) antes da aprovação final.`
  return sanitizeDraft(updated)
}

const draftCollection = () => {
  const { db } = requireFirebase()
  return collection(db, 'aiDrafts')
}

export const getAIDrafts = async (): Promise<AIDraftRecord[]> => {
  try {
    const snapshot = await getDocs(query(draftCollection(), orderBy('updatedAt', 'desc')))
    return snapshot.docs.map((item) =>
      sanitizeDraft({
        id: item.id,
        ...(item.data() as Omit<AIDraftRecord, 'id'>),
      }),
    )
  } catch {
    return []
  }
}

export const saveAIDraft = async (draft: AIDraftRecord) => {
  const { db, auth } = requireFirebase()
  const safeDraft = sanitizeDraft(draft)
  await setDoc(
    doc(db, 'aiDrafts', safeDraft.id),
    stripUndefinedDeep({
      ...safeDraft,
      createdBy: auth.currentUser?.uid ?? null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }),
    { merge: true },
  )
}

export const updateAIDraftStatus = async (draftId: string, status: DraftStatus) => {
  const { db, auth } = requireFirebase()
  await updateDoc(doc(db, 'aiDrafts', draftId), {
    status,
    reviewedBy: auth.currentUser?.uid ?? null,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const publishAIDraft = async (draft: AIDraftRecord) => {
  const { db, auth } = requireFirebase()
  const safeDraft = sanitizeDraft(draft)
  const batch = writeBatch(db)

  batch.set(
    doc(db, 'lessons', safeDraft.lesson.id),
    stripUndefinedDeep({
      ...safeDraft.lesson,
      missionTitle: safeDraft.title,
      emotionalContext: safeDraft.emotionalContext,
      practicalGoal: safeDraft.practicalGoal,
      tensionLabel: safeDraft.tensionLabel,
      urgencyNote: safeDraft.urgencyNote,
      emotionalGoal: safeDraft.emotionalGoal,
      confidenceTarget: safeDraft.confidenceTarget,
      nextMissionHook: safeDraft.continuity.nextScene,
      journeyArc: safeDraft.continuity.arc,
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  )

  safeDraft.quizzes.forEach((quiz) => {
    batch.set(
      doc(db, 'quizzes', quiz.id),
      stripUndefinedDeep({
        ...quiz,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    )
  })

  safeDraft.questions.forEach((question) => {
    batch.set(
      doc(db, 'quizQuestions', question.id),
      stripUndefinedDeep({
        ...question,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    )
  })

  batch.set(
    doc(db, 'aiDrafts', safeDraft.id),
    stripUndefinedDeep({
      ...safeDraft,
      status: 'published',
      publishedBy: auth.currentUser?.uid ?? null,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  )

  await batch.commit()
}
