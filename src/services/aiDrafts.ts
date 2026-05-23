import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'
import type { AIControlConfig, PedagogicalMode } from './aiControl'
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
  questionMix: QuestionMix
  skills: string[]
  xpTotal: number
  coverPrompt: string
  promptsUsed: string[]
  provider: AIControlConfig['provider']
  model: AIControlConfig['primaryModel']
  estimatedTokens: number
  estimatedCostUsd: number
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

const createOptions = (goal: StudentGoal, theme: string) => {
  if (goal === 'Travel') return ['ask for help', 'hide the ticket', 'leave the airport', 'sleep outside']
  if (goal === 'Business') return ['confirm the meeting', 'cancel the client', 'ignore the email', 'miss the deadline']
  if (theme.toLowerCase().includes('restaurant')) return ['order politely', 'shout at the waiter', 'leave without paying', 'skip the menu']
  return ['choose the best answer', 'skip the context', 'guess randomly', 'close the mission']
}

const buildQuestionCopy = (
  type: DraftQuestionType,
  theme: string,
  context: string,
  goal: string,
  index: number,
  level: MissionLevel,
) => {
  const prefix = `${theme}: ${context || goal}`
  if (type === 'speaking') {
    return {
      title: `Say it with confidence ${index}`,
      prompt: `Respond aloud inside the scene: ${prefix}.`,
      explanation: `Goal: answer naturally and keep the tone appropriate for a ${level.toLowerCase()} learner.`,
    }
  }

  if (type === 'listening') {
    return {
      title: `Listen for the clue ${index}`,
      prompt: `You hear a short message in the scenario: ${prefix}. What is the key meaning?`,
      explanation: `Focus on one useful detail and avoid overloading the learner.`,
    }
  }

  if (type === 'drag-fill' || type === 'fill-blank') {
    return {
      title: `Fill the response ${index}`,
      prompt: `Complete the missing part of the line in context: ${prefix}.`,
      explanation: `Short sentence, high clarity, and immediate practical use.`,
    }
  }

  if (type === 'matching') {
    return {
      title: `Match the meaning ${index}`,
      prompt: `Link the expression to the right meaning inside the mission.`,
      explanation: `Keep the vocabulary useful, visual, and memorable.`,
    }
  }

  return {
    title: `Choose the next move ${index}`,
    prompt: `Pick the best response in the moment: ${prefix}.`,
    explanation: `One answer should clearly move the mission forward.`,
  }
}

const buildDraftQuestion = (
  type: DraftQuestionType,
  index: number,
  quiz: QuizCatalogItem,
  lesson: LessonCatalogItem,
  input: LessonComposerInput,
  questionId: string,
): QuizQuestionItem => {
  const copy = buildQuestionCopy(type, input.theme, input.emotionalContext, input.practicalGoal, index + 1, input.level)
  const mappedKind = mapQuestionKind(type)
  const category = lesson.category as FilterKey
  const baseOptions = createOptions(input.studentGoal, input.theme)
  const scrambled = ['I', 'need', 'help', 'please', 'now']

  return {
    id: questionId,
    quizId: quiz.id,
    lessonId: lesson.id,
    tag: category,
    kind: mappedKind,
    difficulty: input.level === 'Beginner' ? 'Fácil' : 'Médio',
    kicker: `Missão ${quiz.order}.${index + 1}`,
    title: copy.title,
    prompt: copy.prompt,
    art: quiz.coverArt || lesson.image,
    artAlt: `${input.theme} visual`,
    reward: quiz.reward,
    active: true,
    options: mappedKind === 'ordering' || mappedKind === 'speaking' ? [] : baseOptions,
    correct: mappedKind === 'speaking' || mappedKind === 'ordering' ? '' : baseOptions[0],
    explanation: copy.explanation,
    sentenceBefore: mappedKind === 'drag-fill' ? 'I need' : '',
    sentenceAfter: mappedKind === 'drag-fill' ? 'at the airport.' : '',
    scrambled: mappedKind === 'ordering' ? scrambled : [],
    solution: mappedKind === 'ordering' ? ['I', 'need', 'help', 'now', 'please'] : [],
  }
}

const buildQuestionTypeSequence = (questionMix: QuestionMix): DraftQuestionType[] => {
  const sequence: DraftQuestionType[] = []
  safeQuestionTypes.forEach((type) => {
    const total = Math.max(0, questionMix[type] ?? 0)
    for (let index = 0; index < total; index += 1) sequence.push(type)
  })
  return sequence.length ? sequence : ['multiple-choice', 'drag-fill', 'speaking']
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
  lesson: draft.lesson,
  quizzes: draft.quizzes,
  questions: draft.questions,
})

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
  const mergedInput: LessonComposerInput = { ...templateDefaults[input.template], ...input }
  const category = mapCategory(mergedInput.studentGoal)
  const lessonId = nextId(context.lessonIds, 'LS')
  const draftId = nextId(context.existingDraftIds, 'DR')
  const tone = mapTone(mergedInput.visualStyle)
  const totalQuestions = buildQuestionTypeSequence(mergedInput.questionMix)
  const quizCount = Math.max(1, mergedInput.quizCount)
  const perQuiz = Math.max(1, mergedInput.questionsPerQuiz)
  const quizzes: QuizCatalogItem[] = []
  const questions: QuizQuestionItem[] = []
  const promptsUsed: string[] = []

  const lesson: LessonCatalogItem = {
    id: lessonId,
    category,
    title: buildExperienceName(mergedInput.theme, mergedInput.emotionalContext || mergedInput.studentGoal),
    blurb: `${mergedInput.practicalGoal} • template ${mergedInput.template} • goal ${mergedInput.studentGoal}`,
    image: '/pollinations/airport-card.png',
    tone,
    progress: 0,
  }

  const coverPrompt = `Create one premium ${mergedInput.visualStyle} cover for SparkLingo mission "${mergedInput.theme}" with emotional context "${mergedInput.emotionalContext}", practical goal "${mergedInput.practicalGoal}", clean composition, no text, education-first, premium lilac tone.`

  let questionCursor = 0
  const availableQuizIds = [...context.quizIds]
  const availableQuestionIds = [...context.questionIds]

  for (let quizIndex = 0; quizIndex < quizCount; quizIndex += 1) {
    const quizId = nextId(availableQuizIds, 'QZ', quizIndex + 1)
    availableQuizIds.push(quizId)
    const semanticType: DraftQuestionType = totalQuestions[questionCursor] ?? 'multiple-choice'
    const quiz: QuizCatalogItem = {
      id: quizId,
      lessonId,
      tag: category,
      title: `${mergedInput.theme} • etapa ${quizIndex + 1}`,
      coverArt: lesson.image,
      difficulty: mergedInput.level === 'Beginner' ? 'Fácil' : 'Médio',
      reward: 20 + quizIndex * 5,
      kind: mapQuestionKind(semanticType),
      order: quizIndex + 1,
      active: true,
    }
    quizzes.push(quiz)

    for (let localIndex = 0; localIndex < perQuiz; localIndex += 1) {
      const type: DraftQuestionType = totalQuestions[questionCursor % totalQuestions.length] ?? 'multiple-choice'
      const questionId = nextId(availableQuestionIds, 'QT', questionCursor + 1)
      availableQuestionIds.push(questionId)
      const question = buildDraftQuestion(type, localIndex, quiz, lesson, mergedInput, questionId)
      questions.push(question)
      promptsUsed.push(question.prompt)
      questionCursor += 1
    }
  }

  const xpTotal = questions.reduce((sum, item) => sum + item.reward, 0)
  const skills = Array.from(new Set([
    mergedInput.studentGoal,
    category,
    mergedInput.pedagogicalMode,
  ]))
  const estimatedTokens = Math.max(1800, questions.length * 260 + quizzes.length * 420)
  const estimatedCostUsd = Number((estimatedTokens / 1000000 * 0.45).toFixed(4))

  return sanitizeDraft({
    id: draftId,
    status: 'draft',
    title: `${mergedInput.theme} mission`,
    theme: mergedInput.theme,
    emotionalContext: mergedInput.emotionalContext,
    practicalGoal: mergedInput.practicalGoal,
    level: mergedInput.level,
    template: mergedInput.template,
    studentGoal: mergedInput.studentGoal,
    pedagogicalMode: mergedInput.pedagogicalMode,
    visualStyle: mergedInput.visualStyle,
    questionMix: mergedInput.questionMix,
    skills,
    xpTotal,
    coverPrompt,
    promptsUsed,
    provider: config.provider,
    model: config.primaryModel,
    estimatedTokens,
    estimatedCostUsd,
    lesson,
    quizzes,
    questions,
  })
}

export const regenerateDraftPart = (
  draft: AIDraftRecord,
  mode: PartialRegenerationMode,
  targetQuestionId?: string,
): AIDraftRecord => {
  const updated = structuredClone(draft)

  if (mode === 'cover') {
    updated.coverPrompt = `${draft.coverPrompt} Variation ${Date.now()}.`
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

  return sanitizeDraft(updated)
}

const draftCollection = () => {
  const { db } = requireFirebase()
  return collection(db, 'aiDrafts')
}

export const getAIDrafts = async (): Promise<AIDraftRecord[]> => {
  try {
    const snapshot = await getDocs(query(draftCollection(), orderBy('updatedAt', 'desc')))
    return snapshot.docs.map((item) => sanitizeDraft({
      id: item.id,
      ...(item.data() as Omit<AIDraftRecord, 'id'>),
    }))
  } catch {
    return []
  }
}

export const saveAIDraft = async (draft: AIDraftRecord) => {
  const { db, auth } = requireFirebase()
  const safeDraft = sanitizeDraft(draft)
  await setDoc(doc(db, 'aiDrafts', safeDraft.id), stripUndefinedDeep({
    ...safeDraft,
    createdBy: auth.currentUser?.uid ?? null,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }), { merge: true })
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

  batch.set(doc(db, 'lessons', safeDraft.lesson.id), stripUndefinedDeep({
    ...safeDraft.lesson,
    missionTitle: safeDraft.title,
    emotionalContext: safeDraft.emotionalContext,
    practicalGoal: safeDraft.practicalGoal,
    updatedAt: serverTimestamp(),
  }), { merge: true })

  safeDraft.quizzes.forEach((quiz) => {
    batch.set(doc(db, 'quizzes', quiz.id), stripUndefinedDeep({
      ...quiz,
      updatedAt: serverTimestamp(),
    }), { merge: true })
  })

  safeDraft.questions.forEach((question) => {
    batch.set(doc(db, 'quizQuestions', question.id), stripUndefinedDeep({
      ...question,
      updatedAt: serverTimestamp(),
    }), { merge: true })
  })

  batch.set(doc(db, 'aiDrafts', safeDraft.id), stripUndefinedDeep({
    ...safeDraft,
    status: 'published',
    publishedBy: auth.currentUser?.uid ?? null,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }), { merge: true })

  await batch.commit()
}
