import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type LessonTone = 'sky' | 'violet' | 'mint'
export type FilterKey = 'Todos' | 'Gramática' | 'Vocabulário' | 'Listening' | 'Reading' | 'Speaking'
export type Difficulty = 'Fácil' | 'Médio'
export type ExerciseKind = 'multiple-choice' | 'drag-fill' | 'ordering' | 'listening' | 'speaking'
export type MediaSlotKey =
  | 'heroImageDesktop'
  | 'heroImageMobile'
  | 'mascotImage'
  | 'emotionalBackground'
  | 'thumbnail'
  | 'nodeImage'
  | 'nodeLockedImage'
  | 'nodeCompletedImage'
  | 'scenarioThumbnail'
  | 'emotionalThumbnail'
  | 'challengeIcon'
  | 'challengeCardImage'

export type MediaSlotValue = {
  path: string
  focalPoint?: 'center' | 'top' | 'bottom' | 'left' | 'right'
}

export type MediaSlots = Partial<Record<MediaSlotKey, MediaSlotValue>>

export type LessonCatalogItem = {
  id: string
  category: string
  title: string
  blurb: string
  image: string
  tone: LessonTone
  progress: number
  mediaSlots?: MediaSlots
  missionTitle?: string
  emotionalContext?: string
  practicalGoal?: string
  tensionLabel?: string
  urgencyNote?: string
  emotionalGoal?: string
  confidenceTarget?: string
  nextMissionHook?: string
  journeyArc?: string[]
}

export type QuizCatalogItem = {
  id: string
  lessonId: string
  tag: FilterKey
  title: string
  coverArt?: string
  mediaSlots?: MediaSlots
  objective?: string
  storyBeat?: string
  difficulty: Difficulty
  reward: number
  kind: ExerciseKind
  order: number
  active: boolean
}

export type QuizQuestionItem = {
  id: string
  quizId: string
  lessonId: string
  tag: FilterKey
  kind: ExerciseKind
  difficulty: Difficulty
  kicker: string
  title: string
  prompt: string
  art: string
  artAlt: string
  reward: number
  active: boolean
  mediaSlots?: MediaSlots
  contextCue?: string
  options?: string[]
  correct?: string
  explanation: string
  sentenceBefore?: string
  sentenceAfter?: string
  scrambled?: string[]
  solution?: string[]
}

export type AchievementCatalogItem = {
  id: string
  title: string
  icon: 'headphones' | 'star' | 'target'
  description: string
  xpReward: number
}

const mediaSlotKeys: MediaSlotKey[] = [
  'heroImageDesktop',
  'heroImageMobile',
  'mascotImage',
  'emotionalBackground',
  'thumbnail',
  'nodeImage',
  'nodeLockedImage',
  'nodeCompletedImage',
  'scenarioThumbnail',
  'emotionalThumbnail',
  'challengeIcon',
  'challengeCardImage',
]

const assetLibrary = {
  mascot: '/Images/Mascote/Sparklingo.png',
  airport: {
    heroDesktop: '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png',
    heroMobile: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    thumbnail: '/Images/Airport/checkin.png',
    checkpoint: '/Images/Airport/departures.png',
    waiting: '/Images/Airport/sparklingo_asset_airport_waiting_scene_mobile_v1.png',
  },
  coffee: {
    order: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    pay: '/Images/CoffeeShop/sparklingo_scene_pay_ordering_mobile_v1.png',
    take: '/Images/CoffeeShop/sparklingo_scene_take_coffee_mobile_v1.png',
    window: '/Images/CoffeeShop/sparklingo_scene_take_coffee_window_mobile_v1.png',
    write: '/Images/CoffeeShop/sparklingo_scene_writing_coffee_mobile_v1.png',
    account: '/Images/CoffeeShop/sparklingo_scene_checking_account_mobile_v1.png',
  },
  park: {
    enjoy: '/Images/Park/sparklingo_scene_enjoy_park_mobile_v1.png',
    coffee: '/Images/Park/sparklingo_scene_park_coffee_mobile_v1.png',
    iceCream: '/Images/Park/sparklingo_scene_park_icecream_mobile_v1.png',
    dropped: '/Images/Park/fox_in_the_park_dropped_ice_cream.png',
    draw: '/Images/Park/fox_in_the_park_draw.png',
  },
}

const lessonMediaFallbacks: Record<string, MediaSlots> = {
  'lesson-airport': {
    heroImageDesktop: { path: assetLibrary.airport.heroDesktop },
    heroImageMobile: { path: assetLibrary.airport.heroMobile },
    emotionalBackground: { path: assetLibrary.airport.heroDesktop },
    mascotImage: { path: assetLibrary.mascot },
    thumbnail: { path: assetLibrary.airport.thumbnail },
    nodeImage: { path: assetLibrary.airport.checkpoint },
    nodeCompletedImage: { path: assetLibrary.airport.thumbnail },
    nodeLockedImage: { path: assetLibrary.airport.waiting },
  },
  'lesson-present-simple': {
    thumbnail: { path: assetLibrary.coffee.write },
    nodeImage: { path: assetLibrary.coffee.order },
    nodeCompletedImage: { path: assetLibrary.coffee.take },
    nodeLockedImage: { path: assetLibrary.coffee.account },
  },
  'lesson-daily-routines': {
    thumbnail: { path: assetLibrary.park.enjoy },
    nodeImage: { path: assetLibrary.park.coffee },
    nodeCompletedImage: { path: assetLibrary.park.iceCream },
    nodeLockedImage: { path: assetLibrary.park.draw },
  },
}

const quizMediaFallbacks: Record<string, MediaSlots> = {
  q1: {
    challengeCardImage: { path: assetLibrary.coffee.write },
    challengeIcon: { path: assetLibrary.coffee.write },
  },
  q2: {
    challengeCardImage: { path: assetLibrary.airport.waiting },
    scenarioThumbnail: { path: assetLibrary.airport.heroMobile },
  },
  q3: {
    challengeCardImage: { path: assetLibrary.park.enjoy },
    challengeIcon: { path: assetLibrary.park.draw },
  },
  q4: {
    challengeCardImage: { path: assetLibrary.park.dropped },
    scenarioThumbnail: { path: assetLibrary.park.dropped },
  },
  q5: {
    challengeCardImage: { path: assetLibrary.airport.thumbnail },
    challengeIcon: { path: assetLibrary.airport.thumbnail },
  },
  q6: {
    challengeCardImage: { path: assetLibrary.coffee.order },
    challengeIcon: { path: assetLibrary.coffee.pay },
  },
}

const questionMediaFallbacks: Record<string, MediaSlots> = {
  q1: {
    scenarioThumbnail: { path: assetLibrary.coffee.write },
    challengeIcon: { path: assetLibrary.coffee.order },
  },
  q2: {
    scenarioThumbnail: { path: assetLibrary.airport.heroMobile },
    emotionalThumbnail: { path: assetLibrary.airport.waiting },
  },
  q3: {
    scenarioThumbnail: { path: assetLibrary.park.enjoy },
    emotionalThumbnail: { path: assetLibrary.park.coffee },
  },
  q4: {
    scenarioThumbnail: { path: assetLibrary.park.dropped },
  },
  q5: {
    scenarioThumbnail: { path: assetLibrary.airport.thumbnail },
    challengeIcon: { path: assetLibrary.airport.thumbnail },
  },
  q6: {
    emotionalThumbnail: { path: assetLibrary.coffee.order },
  },
}

const cleanString = (value: unknown) => (typeof value === 'string' ? value : '')
const cleanNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const cleanBoolean = (value: unknown, fallback = true) => (typeof value === 'boolean' ? value : fallback)
const cleanStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
const cleanMediaSlots = (value: unknown): MediaSlots => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.entries(value as Record<string, unknown>).reduce<MediaSlots>((acc, [key, item]) => {
    if (!mediaSlotKeys.includes(key as MediaSlotKey)) return acc

    const path =
      typeof item === 'string'
        ? item
        : item && typeof item === 'object' && typeof (item as { path?: unknown }).path === 'string'
          ? (item as { path: string }).path
          : ''

    if (!path) return acc

    const focalPoint =
      item && typeof item === 'object' && typeof (item as { focalPoint?: unknown }).focalPoint === 'string'
        ? (item as { focalPoint: MediaSlotValue['focalPoint'] }).focalPoint
        : undefined

    acc[key as MediaSlotKey] = { path, focalPoint }
    return acc
  }, {})
}

const stripUndefined = <T extends Record<string, unknown>>(payload: T) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))

const isLegacyAsset = (value: string) => !value || value.startsWith('/pollinations/')
const preferCurrentAsset = (value: string, fallback: string) => (isLegacyAsset(value) ? fallback : value)

const mergeMediaSlotsWithFallback = (incoming: MediaSlots, fallback: MediaSlots): MediaSlots =>
  mediaSlotKeys.reduce<MediaSlots>((acc, key) => {
    const current = incoming[key]
    const fallbackSlot = fallback[key]

    if (current?.path && !isLegacyAsset(current.path)) {
      acc[key] = current
      return acc
    }

    if (fallbackSlot?.path) {
      acc[key] = fallbackSlot
    } else if (current?.path) {
      acc[key] = current
    }

    return acc
  }, {})

const sanitizeLesson = (lesson: LessonCatalogItem): LessonCatalogItem => {
  const id = cleanString(lesson.id)
  const fallbackSlots = lessonMediaFallbacks[id] ?? {}

  return {
    id,
    category: cleanString(lesson.category),
    title: cleanString(lesson.title),
    blurb: cleanString(lesson.blurb),
    image: preferCurrentAsset(cleanString(lesson.image), fallbackSlots.thumbnail?.path ?? assetLibrary.airport.thumbnail),
    tone: ['sky', 'violet', 'mint'].includes(lesson.tone) ? lesson.tone : 'sky',
    progress: cleanNumber(lesson.progress),
    mediaSlots: mergeMediaSlotsWithFallback(cleanMediaSlots(lesson.mediaSlots), fallbackSlots),
    missionTitle: cleanString(lesson.missionTitle),
    emotionalContext: cleanString(lesson.emotionalContext),
    practicalGoal: cleanString(lesson.practicalGoal),
    tensionLabel: cleanString(lesson.tensionLabel),
    urgencyNote: cleanString(lesson.urgencyNote),
    emotionalGoal: cleanString(lesson.emotionalGoal),
    confidenceTarget: cleanString(lesson.confidenceTarget),
    nextMissionHook: cleanString(lesson.nextMissionHook),
    journeyArc: cleanStringArray(lesson.journeyArc),
  }
}

const sanitizeQuiz = (quiz: QuizCatalogItem): QuizCatalogItem => {
  const id = cleanString(quiz.id)
  const fallbackSlots = quizMediaFallbacks[id] ?? {}

  return {
    id,
    lessonId: cleanString(quiz.lessonId),
    tag: quiz.tag,
    title: cleanString(quiz.title),
    coverArt: preferCurrentAsset(cleanString(quiz.coverArt), fallbackSlots.challengeCardImage?.path ?? assetLibrary.airport.thumbnail),
    mediaSlots: mergeMediaSlotsWithFallback(cleanMediaSlots(quiz.mediaSlots), fallbackSlots),
    objective: cleanString(quiz.objective),
    storyBeat: cleanString(quiz.storyBeat),
    difficulty: quiz.difficulty ?? 'Fácil',
    reward: cleanNumber(quiz.reward, 25),
    kind: ['multiple-choice', 'drag-fill', 'ordering', 'listening', 'speaking'].includes(quiz.kind) ? quiz.kind : 'multiple-choice',
    order: cleanNumber(quiz.order, 1),
    active: cleanBoolean(quiz.active, true),
  }
}

const sanitizeQuestion = (question: QuizQuestionItem): QuizQuestionItem => {
  const id = cleanString(question.id)
  const kind = ['multiple-choice', 'drag-fill', 'ordering', 'listening', 'speaking'].includes(question.kind)
    ? question.kind
    : 'multiple-choice'
  const fallbackSlots = questionMediaFallbacks[id] ?? {}

  return {
    id,
    quizId: cleanString(question.quizId),
    lessonId: cleanString(question.lessonId),
    tag: question.tag,
    kind,
    difficulty: question.difficulty ?? 'Fácil',
    kicker: cleanString(question.kicker),
    title: cleanString(question.title),
    prompt: cleanString(question.prompt),
    art: preferCurrentAsset(cleanString(question.art), fallbackSlots.scenarioThumbnail?.path ?? assetLibrary.airport.thumbnail),
    artAlt: cleanString(question.artAlt),
    reward: cleanNumber(question.reward, 25),
    active: cleanBoolean(question.active, true),
    mediaSlots: mergeMediaSlotsWithFallback(cleanMediaSlots(question.mediaSlots), fallbackSlots),
    contextCue: cleanString(question.contextCue),
    options: ['multiple-choice', 'drag-fill', 'listening'].includes(kind) ? cleanStringArray(question.options) : [],
    correct: kind === 'ordering' ? '' : cleanString(question.correct),
    explanation: cleanString(question.explanation),
    sentenceBefore: kind === 'drag-fill' ? cleanString(question.sentenceBefore) : '',
    sentenceAfter: kind === 'drag-fill' ? cleanString(question.sentenceAfter) : '',
    scrambled: kind === 'ordering' ? cleanStringArray(question.scrambled) : [],
    solution: kind === 'ordering' ? cleanStringArray(question.solution) : [],
  }
}

const sanitizeAchievement = (achievement: AchievementCatalogItem): AchievementCatalogItem => ({
  id: cleanString(achievement.id),
  title: cleanString(achievement.title),
  icon: ['headphones', 'star', 'target'].includes(achievement.icon) ? achievement.icon : 'star',
  description: cleanString(achievement.description),
  xpReward: cleanNumber(achievement.xpReward, 20),
})

export const defaultLessonsCatalog: LessonCatalogItem[] = [
  {
    id: 'lesson-airport',
    category: 'Vocabulário',
    title: 'At the Airport',
    blurb: 'Palavras visuais, objetos reais e micro-histórias para memorizar sem esforço.',
    image: assetLibrary.airport.thumbnail,
    tone: 'sky',
    progress: 60,
    mediaSlots: lessonMediaFallbacks['lesson-airport'],
    missionTitle: 'Airport survival',
    emotionalContext: 'You missed your flight in London.',
    practicalGoal: 'Pedir ajuda e entender o próximo passo no aeroporto.',
    tensionLabel: 'Urgência moderada',
    urgencyNote: 'Você precisa reagir antes de perder a conexão.',
    emotionalGoal: 'Trocar hesitação por ação rápida.',
    confidenceTarget: 'Falar uma frase útil com segurança.',
    nextMissionHook: 'Depois do aeroporto, o próximo passo é chegar ao hotel.',
    journeyArc: ['Arriving in London', 'Airport survival', 'Hotel check-in', 'Restaurant interaction'],
  },
  {
    id: 'lesson-present-simple',
    category: 'Gramática',
    title: 'Present Simple',
    blurb: 'Regra rápida, exemplos vivos e desafios curtos que fixam o padrão.',
    image: assetLibrary.coffee.write,
    tone: 'violet',
    progress: 40,
    mediaSlots: lessonMediaFallbacks['lesson-present-simple'],
    missionTitle: 'Daily routine briefing',
    emotionalContext: 'Você precisa explicar sua rotina em uma reunião rápida.',
    practicalGoal: 'Usar present simple com fluidez em contexto prático.',
    tensionLabel: 'Pressão leve',
    urgencyNote: 'Você precisa soar claro e confiante em pouco tempo.',
    emotionalGoal: 'Transformar regra em fala natural.',
    confidenceTarget: 'Responder sem travar na estrutura.',
    nextMissionHook: 'Depois disso, você entra em uma conversa mais espontânea.',
    journeyArc: ['Short intro', 'Daily routine briefing', 'Meeting check-in', 'Client follow-up'],
  },
  {
    id: 'lesson-daily-routines',
    category: 'Listening',
    title: 'Daily Routines',
    blurb: 'Áudios curtos e repetição inteligente para treinar ouvido e confiança.',
    image: assetLibrary.park.enjoy,
    tone: 'mint',
    progress: 20,
    mediaSlots: lessonMediaFallbacks['lesson-daily-routines'],
    missionTitle: 'Catch the clue',
    emotionalContext: 'Você ouviu uma instrução rápida e precisa agir sem repetir tudo.',
    practicalGoal: 'Entender a pista principal de áudios curtos.',
    tensionLabel: 'Atenção ativa',
    urgencyNote: 'A mensagem passa rápido e você precisa captar o essencial.',
    emotionalGoal: 'Reduzir medo de listening com pistas claras.',
    confidenceTarget: 'Entender o suficiente para seguir a cena.',
    nextMissionHook: 'Depois do áudio, a missão vira resposta prática.',
    journeyArc: ['Short audio', 'Catch the clue', 'Follow the direction', 'Respond in context'],
  },
]

export const defaultQuizCatalog: QuizCatalogItem[] = [
  {
    id: 'q1',
    lessonId: 'lesson-present-simple',
    tag: 'Gramática',
    title: 'Forma correta',
    coverArt: assetLibrary.coffee.write,
    mediaSlots: quizMediaFallbacks.q1,
    objective: 'Responder com clareza em frases simples do dia a dia.',
    storyBeat: 'You need to explain your routine clearly.',
    difficulty: 'Fácil',
    reward: 25,
    kind: 'multiple-choice',
    order: 1,
    active: true,
  },
  {
    id: 'q2',
    lessonId: 'lesson-airport',
    tag: 'Vocabulário',
    title: 'Complete a frase',
    coverArt: assetLibrary.airport.waiting,
    mediaSlots: quizMediaFallbacks.q2,
    objective: 'Pedir ajuda rapidamente quando a cena muda de rumo.',
    storyBeat: 'Your gate changed and you need help fast.',
    difficulty: 'Médio',
    reward: 35,
    kind: 'drag-fill',
    order: 2,
    active: true,
  },
  {
    id: 'q3',
    lessonId: 'lesson-daily-routines',
    tag: 'Listening',
    title: 'What did you hear?',
    coverArt: assetLibrary.park.enjoy,
    mediaSlots: quizMediaFallbacks.q3,
    objective: 'Captar a pista principal antes da cena avançar.',
    storyBeat: 'You hear a clue and need to react.',
    difficulty: 'Fácil',
    reward: 30,
    kind: 'multiple-choice',
    order: 3,
    active: true,
  },
  {
    id: 'q4',
    lessonId: 'lesson-present-simple',
    tag: 'Reading',
    title: 'Futuro com if',
    coverArt: assetLibrary.park.dropped,
    mediaSlots: quizMediaFallbacks.q4,
    objective: 'Entender condição e resposta em uma cena leve.',
    storyBeat: 'A small problem changes what happens next.',
    difficulty: 'Médio',
    reward: 35,
    kind: 'multiple-choice',
    order: 4,
    active: true,
  },
  {
    id: 'q5',
    lessonId: 'lesson-present-simple',
    tag: 'Speaking',
    title: 'Monte a frase',
    coverArt: assetLibrary.airport.thumbnail,
    mediaSlots: quizMediaFallbacks.q5,
    objective: 'Montar uma resposta curta sem travar.',
    storyBeat: 'You need to speak before hesitation wins.',
    difficulty: 'Médio',
    reward: 40,
    kind: 'ordering',
    order: 5,
    active: true,
  },
  {
    id: 'q6',
    lessonId: 'lesson-airport',
    tag: 'Vocabulário',
    title: 'Happy means...',
    coverArt: assetLibrary.coffee.order,
    mediaSlots: quizMediaFallbacks.q6,
    objective: 'Consolidar vocabulário útil em contexto curto.',
    storyBeat: 'A quick meaning check keeps the mission moving.',
    difficulty: 'Fácil',
    reward: 30,
    kind: 'multiple-choice',
    order: 6,
    active: true,
  },
]

export const defaultQuizQuestions: QuizQuestionItem[] = [
  {
    id: 'q1',
    quizId: 'q1',
    lessonId: 'lesson-present-simple',
    tag: 'Gramática',
    kind: 'multiple-choice',
    difficulty: 'Fácil',
    kicker: '1. Múltipla escolha',
    title: 'Forma correta',
    prompt: 'What is the correct form?',
    art: assetLibrary.coffee.write,
    artAlt: 'Ilustração cinematográfica de alguém escrevendo uma resposta curta.',
    mediaSlots: questionMediaFallbacks.q1,
    options: ['go', 'goes', 'going', 'gone'],
    correct: 'goes',
    explanation: 'Com he, she e it, usamos o verbo no present simple com “s”.',
    reward: 25,
    active: true,
  },
  {
    id: 'q2',
    quizId: 'q2',
    lessonId: 'lesson-airport',
    tag: 'Vocabulário',
    kind: 'drag-fill',
    difficulty: 'Médio',
    kicker: '2. Arraste e solte',
    title: 'Complete a frase',
    prompt: 'Complete the sentence.',
    art: assetLibrary.airport.heroMobile,
    artAlt: 'Cena do aeroporto com foco na continuidade da missão.',
    mediaSlots: questionMediaFallbacks.q2,
    options: ['ask', 'asking', 'to ask', 'asked'],
    correct: 'asking',
    explanation: 'Depois de “keep”, o verbo costuma aparecer no gerúndio quando a ação continua.',
    sentenceBefore: 'I keep',
    sentenceAfter: 'for help at the gate.',
    reward: 35,
    active: true,
  },
  {
    id: 'q3',
    quizId: 'q3',
    lessonId: 'lesson-daily-routines',
    tag: 'Listening',
    kind: 'multiple-choice',
    difficulty: 'Fácil',
    kicker: '3. Ouça e escolha',
    title: 'What did you hear?',
    prompt: 'Listen to the audio and choose the answer.',
    art: assetLibrary.park.enjoy,
    artAlt: 'Cena leve de parque usada para um desafio de escuta curta.',
    mediaSlots: questionMediaFallbacks.q3,
    options: ['It is a cat.', 'It is a dog.', 'It is a bird.'],
    correct: 'It is a dog.',
    explanation: 'O áudio desta demo é ilustrativo, mas o estado da questão já responde como produto real.',
    reward: 30,
    active: true,
  },
  {
    id: 'q4',
    quizId: 'q4',
    lessonId: 'lesson-present-simple',
    tag: 'Reading',
    kind: 'multiple-choice',
    difficulty: 'Médio',
    kicker: '4. Complete com a palavra correta',
    title: 'Futuro com if',
    prompt: 'Fill in the blanks with the correct word.',
    art: assetLibrary.park.dropped,
    artAlt: 'Cena emocional curta com urgência leve.',
    mediaSlots: questionMediaFallbacks.q4,
    options: ['will stay', 'stay', 'stayed', 'stays'],
    correct: 'will stay',
    explanation: 'Em frases com if no presente, a oração principal costuma usar will.',
    reward: 35,
    active: true,
  },
  {
    id: 'q5',
    quizId: 'q5',
    lessonId: 'lesson-present-simple',
    tag: 'Speaking',
    kind: 'ordering',
    difficulty: 'Médio',
    kicker: '5. Ordene as palavras',
    title: 'Monte a frase',
    prompt: 'Put the words in the correct order.',
    art: assetLibrary.airport.thumbnail,
    artAlt: 'Cena de aeroporto usada como apoio visual para construção de frase.',
    mediaSlots: questionMediaFallbacks.q5,
    scrambled: ['you', 'Where', 'are', 'from', '?'],
    solution: ['Where', 'are', 'you', 'from', '?'],
    explanation: 'Em perguntas com o verbo to be, a ordem correta é interrogativo + verbo + sujeito.',
    reward: 40,
    active: true,
  },
  {
    id: 'q6',
    quizId: 'q6',
    lessonId: 'lesson-airport',
    tag: 'Vocabulário',
    kind: 'multiple-choice',
    difficulty: 'Fácil',
    kicker: '6. Encontre o par',
    title: 'Happy means...',
    prompt: 'Match the word to its meaning.',
    art: assetLibrary.coffee.order,
    artAlt: 'Cena de cafeteria usada como thumbnail emocional da situação.',
    mediaSlots: questionMediaFallbacks.q6,
    options: ['Grande', 'Rápido', 'Bonito', 'Feliz'],
    correct: 'Feliz',
    explanation: 'Aqui a ideia é consolidar vocabulário com feedback instantâneo.',
    reward: 30,
    active: true,
  },
]

export const defaultAchievementCatalog: AchievementCatalogItem[] = [
  { id: 'achievement-audio', title: 'Audio streak', icon: 'headphones', description: 'Complete 3 desafios de áudio.', xpReward: 20 },
  { id: 'achievement-star', title: 'Perfect combo', icon: 'star', description: 'Acerte 5 exercícios em sequência.', xpReward: 30 },
  { id: 'achievement-target', title: 'Mission focus', icon: 'target', description: 'Conclua uma sessão inteira sem sair da run.', xpReward: 25 },
]

const getCollectionDocs = async <T>(path: string, fallback: T[]) => {
  try {
    const { db } = requireFirebase()
    const snapshot = await getDocs(collection(db, path))
    if (snapshot.empty) return fallback

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Omit<T, 'id'>),
    })) as T[]
  } catch {
    return fallback
  }
}

const upsertCatalogDoc = async (collectionName: string, id: string, payload: DocumentData) => {
  const { db } = requireFirebase()
  await setDoc(
    doc(db, collectionName, id),
    {
      ...stripUndefined(payload),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export const getLessonsCatalog = () => getCollectionDocs<LessonCatalogItem>('lessons', defaultLessonsCatalog)
export const getQuizCatalog = () => getCollectionDocs<QuizCatalogItem>('quizzes', defaultQuizCatalog)
export const getQuizQuestions = () => getCollectionDocs<QuizQuestionItem>('quizQuestions', defaultQuizQuestions)
export const getAchievementCatalog = () => getCollectionDocs<AchievementCatalogItem>('achievements', defaultAchievementCatalog)

export const upsertLesson = async (lesson: LessonCatalogItem) => {
  const safeLesson = sanitizeLesson(lesson)
  await upsertCatalogDoc('lessons', safeLesson.id, safeLesson)
}

export const upsertQuiz = async (quiz: QuizCatalogItem) => {
  const safeQuiz = sanitizeQuiz(quiz)
  await upsertCatalogDoc('quizzes', safeQuiz.id, safeQuiz)
}

export const upsertQuizQuestion = async (question: QuizQuestionItem) => {
  const safeQuestion = sanitizeQuestion(question)
  await upsertCatalogDoc('quizQuestions', safeQuestion.id, safeQuestion)
}

export const upsertAchievement = async (achievement: AchievementCatalogItem) => {
  const safeAchievement = sanitizeAchievement(achievement)
  await upsertCatalogDoc('achievements', safeAchievement.id, safeAchievement)
}

export const deleteLesson = async (lessonId: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'lessons', lessonId))
}

export const deleteQuiz = async (quizId: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'quizzes', quizId))
}

export const deleteQuizQuestion = async (questionId: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'quizQuestions', questionId))
}

export const deleteAchievement = async (achievementId: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'achievements', achievementId))
}

export const seedDefaultCatalog = async () => {
  const { db } = requireFirebase()
  const batch = writeBatch(db)

  defaultLessonsCatalog.forEach((lesson) => {
    const safeLesson = sanitizeLesson(lesson)
    batch.set(doc(db, 'lessons', safeLesson.id), { ...safeLesson, seededAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  })

  defaultQuizCatalog.forEach((quiz) => {
    const safeQuiz = sanitizeQuiz(quiz)
    batch.set(doc(db, 'quizzes', safeQuiz.id), { ...safeQuiz, seededAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  })

  defaultQuizQuestions.forEach((question) => {
    const safeQuestion = sanitizeQuestion(question)
    batch.set(doc(db, 'quizQuestions', safeQuestion.id), { ...safeQuestion, seededAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  })

  defaultAchievementCatalog.forEach((achievement) => {
    const safeAchievement = sanitizeAchievement(achievement)
    batch.set(doc(db, 'achievements', safeAchievement.id), { ...safeAchievement, seededAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  })

  await batch.commit()
}
