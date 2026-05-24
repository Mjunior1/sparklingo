import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminScreen } from './admin/AdminScreen'
import { AuthEntry } from './auth/AuthEntry'
import { useAuth } from './auth/AuthProvider'
import { OnboardingScreen } from './auth/OnboardingScreen'
import {
  defaultLessonsCatalog,
  defaultQuizCatalog,
  defaultQuizQuestions,
  getAchievementCatalog,
  getLessonsCatalog,
  getQuizCatalog,
  getQuizQuestions,
  type AchievementCatalogItem,
  type LessonCatalogItem,
  type MediaSlotKey,
  type MediaSlots,
  type QuizCatalogItem,
  type QuizQuestionItem,
} from './services/catalog'
import { trackProductEvent } from './services/events'
import { getLessonProgressMap, saveLessonProgressMap, type LessonProgressMap } from './services/lessonProgress'
import { saveQuizProgress } from './services/quizProgress'
import { getWeeklyRanking, type LeaderboardEntry } from './services/ranking'
import { getUserProgress, saveUserProgress, type UserProgress } from './services/progress'
import { saveSkillProgress } from './services/skillProgress'
import { completeStudySession, startStudySession } from './services/studySessions'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Flame,
  Gamepad2,
  Grip,
  Headphones,
  Heart,
  Home,
  Map,
  Medal,
  Mic,
  Sparkles,
  UserRound,
  Volume2,
  Zap,
} from 'lucide-react'

type FilterKey = 'Todos' | 'Gramática' | 'Vocabulário' | 'Listening' | 'Reading' | 'Speaking'
type Difficulty = 'Fácil' | 'Médio'

type MultipleChoiceExercise = {
  id: string
  kind: 'multiple-choice'
  tag: FilterKey
  difficulty: Difficulty
  kicker: string
  title: string
  prompt: string
  art: string
  artAlt: string
  options: string[]
  correct: string
  explanation: string
  reward: number
}

type ListeningExercise = Omit<MultipleChoiceExercise, 'kind'> & {
  kind: 'listening'
}

type DragFillExercise = {
  id: string
  kind: 'drag-fill'
  tag: FilterKey
  difficulty: Difficulty
  kicker: string
  title: string
  prompt: string
  sentenceBefore: string
  sentenceAfter: string
  art: string
  artAlt: string
  options: string[]
  correct: string
  explanation: string
  reward: number
}

type OrderingExercise = {
  id: string
  kind: 'ordering'
  tag: FilterKey
  difficulty: Difficulty
  kicker: string
  title: string
  prompt: string
  art: string
  artAlt: string
  scrambled: string[]
  solution: string[]
  explanation: string
  reward: number
}

type SpeakingExercise = {
  id: string
  kind: 'speaking'
  tag: FilterKey
  difficulty: Difficulty
  kicker: string
  title: string
  prompt: string
  art: string
  artAlt: string
  explanation: string
  reward: number
  contextCue?: string
}

type Exercise = MultipleChoiceExercise | ListeningExercise | DragFillExercise | OrderingExercise | SpeakingExercise
type MascotMood = 'guide' | 'cheer' | 'oops' | 'streak'
type ActiveReaction = {
  exerciseId: Exercise['id']
  kind: 'success' | 'error'
  label: string
}

type EmotionalPulse = {
  confidence: number
  fluency: number
  hesitation: number
  emotionalStreak: number
  speakingConfidence: number
  listeningConfidence: number
  reviewPressure: number
  averageResponseMs: number
  favoriteModes: string[]
  weakSkills: string[]
  recurringErrors: string[]
}

type SyncState = 'idle' | 'saving' | 'saved' | 'error'

const lessonCards: LessonCatalogItem[] = defaultLessonsCatalog

const exercises: Exercise[] = [
  {
    id: 'q1',
    kind: 'multiple-choice',
    tag: 'Gramática',
    difficulty: 'Fácil',
    kicker: '1. Múltipla escolha',
    title: 'Forma correta',
    prompt: 'What is the correct form?',
    art: '/pollinations/airport-card.png',
    artAlt: 'Ilustração colorida de cenário escolar',
    options: ['go', 'goes', 'going', 'gone'],
    correct: 'goes',
    explanation: 'Com he, she e it, usamos o verbo no present simple com "s".',
    reward: 25,
  },
  {
    id: 'q2',
    kind: 'drag-fill',
    tag: 'Vocabulário',
    difficulty: 'Médio',
    kicker: '2. Arraste e solte',
    title: 'Complete a frase',
    prompt: 'Complete the sentence.',
    sentenceBefore: 'I enjoy',
    sentenceAfter: 'in the mountains.',
    art: '/pollinations/mountain-card.png',
    artAlt: 'Ilustração vibrante de montanhas',
    options: ['swim', 'to swim', 'swimming', 'swam'],
    correct: 'swimming',
    explanation: 'Depois de "enjoy", o verbo costuma ficar no gerúndio.',
    reward: 35,
  },
  {
    id: 'q3',
    kind: 'multiple-choice',
    tag: 'Listening',
    difficulty: 'Fácil',
    kicker: '3. Ouça e escolha',
    title: 'What did you hear?',
    prompt: 'Listen to the audio and choose the answer.',
    art: '/pollinations/dog-card.png',
    artAlt: 'Cachorro cartunesco com fones de ouvido',
    options: ['It is a cat.', 'It is a dog.', 'It is a bird.'],
    correct: 'It is a dog.',
    explanation: 'O áudio desta demo é ilustrativo, mas o estado da questão já responde como produto real.',
    reward: 30,
  },
  {
    id: 'q4',
    kind: 'multiple-choice',
    tag: 'Reading',
    difficulty: 'Médio',
    kicker: '4. Complete com a palavra correta',
    title: 'Futuro com if',
    prompt: 'Fill in the blanks with the correct word.',
    art: '/pollinations/storm-card.png',
    artAlt: 'Nuvem estilizada com relâmpago',
    options: ['will stay', 'stay', 'stayed', 'stays'],
    correct: 'will stay',
    explanation: 'Em frases com if no presente, a oração principal costuma usar will.',
    reward: 35,
  },
  {
    id: 'q5',
    kind: 'ordering',
    tag: 'Speaking',
    difficulty: 'Médio',
    kicker: '5. Ordene as palavras',
    title: 'Monte a frase',
    prompt: 'Put the words in the correct order.',
    art: '/pollinations/grammar-card.png',
    artAlt: 'Caderno e lápis estilizados',
    scrambled: ['you', 'Where', 'are', 'from', '?'],
    solution: ['Where', 'are', 'you', 'from', '?'],
    explanation: 'Em perguntas com o verbo to be, a ordem correta é interrogativo + verbo + sujeito.',
    reward: 40,
  },
  {
    id: 'q6',
    kind: 'multiple-choice',
    tag: 'Vocabulário',
    difficulty: 'Fácil',
    kicker: '6. Encontre o par',
    title: 'Happy means...',
    prompt: 'Match the word to its meaning.',
    art: '/pollinations/listening-card.png',
    artAlt: 'Headphone brilhante em fundo azul',
    options: ['Grande', 'Rápido', 'Bonito', 'Feliz'],
    correct: 'Feliz',
    explanation: 'Aqui a ideia é consolidar vocabulário com feedback instantâneo.',
    reward: 30,
  },
]

const storyMedia = {
  mascot: '/Images/Mascote/Sparklingo.png',
  airport: {
    hero: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    immigration: '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png',
    checkin: '/Images/Airport/checkin.png',
    departures: '/Images/Airport/departures.png',
    waiting: '/Images/Airport/sparklingo_asset_airport_waiting_scene_mobile_v1.png',
  },
  coffee: {
    checking: '/Images/CoffeeShop/sparklingo_scene_checking_account_mobile_v1.png',
    ordering: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    pay: '/Images/CoffeeShop/sparklingo_scene_pay_ordering_mobile_v1.png',
    take: '/Images/CoffeeShop/sparklingo_scene_take_coffee_mobile_v1.png',
    takeTwo: '/Images/CoffeeShop/sparklingo_scene_take_coffee_2_mobile_v1.png',
    window: '/Images/CoffeeShop/sparklingo_scene_take_coffee_window_mobile_v1.png',
    writing: '/Images/CoffeeShop/sparklingo_scene_writing_coffee_mobile_v1.png',
  },
  park: {
    draw: '/Images/Park/fox_in_the_park_draw.png',
    dropped: '/Images/Park/fox_in_the_park_dropped_ice_cream.png',
    enjoy: '/Images/Park/sparklingo_scene_enjoy_park_mobile_v1.png',
    coffee: '/Images/Park/sparklingo_scene_park_coffee_mobile_v1.png',
    iceCream: '/Images/Park/sparklingo_scene_park_icecream_mobile_v1.png',
  },
}

const normalizeScenePath = (path: string | undefined, fallback: string) => {
  if (!path) return fallback

  const normalized = path
    .replace('/Images/coffee shop/', '/Images/CoffeeShop/')
    .replace('/Images/coffee%20shop/', '/Images/CoffeeShop/')

  return normalized || fallback
}

const normalizeTokenOrder = (words: string[]) => words.map((word) => word.toLowerCase()).join('|')
const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)))
const normalizeForSignature = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => normalizeForSignature(item))
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForSignature((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}
const buildSignature = (value: unknown) => JSON.stringify(normalizeForSignature(value))

const fallbackLeaderboard: LeaderboardEntry[] = [
  { name: 'Kate', xp: '1250 XP' },
  { name: 'You', xp: '980 XP', highlighted: true },
  { name: 'Mark', xp: '870 XP' },
  { name: 'Sam', xp: '690 XP' },
]

const skillByTag: Record<Exclude<FilterKey, 'Todos'>, string> = {
  'Gramática': 'grammar',
  'Vocabulário': 'vocabulary',
  Listening: 'listening',
  Reading: 'reading',
  Speaking: 'speaking',
}

const toRuntimeExercises = (questions: QuizQuestionItem[], quizzes: QuizCatalogItem[]): Exercise[] => {
  const mapped = questions
    .filter((question) => question.active)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .flatMap<Exercise>((question) => {
      const linkedQuiz = quizzes.find((quiz) => quiz.id === question.quizId)
      const art =
        getFirstSlotPath(question.mediaSlots, ['scenarioThumbnail', 'emotionalThumbnail', 'challengeCardImage'], '') ||
        getFirstSlotPath(linkedQuiz?.mediaSlots, ['challengeCardImage', 'scenarioThumbnail', 'emotionalThumbnail'], '') ||
        linkedQuiz?.coverArt ||
        question.art

      if (question.kind === 'multiple-choice' && question.options?.length && question.correct) {
        return [{
          id: question.id as MultipleChoiceExercise['id'],
          kind: 'multiple-choice',
          tag: question.tag,
          difficulty: question.difficulty,
          kicker: question.kicker,
          title: question.title,
          prompt: question.prompt,
          art,
          artAlt: question.artAlt,
          options: question.options,
          correct: question.correct,
          explanation: question.explanation,
          reward: question.reward,
        }]
      }

      if (question.kind === 'drag-fill' && question.options?.length && question.correct) {
        return [{
          id: question.id as DragFillExercise['id'],
          kind: 'drag-fill',
          tag: question.tag,
          difficulty: question.difficulty,
          kicker: question.kicker,
          title: question.title,
          prompt: question.prompt,
          sentenceBefore: question.sentenceBefore ?? '',
          sentenceAfter: question.sentenceAfter ?? '',
          art,
          artAlt: question.artAlt,
          options: question.options,
          correct: question.correct,
          explanation: question.explanation,
          reward: question.reward,
        }]
      }

      if (question.kind === 'listening' && question.options?.length && question.correct) {
        return [{
          id: question.id as ListeningExercise['id'],
          kind: 'listening',
          tag: question.tag,
          difficulty: question.difficulty,
          kicker: question.kicker,
          title: question.title,
          prompt: question.prompt,
          art,
          artAlt: question.artAlt,
          options: question.options,
          correct: question.correct,
          explanation: question.explanation,
          reward: question.reward,
        }]
      }

      if (question.kind === 'ordering' && question.scrambled?.length && question.solution?.length) {
        return [{
          id: question.id as OrderingExercise['id'],
          kind: 'ordering',
          tag: question.tag,
          difficulty: question.difficulty,
          kicker: question.kicker,
          title: question.title,
          prompt: question.prompt,
          art,
          artAlt: question.artAlt,
          scrambled: question.scrambled,
          solution: question.solution,
          explanation: question.explanation,
          reward: question.reward,
        }]
      }

      if (question.kind === 'speaking') {
        return [{
          id: question.id as SpeakingExercise['id'],
          kind: 'speaking',
          tag: question.tag,
          difficulty: question.difficulty,
          kicker: question.kicker,
          title: question.title,
          prompt: question.prompt,
          art,
          artAlt: question.artAlt,
          explanation: question.explanation,
          reward: question.reward,
          contextCue: question.contextCue,
        }]
      }

      return []
    })

  return mapped.length ? mapped : exercises
}

const getChallengeDuration = (exercise: Exercise) => {
  if (exercise.kind === 'speaking') return '15s'
  if (exercise.kind === 'listening') return '45s'
  if (exercise.kind === 'drag-fill') return '1 min'
  if (exercise.kind === 'ordering') return '50s'
  return exercise.tag === 'Reading' ? '90s' : '40s'
}

const getChallengeTitle = (exercise: Exercise) => {
  if (exercise.kind === 'speaking') return 'Speak Up'
  if (exercise.kind === 'listening') return 'Listen Fast'
  if (exercise.kind === 'drag-fill') return 'Drag & Match'
  if (exercise.kind === 'ordering') return 'Speed Order'
  return exercise.tag === 'Reading' ? 'Reflex Read' : 'Mini Survival'
}

const getChallengeTone = (index: number) => {
  const tones = ['lime', 'sky', 'berry', 'violet', 'gold', 'coral'] as const
  return tones[index % tones.length]
}

const getSlotPath = (slots: MediaSlots | undefined, key: MediaSlotKey) => slots?.[key]?.path ?? ''

const getFirstSlotPath = (slots: MediaSlots | undefined, keys: MediaSlotKey[], fallback = '') => {
  for (const key of keys) {
    const path = getSlotPath(slots, key)
    if (path) return path
  }

  return fallback
}

const isExerciseSolved = (
  exercise: Exercise,
  choiceAnswers: Record<string, string | null>,
  dragFillAnswers: Record<string, string | null>,
  orderWordMap: Record<string, string[]>,
  speakingCompletions: Record<string, boolean>,
) => {
  if (exercise.kind === 'multiple-choice') return choiceAnswers[exercise.id] === exercise.correct
  if (exercise.kind === 'listening') return choiceAnswers[exercise.id] === exercise.correct
  if (exercise.kind === 'drag-fill') return dragFillAnswers[exercise.id] === exercise.correct
  if (exercise.kind === 'speaking') return speakingCompletions[exercise.id] === true
  return normalizeTokenOrder(orderWordMap[exercise.id] ?? exercise.scrambled) === normalizeTokenOrder(exercise.solution)
}

const getExerciseAttempts = (
  exercise: Exercise,
  choiceAnswers: Record<string, string | null>,
  dragFillAnswers: Record<string, string | null>,
  orderWordMap: Record<string, string[]>,
  speakingCompletions: Record<string, boolean>,
) => {
  if (exercise.kind === 'multiple-choice') return Number(choiceAnswers[exercise.id] !== null)
  if (exercise.kind === 'listening') return Number(choiceAnswers[exercise.id] !== null)
  if (exercise.kind === 'drag-fill') return Number((dragFillAnswers[exercise.id] ?? null) !== null)
  if (exercise.kind === 'speaking') return Number(speakingCompletions[exercise.id] === true)
  return Number(normalizeTokenOrder(orderWordMap[exercise.id] ?? exercise.scrambled) !== normalizeTokenOrder(exercise.scrambled))
}

function App() {
  const { status, user, profile, signOut, platformConfig, patchProfile } = useAuth()
  const [activeFilter, setActiveFilter] = useState<FilterKey>('Todos')
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null)
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string | null>>({})
  const [dragFillAnswers, setDragFillAnswers] = useState<Record<string, string | null>>({})
  const [speakingCompletions, setSpeakingCompletions] = useState<Record<string, boolean>>({})
  const [orderWordMap, setOrderWordMap] = useState<Record<string, string[]>>({})
  const [sessionStreak, setSessionStreak] = useState(0)
  const [, setMascotMood] = useState<MascotMood>('guide')
  const [, setMascotLine] = useState('Escolha um mini desafio e deixa comigo o ritmo da jornada.')
  const [activeReaction, setActiveReaction] = useState<ActiveReaction | null>(null)
  const [progressHydrated, setProgressHydrated] = useState(false)
  const [progressSnapshot, setProgressSnapshot] = useState<UserProgress | null>(null)
  const [lessonsCatalog, setLessonsCatalog] = useState<LessonCatalogItem[]>(lessonCards)
  const [quizCatalog, setQuizCatalog] = useState<QuizCatalogItem[]>(defaultQuizCatalog)
  const [achievementCatalog, setAchievementCatalog] = useState<AchievementCatalogItem[]>([])
  const [quizQuestionCatalog, setQuizQuestionCatalog] = useState<QuizQuestionItem[]>(defaultQuizQuestions)
  const [, setLeaderboard] = useState<LeaderboardEntry[]>(fallbackLeaderboard)
  const [, setSyncState] = useState<SyncState>('idle')
  const [, setSyncMessage] = useState('Progresso local pronto para sincronizar.')
  const [view, setView] = useState<'home' | 'admin'>('home')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const previousOrderingSolved = useRef(false)
  const exercisePresentedAtRef = useRef<Record<string, number>>({})
  const responseTimesRef = useRef<Record<string, number>>({})
  const attemptCountsRef = useRef<Record<string, number>>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioUnlockedRef = useRef(false)
  const lastProgressSyncRef = useRef('')
  const lastLessonSyncRef = useRef('')
  const lastQuizSkillSyncRef = useRef('')
  const lastSessionSyncRef = useRef('')

  const runtimeExercises = useMemo(
    () => toRuntimeExercises(quizQuestionCatalog, quizCatalog),
    [quizCatalog, quizQuestionCatalog],
  )
  const orderingSolved = useMemo(() => {
    return runtimeExercises.some(
      (exercise) =>
        exercise.kind === 'ordering' &&
        isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions),
    )
  }, [choiceAnswers, dragFillAnswers, orderWordMap, runtimeExercises, speakingCompletions])

  const visibleExercises = useMemo(() => {
    if (activeFilter === 'Todos') return runtimeExercises
    return runtimeExercises.filter((exercise) => exercise.tag === activeFilter)
  }, [activeFilter, runtimeExercises])
  const activeExercise = useMemo(
    () => visibleExercises.find((exercise) => exercise.id === activeChallengeId) ?? visibleExercises[0] ?? null,
    [activeChallengeId, visibleExercises],
  )

  const completedCount = useMemo(() => {
    return runtimeExercises.filter((exercise) => isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)).length
  }, [choiceAnswers, dragFillAnswers, orderWordMap, runtimeExercises, speakingCompletions])

  const totalXp = useMemo(() => {
    let xp = 0
    runtimeExercises.forEach((exercise) => {
      if (exercise.kind === 'multiple-choice' && choiceAnswers[exercise.id] === exercise.correct) xp += exercise.reward
      if (exercise.kind === 'listening' && choiceAnswers[exercise.id] === exercise.correct) xp += exercise.reward
      if (exercise.kind === 'drag-fill' && dragFillAnswers[exercise.id] === exercise.correct) xp += exercise.reward
      if (exercise.kind === 'speaking' && speakingCompletions[exercise.id]) xp += exercise.reward
      if (exercise.kind === 'ordering' && isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)) xp += exercise.reward
    })
    return xp
  }, [choiceAnswers, dragFillAnswers, orderWordMap, runtimeExercises, speakingCompletions])

  const profileXp = progressSnapshot?.totalXp ?? profile?.xp ?? totalXp
  const streakDays = progressSnapshot?.streakDays ?? profile?.streak ?? 0
  const profileLevel = progressSnapshot?.level ?? profile?.level ?? 1
  const heroXp = Math.min(650, 350 + profileXp)
  const heroXpWidth = `${(heroXp / 650) * 100}%`
  const firstName = profile?.displayName?.split(' ')[0] ?? user?.displayName?.split(' ')[0] ?? 'learner'
  const isAdmin = profile?.role === 'admin'
  const currentMissionLesson = useMemo(() => {
    if (!lessonsCatalog.length) return null
    const unfinished = lessonsCatalog
      .filter((lesson) => lesson.progress < 100)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    return unfinished[0] ?? lessonsCatalog[0]
  }, [lessonsCatalog])
  const emotionalPulse = useMemo<EmotionalPulse>(() => {
    const base = progressSnapshot?.emotional ?? {
      confidence: 18,
      fluency: 12,
      hesitation: 62,
      emotionalStreak: 0,
      speakingConfidence: 10,
      listeningConfidence: 10,
      reviewPressure: 28,
      averageResponseMs: 0,
      favoriteModes: [],
      weakSkills: [],
      recurringErrors: [],
    }

    const attemptsByTag = runtimeExercises.reduce<Record<string, { attempts: number; solved: number }>>((acc, exercise) => {
      const attempts = getExerciseAttempts(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)
      const solved = Number(isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions))
      const current = acc[exercise.tag] ?? { attempts: 0, solved: 0 }
      current.attempts += attempts
      current.solved += solved
      acc[exercise.tag] = current
      return acc
    }, {})

    const responseValues = Object.values(responseTimesRef.current).filter((value) => value > 0)
    const averageResponseMs = responseValues.length
      ? Math.round(responseValues.reduce((sum, value) => sum + value, 0) / responseValues.length)
      : base.averageResponseMs

    const favoriteModes = Object.entries(attemptsByTag)
      .sort((a, b) => b[1].attempts - a[1].attempts)
      .slice(0, 2)
      .map(([tag]) => tag)

    const weakSkills = Object.entries(attemptsByTag)
      .filter(([, stats]) => stats.attempts > 0)
      .sort((a, b) => a[1].solved / Math.max(1, a[1].attempts) - b[1].solved / Math.max(1, b[1].attempts))
      .slice(0, 2)
      .map(([tag]) => tag)

    const recurringErrors = runtimeExercises
      .filter((exercise) => {
        const attempts = getExerciseAttempts(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)
        return attempts > 0 && !isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)
      })
      .slice(0, 3)
      .map((exercise) => exercise.title)

    const speakingSolved = runtimeExercises.filter((exercise) => exercise.kind === 'speaking' && speakingCompletions[exercise.id]).length
    const listeningSolved = runtimeExercises.filter((exercise) => exercise.kind === 'listening' && choiceAnswers[exercise.id] === exercise.correct).length
    const failedAttempts = Object.values(attemptsByTag).reduce((sum, stats) => sum + Math.max(0, stats.attempts - stats.solved), 0)
    const solvedRatio = runtimeExercises.length ? completedCount / runtimeExercises.length : 0

    const confidence = clampPercent(base.confidence * 0.45 + solvedRatio * 48 + Math.min(sessionStreak, 4) * 7 - failedAttempts * 2)
    const fluency = clampPercent(base.fluency * 0.45 + solvedRatio * 42 + Math.max(0, 18 - averageResponseMs / 700))
    const hesitation = clampPercent(Math.max(8, 100 - confidence - Math.min(18, solvedRatio * 12)))
    const reviewPressure = clampPercent(base.reviewPressure * 0.65 + Math.max(0, weakSkills.length * 14 + failedAttempts * 5 - completedCount * 3))

    return {
      confidence,
      fluency,
      hesitation,
      emotionalStreak: Math.max(base.emotionalStreak, streakDays, sessionStreak),
      speakingConfidence: clampPercent(base.speakingConfidence * 0.45 + speakingSolved * 24),
      listeningConfidence: clampPercent(base.listeningConfidence * 0.45 + listeningSolved * 20),
      reviewPressure,
      averageResponseMs,
      favoriteModes,
      weakSkills,
      recurringErrors,
    }
  }, [choiceAnswers, completedCount, dragFillAnswers, orderWordMap, progressSnapshot?.emotional, runtimeExercises, sessionStreak, speakingCompletions, streakDays])

  const currentMissionQuizzes = useMemo(
    () =>
      currentMissionLesson
        ? quizCatalog.filter((quiz) => quiz.lessonId === currentMissionLesson.id)
        : quizCatalog,
    [currentMissionLesson, quizCatalog],
  )

  const currentMissionVisual = useMemo(
    () => {
      const heroSlot = getFirstSlotPath(currentMissionLesson?.mediaSlots, ['heroImageDesktop', 'heroImageMobile', 'emotionalBackground', 'thumbnail'], '')
      const quizSlot = currentMissionQuizzes
        .map((quiz) => getFirstSlotPath(quiz.mediaSlots, ['challengeCardImage', 'scenarioThumbnail'], ''))
        .find(Boolean)

      return heroSlot || quizSlot || currentMissionQuizzes.find((quiz) => quiz.coverArt)?.coverArt || currentMissionLesson?.image || '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png'
    },
    [currentMissionLesson, currentMissionQuizzes],
  )
  const currentMissionHeroDesktop = useMemo(
    () =>
      getFirstSlotPath(currentMissionLesson?.mediaSlots, ['heroImageDesktop', 'emotionalBackground', 'thumbnail'], currentMissionVisual),
    [currentMissionLesson, currentMissionVisual],
  )
  const currentMissionHeroMobile = useMemo(
    () =>
      getFirstSlotPath(currentMissionLesson?.mediaSlots, ['heroImageMobile', 'heroImageDesktop', 'thumbnail'], currentMissionHeroDesktop),
    [currentMissionHeroDesktop, currentMissionLesson],
  )
  const heroPortraitImage = useMemo(
    () => normalizeScenePath(currentMissionHeroMobile, storyMedia.airport.hero),
    [currentMissionHeroMobile],
  )

  const missionSceneImage = useMemo(
    () => normalizeScenePath(currentMissionHeroDesktop, storyMedia.airport.immigration),
    [currentMissionHeroDesktop],
  )

  const missionPreviewImage = useMemo(() => {
    const previewSource =
      getFirstSlotPath(currentMissionLesson?.mediaSlots, ['thumbnail', 'heroImageDesktop', 'heroImageMobile'], '') ||
      currentMissionVisual

    return normalizeScenePath(previewSource, storyMedia.airport.checkin)
  }, [currentMissionLesson, currentMissionVisual])

  const quickChallenges = useMemo(
    () =>
      runtimeExercises.slice(0, 4).map((exercise, index) => {
        const Icon =
          exercise.kind === 'speaking'
            ? Mic
            : exercise.kind === 'listening'
              ? Headphones
              : exercise.kind === 'drag-fill'
                ? Grip
                : exercise.kind === 'ordering'
                  ? Sparkles
                  : Zap

        return {
          ...exercise,
          Icon,
          tone: getChallengeTone(index),
          duration: getChallengeDuration(exercise),
          label: getChallengeTitle(exercise),
          caption: ('contextCue' in exercise ? exercise.contextCue : '') || exercise.prompt,
          done: isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions),
        }
      }),
    [choiceAnswers, dragFillAnswers, orderWordMap, runtimeExercises, speakingCompletions],
  )

  const emotionalInsights = useMemo(
    () => [
      {
        title: emotionalPulse.speakingConfidence < 45 ? 'Sua fala ainda pede um começo seguro' : 'Sua confiança para falar subiu de nível',
        body:
          emotionalPulse.speakingConfidence < 45
            ? 'Spark percebeu hesitação ao responder em voz alta. Hoje a jornada prioriza falas curtas e vitórias rápidas.'
            : 'Você está respondendo com menos travas. Vale puxar uma cena com mais improviso e menos script.',
        meta: `Speaking confidence ${emotionalPulse.speakingConfidence}%`,
        tone: 'violet',
      },
      {
        title: emotionalPulse.reviewPressure > 55 ? 'Existe risco real de abandono no listening' : 'Seu ouvido está acompanhando melhor a cena',
        body:
          emotionalPulse.reviewPressure > 55
            ? 'O sistema detectou pressão de revisão e vai encurtar frases, repetir contexto e reduzir ruído para manter o ritmo.'
            : 'A compreensão está mais fluida. Dá para sustentar uma missão curta sem quebrar a confiança percebida.',
        meta: `Pressão de revisão ${emotionalPulse.reviewPressure}%`,
        tone: 'aqua',
      },
      {
        title: emotionalPulse.weakSkills.length
          ? `Foco adaptativo em ${emotionalPulse.weakSkills.join(' e ')}`
          : 'Seu modo favorito está guiando a próxima etapa',
        body: emotionalPulse.favoriteModes.length
          ? `Você engata melhor quando a experiência mistura ${emotionalPulse.favoriteModes.join(' + ')}. Spark vai usar isso como entrada emocional.`
          : `Spark está usando ${profile?.focusSkill ?? 'Listening'} como âncora para manter continuidade e sensação de progresso real.`,
        meta: currentMissionLesson?.emotionalGoal ?? 'Objetivo emocional ativo',
        tone: 'gold',
      },
    ],
    [currentMissionLesson?.emotionalGoal, emotionalPulse, profile?.focusSkill],
  )

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const activeQuickChallenge = useMemo(
    () => quickChallenges.find((challenge) => challenge.id === activeExercise?.id) ?? quickChallenges[0] ?? null,
    [activeExercise?.id, quickChallenges],
  )

  const sceneSolved = useMemo(
    () =>
      activeExercise
        ? isExerciseSolved(activeExercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)
        : false,
    [activeExercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions],
  )

  const currentMissionIndex = useMemo(() => {
    const index = lessonsCatalog.findIndex((lesson) => lesson.id === currentMissionLesson?.id)
    return index >= 0 ? index : 0
  }, [currentMissionLesson?.id, lessonsCatalog])

  const adventureProgress = useMemo(
    () =>
      lessonsCatalog.map((lesson, index) => {
        const state =
          lesson.progress >= 100
            ? 'done'
            : index === currentMissionIndex
              ? 'active'
              : index < currentMissionIndex
                ? 'ready'
                : 'locked'

        return {
          ...lesson,
          image:
            state === 'done'
              ? getFirstSlotPath(lesson.mediaSlots, ['nodeCompletedImage', 'nodeImage', 'thumbnail'], lesson.image)
              : state === 'locked'
                ? getFirstSlotPath(lesson.mediaSlots, ['nodeLockedImage', 'nodeImage', 'thumbnail'], lesson.image)
                : getFirstSlotPath(lesson.mediaSlots, ['nodeImage', 'thumbnail'], lesson.image),
          step: index + 1,
          state,
          label:
            state === 'done'
              ? 'Concluída'
              : state === 'active'
                ? 'Em andamento'
                : state === 'ready'
                  ? 'Disponível'
                  : 'Próxima',
          cue: lesson.nextMissionHook ?? lesson.practicalGoal ?? lesson.blurb,
        }
      }),
    [currentMissionIndex, lessonsCatalog],
  )

  const realLifeMoments = useMemo(() => {
    const source = (currentMissionQuizzes.length ? currentMissionQuizzes : quizCatalog).slice(0, 3)

    if (!source.length) {
      return lessonsCatalog.slice(0, 3).map((lesson, index) => ({
        id: lesson.id,
        title: lesson.missionTitle ?? lesson.title,
        context: lesson.emotionalContext ?? lesson.blurb,
        hook: lesson.practicalGoal ?? lesson.confidenceTarget ?? 'Treine em uma situação rápida e real.',
        duration: `${Math.max(2, 5 - index)} min`,
        image: getFirstSlotPath(lesson.mediaSlots, ['thumbnail', 'nodeImage', 'heroImageMobile'], lesson.image),
        badge: lesson.category,
      }))
    }

    return source.map((quiz, index) => {
      const linkedLesson = currentMissionLesson ?? lessonsCatalog[index]

      return {
        id: quiz.id,
        title: quiz.storyBeat ?? linkedLesson?.missionTitle ?? quiz.title,
        context: linkedLesson?.emotionalContext ?? quiz.objective ?? linkedLesson?.blurb ?? 'Situação curta com urgência leve.',
        hook: quiz.objective ?? linkedLesson?.practicalGoal ?? 'Resolva a cena e avance com segurança.',
        duration: `${Math.max(1, Math.min(5, Math.round((quiz.reward ?? 24) / 10)))} min`,
        image:
          getFirstSlotPath(quiz.mediaSlots, ['scenarioThumbnail', 'emotionalThumbnail', 'challengeCardImage'], '') ||
          quiz.coverArt ||
          getFirstSlotPath(linkedLesson?.mediaSlots, ['thumbnail', 'nodeImage'], '') ||
          linkedLesson?.image ||
          '/pollinations/hero-scene.png',
        badge: quiz.tag || linkedLesson?.category || 'Missão',
      }
    })
  }, [currentMissionLesson, currentMissionQuizzes, lessonsCatalog, quizCatalog])

  const homeMomentCards = useMemo(() => {
    const fallbackMoments = [
      storyMedia.coffee.ordering,
      storyMedia.coffee.take,
      storyMedia.park.iceCream,
      storyMedia.park.draw,
    ]

    return realLifeMoments.slice(0, 4).map((moment, index) => ({
      ...moment,
      image: normalizeScenePath(moment.image, fallbackMoments[index % fallbackMoments.length]),
    }))
  }, [realLifeMoments])

  const primaryMoment = homeMomentCards[0] ?? null
  const featuredInsight = emotionalInsights[0] ?? null

  const adventureCompletionCount = useMemo(
    () => adventureProgress.filter((step) => step.state === 'done').length,
    [adventureProgress],
  )

  const adventureCompletionPercent = useMemo(
    () => (adventureProgress.length ? Math.round((adventureCompletionCount / adventureProgress.length) * 100) : 0),
    [adventureCompletionCount, adventureProgress.length],
  )

  const mapNodes = useMemo(() => {
    const chapterTitles =
      currentMissionLesson?.journeyArc?.length
        ? currentMissionLesson.journeyArc.slice(0, 5)
        : ['Airport Arrival', 'Taxi to Downtown', 'Hotel Check-in', 'Dinner Dialogue', 'Next Chapter']

    const nodeFallbacks = [
      storyMedia.airport.checkin,
      storyMedia.airport.departures,
      storyMedia.coffee.ordering,
      storyMedia.park.enjoy,
      storyMedia.park.iceCream,
    ]

    return chapterTitles.map((title, index) => {
      const step = adventureProgress[index]
      const state = step?.state ?? 'locked'

      return {
        id: step?.id ?? `journey-${index}`,
        title,
        image: normalizeScenePath(step?.image, nodeFallbacks[index % nodeFallbacks.length]),
        state,
        step: index + 1,
        progressLabel:
          state === 'done'
            ? 'Completed'
            : state === 'active'
              ? `${step?.progress ?? 0}%`
              : state === 'ready'
                ? 'Ready'
                : index === chapterTitles.length - 1
                  ? 'Next'
                  : 'Locked',
      }
    })
  }, [adventureProgress, currentMissionLesson?.journeyArc])

  const recentMissionTheme = currentMissionLesson?.missionTitle ?? currentMissionLesson?.title ?? ''
  const {
    confidence: emotionalConfidence,
    fluency: emotionalFluency,
    hesitation: emotionalHesitation,
    emotionalStreak: emotionalStreakScore,
  } = emotionalPulse

  const completedExerciseIds = useMemo(
    () =>
      runtimeExercises
        .filter((exercise) => isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions))
        .map((exercise) => exercise.id),
    [choiceAnswers, dragFillAnswers, orderWordMap, runtimeExercises, speakingCompletions],
  )

  useEffect(() => {
    if (!visibleExercises.length) {
      setActiveChallengeId(null)
      return
    }

    if (!activeChallengeId || !visibleExercises.some((exercise) => exercise.id === activeChallengeId)) {
      setActiveChallengeId(visibleExercises[0].id)
    }
  }, [activeChallengeId, visibleExercises])

  const progressSyncPayload = useMemo(
    () => ({
      totalXp,
      completedExerciseIds,
      choiceAnswers,
      dragFillAnswers,
      speakingCompletions,
      orderWordMap,
      recentMissionTheme,
      recentMissionContext: currentMissionLesson?.emotionalContext ?? '',
      emotional: emotionalPulse,
    }),
    [
      totalXp,
      completedExerciseIds,
      choiceAnswers,
      dragFillAnswers,
      speakingCompletions,
      orderWordMap,
      recentMissionTheme,
      currentMissionLesson?.emotionalContext,
      emotionalPulse,
    ],
  )
  const progressSyncSignature = useMemo(() => buildSignature(progressSyncPayload), [progressSyncPayload])

  const lessonProgressPayload = useMemo(() => {
    const nextLessonProgress: LessonProgressMap = {}
    const byLesson = runtimeExercises.reduce<Record<string, { total: number; solved: number }>>((acc, exercise) => {
      const lessonId = quizQuestionCatalog.find((question) => question.id === exercise.id)?.lessonId
      if (!lessonId) return acc
      const current = acc[lessonId] ?? { total: 0, solved: 0 }
      current.total += 1
      current.solved += Number(isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions))
      acc[lessonId] = current
      return acc
    }, {})

    Object.entries(byLesson).forEach(([lessonId, stats]) => {
      nextLessonProgress[lessonId] = stats.total ? Math.round((stats.solved / stats.total) * 100) : 0
    })

    return nextLessonProgress
  }, [choiceAnswers, dragFillAnswers, orderWordMap, quizQuestionCatalog, runtimeExercises, speakingCompletions])
  const lessonProgressSignature = useMemo(() => buildSignature(lessonProgressPayload), [lessonProgressPayload])

  const quizProgressPayload = useMemo(
    () =>
      runtimeExercises.map((exercise) => {
        const questionSource = quizQuestionCatalog.find((question) => question.id === exercise.id)
        const completed = isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)
        const attempts = getExerciseAttempts(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)

        return {
          quizId: exercise.id,
          lessonId: questionSource?.lessonId ?? '',
          skillId: skillByTag[exercise.tag as Exclude<FilterKey, 'Todos'>],
          completed,
          attempts,
          correct: completed,
          xpEarned: completed ? exercise.reward : 0,
        }
      }),
    [choiceAnswers, dragFillAnswers, orderWordMap, quizQuestionCatalog, runtimeExercises, speakingCompletions],
  )

  const skillProgressPayload = useMemo(() => {
    const skillStats = runtimeExercises.reduce<Record<string, { total: number; solved: number; xp: number }>>((acc, exercise) => {
      const skillId = skillByTag[exercise.tag as Exclude<FilterKey, 'Todos'>]
      const solved = Number(isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions))
      const current = acc[skillId] ?? { total: 0, solved: 0, xp: 0 }
      current.total += 1
      current.solved += solved
      current.xp += solved ? exercise.reward : 0
      acc[skillId] = current
      return acc
    }, {})

    return Object.entries(skillStats).map(([skillId, stats]) => ({
      skillId,
      xpEarned: stats.xp,
      completedQuizzes: stats.solved,
      accuracy: stats.total ? (stats.solved / stats.total) * 100 : 0,
    }))
  }, [choiceAnswers, dragFillAnswers, orderWordMap, runtimeExercises, speakingCompletions])
  const quizSkillSyncSignature = useMemo(
    () => buildSignature({ quizzes: quizProgressPayload, skills: skillProgressPayload }),
    [quizProgressPayload, skillProgressPayload],
  )

  const refreshBackendCatalog = useCallback(async () => {
    if (!user) return

    const [nextLessonProgress, nextLessonsCatalog, nextQuizCatalog, nextAchievementCatalog, nextQuizQuestions, nextLeaderboard] = await Promise.all([
      getLessonProgressMap(user.uid),
      getLessonsCatalog(),
      getQuizCatalog(),
      getAchievementCatalog(),
      getQuizQuestions(),
      getWeeklyRanking(user.uid),
    ])

    setLessonsCatalog(nextLessonsCatalog.map((lesson) => ({
      ...lesson,
      progress: nextLessonProgress[lesson.id] ?? lesson.progress,
    })))
    setQuizCatalog(nextQuizCatalog)
    setAchievementCatalog(nextAchievementCatalog)
    setQuizQuestionCatalog(nextQuizQuestions)
    setLeaderboard(nextLeaderboard.length ? nextLeaderboard : fallbackLeaderboard)

    return {
      nextLessonProgress,
      nextLessonsCatalog,
      nextQuizCatalog,
      nextAchievementCatalog,
      nextQuizQuestions,
      nextLeaderboard,
    }
  }, [user])

  const playUiSound = useCallback((kind: 'success' | 'error' | 'combo' | 'play' | 'click') => {
    if (typeof window === 'undefined') return
    if (!audioUnlockedRef.current) return

    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const context = audioContextRef.current ?? new AudioCtx()
    audioContextRef.current = context
    if (context.state === 'suspended') context.resume().catch(() => {})

    const presetMap: Record<typeof kind, Array<{ freq: number; duration: number; gain: number; type?: OscillatorType }>> = {
      click: [{ freq: 420, duration: 0.05, gain: 0.018, type: 'triangle' }],
      play: [
        { freq: 392, duration: 0.07, gain: 0.018, type: 'triangle' },
        { freq: 523.25, duration: 0.1, gain: 0.022, type: 'sine' },
      ],
      success: [
        { freq: 523.25, duration: 0.08, gain: 0.02, type: 'triangle' },
        { freq: 659.25, duration: 0.12, gain: 0.024, type: 'sine' },
      ],
      combo: [
        { freq: 523.25, duration: 0.06, gain: 0.02, type: 'triangle' },
        { freq: 659.25, duration: 0.08, gain: 0.024, type: 'triangle' },
        { freq: 783.99, duration: 0.12, gain: 0.028, type: 'sine' },
      ],
      error: [{ freq: 240, duration: 0.12, gain: 0.02, type: 'sine' }],
    }

    const start = context.currentTime + 0.01
    presetMap[kind].forEach((tone, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const toneStart = start + index * 0.075
      oscillator.type = tone.type ?? 'sine'
      oscillator.frequency.setValueAtTime(tone.freq, toneStart)
      gain.gain.setValueAtTime(0.0001, toneStart)
      gain.gain.exponentialRampToValueAtTime(tone.gain, toneStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + tone.duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(toneStart)
      oscillator.stop(toneStart + tone.duration + 0.03)
    })
  }, [])

  const triggerMoment = useCallback(({
    exerciseId,
    correct,
    reward,
    successLine,
    errorLine,
  }: {
    exerciseId: Exercise['id']
    correct: boolean
    reward: number
    successLine: string
    errorLine: string
  }) => {
    if (correct) {
      let nextStreak = 0
      setSessionStreak((current) => {
        nextStreak = current + 1
        return nextStreak
      })
      setMascotMood(nextStreak >= 3 ? 'streak' : 'cheer')
      setMascotLine(nextStreak >= 3 ? `Combo x${nextStreak} ativo. Não perde esse embalo.` : successLine)
      setActiveReaction({
        exerciseId,
        kind: 'success',
        label: nextStreak >= 3 ? `Combo x${nextStreak}` : `+${reward} XP`,
      })
      playUiSound(nextStreak >= 3 ? 'combo' : 'success')
      return
    }

    setSessionStreak(0)
    setMascotMood('oops')
    setMascotLine(errorLine)
    setActiveReaction({
      exerciseId,
      kind: 'error',
      label: 'Try again',
    })
    playUiSound('error')
  }, [playUiSound])

  const registerExerciseAttempt = useCallback((exerciseId: string) => {
    const now = Date.now()
    const presentedAt = exercisePresentedAtRef.current[exerciseId] ?? now
    exercisePresentedAtRef.current[exerciseId] = presentedAt
    attemptCountsRef.current[exerciseId] = (attemptCountsRef.current[exerciseId] ?? 0) + 1
    if (!(exerciseId in responseTimesRef.current)) {
      responseTimesRef.current[exerciseId] = Math.max(0, now - presentedAt)
    }
  }, [])

  useEffect(() => {
    if (!activeReaction) return
    const timeout = window.setTimeout(() => setActiveReaction(null), 1650)
    return () => window.clearTimeout(timeout)
  }, [activeReaction])

  useEffect(() => {
    if (!runtimeExercises.length) return

    setOrderWordMap((current) => {
      const next = { ...current }
      let changed = false

      runtimeExercises.forEach((exercise) => {
        if (exercise.kind !== 'ordering') return
        if (!next[exercise.id]?.length) {
          next[exercise.id] = [...exercise.scrambled]
          changed = true
        }
      })

      return changed ? next : current
    })

    const now = Date.now()
    runtimeExercises.forEach((exercise) => {
      if (!(exercise.id in exercisePresentedAtRef.current)) {
        exercisePresentedAtRef.current[exercise.id] = now
      }
      if (!(exercise.id in attemptCountsRef.current)) {
        attemptCountsRef.current[exercise.id] = 0
      }
    })
  }, [runtimeExercises])

  useEffect(() => {
    if (!progressSnapshot || !runtimeExercises.length) return

    const firstDragFill = runtimeExercises.find((exercise): exercise is DragFillExercise => exercise.kind === 'drag-fill')
    if (firstDragFill && progressSnapshot.dragFillAnswer && !dragFillAnswers[firstDragFill.id]) {
      setDragFillAnswers((current) => ({ ...current, [firstDragFill.id]: progressSnapshot.dragFillAnswer ?? null }))
    }

    const firstOrdering = runtimeExercises.find((exercise): exercise is OrderingExercise => exercise.kind === 'ordering')
    if (firstOrdering && progressSnapshot.orderWords?.length && !(orderWordMap[firstOrdering.id]?.length)) {
      setOrderWordMap((current) => ({ ...current, [firstOrdering.id]: progressSnapshot.orderWords ?? firstOrdering.scrambled }))
    }
  }, [dragFillAnswers, orderWordMap, progressSnapshot, runtimeExercises])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setProgressHydrated(false)

    Promise.all([getUserProgress(user.uid), refreshBackendCatalog()])
      .then(([nextProgress, catalogSeed]) => {
        if (cancelled) return
        setChoiceAnswers((current) => ({ ...current, ...nextProgress.choiceAnswers }))
        setDragFillAnswers(nextProgress.dragFillAnswers ?? {})
        setSpeakingCompletions(nextProgress.speakingCompletions ?? {})
        setOrderWordMap(nextProgress.orderWordMap ?? {})
        setProgressSnapshot(nextProgress)
        lastProgressSyncRef.current = buildSignature({
          totalXp: nextProgress.totalXp,
          completedExerciseIds: nextProgress.completedExerciseIds,
          choiceAnswers: nextProgress.choiceAnswers,
          dragFillAnswers: nextProgress.dragFillAnswers ?? {},
          speakingCompletions: nextProgress.speakingCompletions ?? {},
          orderWordMap: nextProgress.orderWordMap ?? {},
          recentMissionTheme: nextProgress.recentMissionTheme ?? '',
          recentMissionContext: nextProgress.recentMissionContext ?? '',
          emotional: nextProgress.emotional,
        })
        if (catalogSeed?.nextLessonProgress) {
          lastLessonSyncRef.current = buildSignature(catalogSeed.nextLessonProgress)
          const seededExercises = toRuntimeExercises(catalogSeed.nextQuizQuestions, catalogSeed.nextQuizCatalog)
          const seededQuizPayload = seededExercises.map((exercise) => {
            const questionSource = catalogSeed.nextQuizQuestions.find((question) => question.id === exercise.id)
            const completed = isExerciseSolved(
              exercise,
              nextProgress.choiceAnswers,
              nextProgress.dragFillAnswers ?? {},
              nextProgress.orderWordMap ?? {},
              nextProgress.speakingCompletions ?? {},
            )
            const attempts = getExerciseAttempts(
              exercise,
              nextProgress.choiceAnswers,
              nextProgress.dragFillAnswers ?? {},
              nextProgress.orderWordMap ?? {},
              nextProgress.speakingCompletions ?? {},
            )

            return {
              quizId: exercise.id,
              lessonId: questionSource?.lessonId ?? '',
              skillId: skillByTag[exercise.tag as Exclude<FilterKey, 'Todos'>],
              completed,
              attempts,
              correct: completed,
              xpEarned: completed ? exercise.reward : 0,
            }
          })

          const seededSkillStats = seededExercises.reduce<Record<string, { total: number; solved: number; xp: number }>>((acc, exercise) => {
            const skillId = skillByTag[exercise.tag as Exclude<FilterKey, 'Todos'>]
            const solved = Number(
              isExerciseSolved(
                exercise,
                nextProgress.choiceAnswers,
                nextProgress.dragFillAnswers ?? {},
                nextProgress.orderWordMap ?? {},
                nextProgress.speakingCompletions ?? {},
              ),
            )
            const current = acc[skillId] ?? { total: 0, solved: 0, xp: 0 }
            current.total += 1
            current.solved += solved
            current.xp += solved ? exercise.reward : 0
            acc[skillId] = current
            return acc
          }, {})

          lastQuizSkillSyncRef.current = buildSignature({
            quizzes: seededQuizPayload,
            skills: Object.entries(seededSkillStats).map(([skillId, stats]) => ({
              skillId,
              xpEarned: stats.xp,
              completedQuizzes: stats.solved,
              accuracy: stats.total ? (stats.solved / stats.total) * 100 : 0,
            })),
          })
        }
        setSyncState('saved')
        setSyncMessage('Progresso carregado do Firestore.')
        setProgressHydrated(true)
      })
      .catch(() => {
        if (cancelled) return
        setSyncState('error')
        setSyncMessage('Não foi possível carregar o progresso do Firestore.')
        setProgressHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [refreshBackendCatalog, user])

  useEffect(() => {
    if (!user) return
    void trackProductEvent(user.uid, 'login', {
      provider: profile?.provider ?? 'unknown',
    })
  }, [profile?.provider, user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const unlockAudio = () => {
      audioUnlockedRef.current = true
      const context = audioContextRef.current
      if (context && context.state === 'suspended') {
        void context.resume().catch(() => {})
      }
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [])

  useEffect(() => {
    const exercise = runtimeExercises.find((item): item is OrderingExercise => item.kind === 'ordering' && isExerciseSolved(item, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions))
    const justSolved = Boolean(exercise) && orderingSolved && !previousOrderingSolved.current

    if (exercise && justSolved) {
      if (user) {
        void trackProductEvent(user.uid, 'quiz_completed', {
          quizId: exercise.id,
          ordered: true,
        })
      }
      triggerMoment({
        exerciseId: exercise.id,
        correct: true,
        reward: exercise.reward,
        successLine: 'A frase encaixou perfeita. Bora para a próxima etapa.',
        errorLine: '',
      })
    }

    previousOrderingSolved.current = orderingSolved
  }, [choiceAnswers, dragFillAnswers, orderWordMap, orderingSolved, runtimeExercises, speakingCompletions, triggerMoment, user])

  useEffect(() => {
    if (!user || !progressHydrated) return
    if (lastProgressSyncRef.current === progressSyncSignature) return

    const timeout = window.setTimeout(() => {
      setSyncState('saving')
      setSyncMessage('Salvando progresso da sessão...')
      void (async () => {
        try {
          const nextProgress = await saveUserProgress(user.uid, progressSyncPayload)

          lastProgressSyncRef.current = progressSyncSignature
          setProgressSnapshot(nextProgress)

          if (
            profile &&
            (
              profile.xp !== nextProgress.totalXp ||
              profile.streak !== nextProgress.streakDays ||
              profile.level !== nextProgress.level
            )
          ) {
            await patchProfile({
              xp: nextProgress.totalXp,
              streak: nextProgress.streakDays,
              level: nextProgress.level,
              confidence: emotionalConfidence,
              fluency: emotionalFluency,
              hesitation: emotionalHesitation,
              emotionalStreak: emotionalStreakScore,
              recentMissionTheme,
            })
          }
          setSyncState('saved')
          setSyncMessage('Progresso salvo no Firestore.')
        } catch {
          setSyncState('error')
          setSyncMessage('Falha ao salvar no Firestore. Verifique bloqueadores/extensões ou rules.')
        }
      })()
    }, 420)

    return () => window.clearTimeout(timeout)
  }, [
    user,
    progressHydrated,
    progressSyncPayload,
    progressSyncSignature,
    patchProfile,
    profile,
    emotionalConfidence,
    emotionalFluency,
    emotionalHesitation,
    emotionalStreakScore,
    recentMissionTheme,
  ])

  useEffect(() => {
    if (!user || !progressHydrated) return
    if (lastLessonSyncRef.current === lessonProgressSignature) return

    const timeout = window.setTimeout(() => {
      setSyncState('saving')
      setSyncMessage('Atualizando progresso das aulas...')
      void saveLessonProgressMap(user.uid, lessonProgressPayload)
        .then(() => {
          lastLessonSyncRef.current = lessonProgressSignature
          setLessonsCatalog((current) => current.map((lesson) => ({
            ...lesson,
            progress: lessonProgressPayload[lesson.id] ?? lesson.progress,
          })))
          setSyncState('saved')
          setSyncMessage('Aulas sincronizadas com o Firestore.')
        })
        .catch(() => {
          setSyncState('error')
          setSyncMessage('Falha ao sincronizar progresso das aulas.')
        })
    }, 460)

    return () => window.clearTimeout(timeout)
  }, [user, progressHydrated, lessonProgressPayload, lessonProgressSignature])

  useEffect(() => {
    if (!user || !progressHydrated) return
    if (lastQuizSkillSyncRef.current === quizSkillSyncSignature) return

    const timeout = window.setTimeout(() => {
      const quizWrites = quizProgressPayload.map((item) => saveQuizProgress(user.uid, item))
      const skillWrites = skillProgressPayload.map((item) => saveSkillProgress(user.uid, item))

      void Promise.all([...quizWrites, ...skillWrites]).then(() => {
        lastQuizSkillSyncRef.current = quizSkillSyncSignature
      })
    }, 520)

    return () => window.clearTimeout(timeout)
  }, [user, progressHydrated, quizProgressPayload, skillProgressPayload, quizSkillSyncSignature])

  useEffect(() => {
    if (!user || !sessionId || sessionStartedAt === null) return
    const wrongCount = runtimeExercises.reduce((sum, exercise) => {
      if (exercise.kind === 'multiple-choice' || exercise.kind === 'listening') {
        const answer = choiceAnswers[exercise.id]
        return sum + Number(answer !== null && answer !== exercise.correct)
      }
      if (exercise.kind === 'drag-fill') {
        const answer = dragFillAnswers[exercise.id] ?? null
        return sum + Number(answer !== null && answer !== exercise.correct)
      }
      if (exercise.kind === 'speaking') {
        return sum
      }
      return sum + Number((orderWordMap[exercise.id]?.length ?? 0) > 0 && !isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions))
    }, 0)

    if (completedExerciseIds.length === 0 && totalXp === 0 && wrongCount === 0) return

    const sessionSyncSignature = buildSignature({
      sessionId,
      totalXp,
      completedCount,
      wrongCount,
      comboMax: Math.max(sessionStreak, 1),
      completedExerciseIds,
    })
    if (lastSessionSyncRef.current === sessionSyncSignature) return

    const timeout = window.setTimeout(() => {
      void (async () => {
        const endedAt = Date.now()

        await completeStudySession(sessionId, {
          uid: user.uid,
          startedAt: sessionStartedAt,
          endedAt,
          xpEarned: totalXp,
          correctCount: completedCount,
          wrongCount,
          comboMax: Math.max(sessionStreak, 1),
          completedExerciseIds,
        })

        lastSessionSyncRef.current = sessionSyncSignature

        await trackProductEvent(user.uid, 'session_completed', {
          sessionId,
          endedAt,
          xpEarned: totalXp,
          correctCount: completedCount,
          wrongCount,
        })
      })()
    }, 720)

    return () => window.clearTimeout(timeout)
  }, [user, sessionId, sessionStartedAt, totalXp, completedCount, completedExerciseIds, sessionStreak, choiceAnswers, dragFillAnswers, orderWordMap, runtimeExercises, speakingCompletions])

  const handleChoiceSelect = (id: Exercise['id'], option: string) => {
    const exercise = runtimeExercises.find(
      (item): item is MultipleChoiceExercise | ListeningExercise =>
        item.id === id && (item.kind === 'multiple-choice' || item.kind === 'listening'),
    )
    if (!exercise) return

    const previous = choiceAnswers[id]
    if (previous === option) return

    const isCorrect = option === exercise.correct
    registerExerciseAttempt(id)
    setChoiceAnswers((current) => ({ ...current, [id]: option }))
    if (user) {
      void trackProductEvent(user.uid, isCorrect ? 'quiz_completed' : 'quiz_failed', {
        quizId: id,
        answer: option,
      })
    }
    triggerMoment({
      exerciseId: id,
      correct: isCorrect,
      reward: exercise.reward,
      successLine: 'Boa. Esse acerto abriu mais energia para a run.',
      errorLine: 'Quase. Ajusta rápido e mantém o ritmo.',
    })
  }

  const launchRun = () => {
    setMascotMood('guide')
    setMascotLine('A aventura começou. Fecha um warm-up e eu acelero o combo.')
    playUiSound('play')
    if (user) {
      const startedAt = Date.now()
      setSessionStartedAt(startedAt)
      lastSessionSyncRef.current = ''
      void startStudySession(user.uid)
        .then((nextSessionId) => setSessionId(nextSessionId))
        .catch(() => setSessionId(null))
      void trackProductEvent(user.uid, 'session_started', { startedAt })
    }
  }

  if (status === 'loading') {
    return (
      <div className="app-shell app-shell-loading">
        <main className="main-panel">
          <section className="hero-card auth-loading-card">
            <div className="auth-loading-copy">
              <p className="micro-label">SparkLingo</p>
              <h1>Conectando sua jornada...</h1>
              <p className="hero-subtitle">
                Estamos preparando seu perfil, progresso e configurações da plataforma.
              </p>
              <div className="auth-loading-pulse" />
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (!user) {
    return <AuthEntry />
  }

  if (profile && platformConfig?.onboardingEnabled && !profile.onboardingCompleted) {
    return (
      <OnboardingScreen
        profile={profile}
        onComplete={async (payload) => {
          await patchProfile(payload)
          if (user) {
            await trackProductEvent(user.uid, 'onboarding_completed', payload)
          }
        }}
      />
    )
  }

  if (isAdmin && view === 'admin') {
    return (
      <div className="app-shell app-shell-admin">
        <main className="main-panel">
          <AdminScreen
            lessons={lessonsCatalog}
            quizzes={quizCatalog}
            questions={quizQuestionCatalog}
            achievements={achievementCatalog}
            platformConfig={platformConfig}
            onBack={() => setView('home')}
            onRefresh={refreshBackendCatalog}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="spark-home-shell">
      <main className="spark-home-stage">
        <section className="spark-phone-frame">
          <header className="spark-phone-topbar">
            <div className="spark-brand-pill">
              <Zap size={18} />
              <strong>SparkLingo</strong>
            </div>

            <div className="spark-topbar-actions">
              <div className="spark-stat-pill">
                <Flame size={14} />
                <div>
                  <strong>{streakDays}</strong>
                  <span>day streak</span>
                </div>
              </div>
              <div className="spark-stat-pill">
                <Medal size={14} />
                <div>
                  <strong>{heroXp} +</strong>
                  <span>XP</span>
                </div>
              </div>
              <button className="spark-avatar-button" onClick={() => signOut()} title="Sair" type="button">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="avatar-image" />
                ) : (
                  <UserRound size={18} />
                )}
              </button>
            </div>
          </header>

          <section className="spark-hero-panel">
            <img
              src={heroPortraitImage}
              alt={currentMissionLesson?.missionTitle ?? 'Current mission hero'}
              className="spark-hero-background"
            />
            <div className="spark-hero-dim" />
            <div className="spark-hero-copy">
              <p className="spark-greeting">{greeting}, {firstName}! 👋</p>
              <h1>Continue your adventure</h1>
              <p>Every conversation moves you closer to fluency.</p>
            </div>

            <article className="spark-current-mission">
              <div className="spark-current-mission-media">
                <img src={missionPreviewImage} alt={currentMissionLesson?.title ?? 'Mission preview'} />
              </div>
              <div className="spark-current-mission-body">
                <span className="spark-micro-chip">Current mission</span>
                <h2>{currentMissionLesson?.missionTitle ?? currentMissionLesson?.title ?? 'Airport Arrival'}</h2>
                <p>{currentMissionLesson?.emotionalContext ?? "You just landed in Boston. Let's get you through immigration."}</p>
                <div className="spark-current-meta">
                  <span>Chapter {currentMissionIndex + 1}</span>
                  <span>Scene 1 of {Math.max(mapNodes.length, 1)}</span>
                  <strong>In progress</strong>
                </div>
              </div>
            </article>

            <button className="spark-primary-cta" type="button" onClick={launchRun}>
              <span>Continue Mission</span>
              <ArrowRight size={18} />
            </button>
          </section>

          <section className="spark-home-section">
            <div className="spark-section-head">
              <div>
                <span className="spark-section-label">Your adventure map</span>
                <strong>Follow your next checkpoint</strong>
              </div>
              <button type="button" className="spark-link-button" onClick={() => playUiSound('click')}>
                View all <ChevronRight size={15} />
              </button>
            </div>

            <div className="spark-map-strip">
              {mapNodes.map((node, index) => (
                <article key={node.id} className={`spark-map-node is-${node.state}`}>
                  <div className="spark-map-node-visual">
                    <img src={node.image} alt={node.title} />
                  </div>
                  <div className="spark-map-node-step">{node.step}</div>
                  <strong>{node.title}</strong>
                  <span>{node.progressLabel}</span>
                  {index < mapNodes.length - 1 && <div className="spark-map-connector" />}
                </article>
              ))}
            </div>
          </section>

          <section className="spark-home-section">
            <div className="spark-section-head">
              <div>
                <span className="spark-section-label">Quick XP challenges</span>
                <strong>Keep the run alive</strong>
              </div>
              <button type="button" className="spark-link-button" onClick={launchRun}>
                See all <ChevronRight size={15} />
              </button>
            </div>

            <div className="spark-quick-grid">
              {quickChallenges.slice(0, 3).map((challenge) => {
                const Icon = challenge.Icon

                return (
                  <button
                    key={challenge.id}
                    type="button"
                    className={`spark-quick-card tone-${challenge.tone}${activeQuickChallenge?.id === challenge.id ? ' is-active' : ''}`}
                    onClick={() => {
                      setActiveFilter(challenge.tag)
                      setActiveChallengeId(challenge.id)
                      playUiSound('click')
                    }}
                  >
                    <div className="spark-quick-card-icon">
                      <Icon size={22} />
                    </div>
                    <strong>{challenge.label}</strong>
                    <span>{challenge.duration}</span>
                    <small>+{challenge.reward} XP</small>
                  </button>
                )
              })}
            </div>
          </section>

          {primaryMoment && currentMissionIndex < 0 && (
            <section className="spark-home-section">
              <div className="spark-section-head">
                <div>
                  <span className="spark-section-label">Real-life moments</span>
                  <strong>Practice real conversations</strong>
                </div>
                <button type="button" className="spark-link-button" onClick={launchRun}>
                  See all <ChevronRight size={15} />
                </button>
              </div>

              <article className="spark-real-life-card">
                <div className="spark-real-life-media">
                  <img src={primaryMoment.image} alt={primaryMoment.title} />
                </div>
                <div className="spark-real-life-copy">
                  <span>{primaryMoment.badge}</span>
                  <strong>{primaryMoment.title}</strong>
                  <p>{primaryMoment.hook}</p>
                  <div className="spark-moment-foot">
                    <small>{primaryMoment.duration}</small>
                    <button type="button" aria-label="Open moment" onClick={launchRun}>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </article>
            </section>
          )}

          {featuredInsight && (
            <section className="spark-home-section">
              <div className="spark-section-head">
              <div>
                <span className="spark-section-label">Emotional insight</span>
                <strong>Based on your conversations</strong>
              </div>
              </div>

              <article className="spark-insight-card">
                <div className="spark-insight-icon">
                  <Heart size={20} />
                </div>
                <div className="spark-insight-copy">
                  <strong>{featuredInsight.title}</strong>
                  <p>{featuredInsight.body}</p>
                </div>
                <div className="spark-insight-score">
                  <strong>{emotionalPulse.confidence}%</strong>
                  <span>This week</span>
                </div>
              </article>
            </section>
          )}

          <nav className="spark-bottom-nav">
            <button className="is-active" type="button" onClick={() => playUiSound('click')}>
              <Home size={18} />
              <span>Home</span>
            </button>
            <button type="button" onClick={() => playUiSound('click')}>
              <Map size={18} />
              <span>Map</span>
            </button>
            <button type="button" onClick={launchRun}>
              <Gamepad2 size={18} />
              <span>Practice</span>
            </button>
            <button type="button" onClick={() => playUiSound('click')}>
              <BookOpen size={18} />
              <span>Progress</span>
            </button>
            <button type="button" onClick={() => playUiSound('click')}>
              <UserRound size={18} />
              <span>Profile</span>
            </button>
          </nav>
        </section>

        <aside className="spark-companion-stack">
          <div className="spark-companion-label">MISSION SCENE (EXAMPLE)</div>
          <article className="spark-scene-card">
            <header className="spark-scene-topbar">
              <button type="button" className="spark-circle-icon is-back" onClick={() => playUiSound('click')}>
                <ChevronRight size={18} />
              </button>
              <div>
                <strong>{currentMissionLesson?.missionTitle ?? currentMissionLesson?.title ?? 'Airport Arrival'}</strong>
                <span>Scene 1 of {Math.max(mapNodes.length, 1)}</span>
              </div>
              <div className="spark-heart-pill">
                <Heart size={14} />
                <span>{Math.max(1, Math.round(emotionalPulse.confidence / 24))}</span>
              </div>
            </header>

            <div className="spark-scene-stage">
              <img src={missionSceneImage} alt={currentMissionLesson?.title ?? 'Mission scene'} className="spark-scene-bg" />
              <div className="spark-scene-overlay" />
            </div>

            <div className="spark-scene-prompt">
              <div>
                <span>{currentMissionLesson?.tensionLabel ?? 'Current mission'}</span>
                <strong>{activeExercise?.prompt ?? currentMissionLesson?.practicalGoal ?? 'Move the mission forward.'}</strong>
              </div>
              <Volume2 size={16} />
            </div>

            <div className="spark-scene-choice-list">
              {(activeExercise?.kind === 'multiple-choice' || activeExercise?.kind === 'listening') &&
                activeExercise.options.slice(0, 3).map((option) => {
                  const selected = choiceAnswers[activeExercise.id]
                  const isCorrect = selected !== null && option === activeExercise.correct
                  const isWrong = selected === option && option !== activeExercise.correct

                  return (
                    <button
                      key={option}
                      type="button"
                      className={`scene-option-button${selected === option ? ' is-selected' : ''}${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}`}
                      onClick={() => handleChoiceSelect(activeExercise.id, option)}
                    >
                      <span>{option}</span>
                      {selected === option && <Volume2 size={15} />}
                    </button>
                  )
                })}

              {activeExercise?.kind !== 'multiple-choice' && activeExercise?.kind !== 'listening' && (
                <>
                  <button type="button" className="scene-option-button is-selected" onClick={launchRun}>
                    <span>{currentMissionLesson?.practicalGoal ?? 'Move to the next checkpoint.'}</span>
                  </button>
                  <button type="button" className="scene-option-button" onClick={launchRun}>
                    <span>{currentMissionLesson?.emotionalGoal ?? 'Respond with more confidence.'}</span>
                  </button>
                  <button type="button" className="scene-option-button" onClick={launchRun}>
                    <span>{activeQuickChallenge?.caption ?? 'Keep the scene alive.'}</span>
                  </button>
                </>
              )}
            </div>

            <footer className="spark-scene-footer">
              <strong>{sceneSolved ? 'Great choice! You sound natural.' : currentMissionLesson?.emotionalGoal ?? 'Keep the scene moving.'}</strong>
              <div className="spark-scene-xp">
                <div className="spark-scene-progress">
                  {Array.from({ length: Math.max(5, Math.min(6, currentMissionQuizzes.length || 5)) }).map((_, index) => (
                    <span key={`scene-progress-${index}`} className={index < Math.max(1, completedCount) ? 'is-filled' : ''} />
                  ))}
                </div>
                <small>+{activeExercise?.reward ?? 15} XP</small>
              </div>
            </footer>
          </article>

          <div className="spark-companion-label">MAP SCREEN</div>
          <article className="spark-map-screen">
            <header className="spark-map-screen-head">
              <div>
                <strong>Your Adventure</strong>
                <span>Chapter {currentMissionIndex + 1} - {currentMissionLesson?.missionTitle ?? currentMissionLesson?.title ?? 'Current path'}</span>
              </div>
              <button type="button" className="spark-circle-icon" onClick={() => playUiSound('click')}>
                <Map size={16} />
              </button>
            </header>

            <div className="spark-map-screen-progress">
              <span>{adventureCompletionCount}/{mapNodes.length} completed</span>
              <strong>{adventureCompletionPercent}%</strong>
            </div>

            <div className="spark-map-screen-canvas">
              {mapNodes.slice(0, 5).map((node) => (
                <article key={`screen-${node.id}`} className={`spark-map-screen-node is-${node.state}`}>
                  <div className="spark-map-screen-node-art">
                    <img src={node.image} alt={node.title} />
                  </div>
                  <strong>{node.title}</strong>
                  <span>{node.progressLabel}</span>
                </article>
              ))}
            </div>

            <nav className="spark-map-screen-nav">
              <span className="is-active">Home</span>
              <span>Map</span>
              <span>Practice</span>
              <span>Progress</span>
              <span>Profile</span>
            </nav>
          </article>

          <div className="spark-companion-label">RESPONSIVE (MOBILE-FIRST)</div>
          <div className="spark-preview-stack">
            <article className="spark-preview-card">
              <div className="spark-preview-thumb">
                <img src={storyMedia.airport.hero} alt="Home mobile preview" />
              </div>
              <strong>Home</strong>
            </article>
            <article className="spark-preview-card">
              <div className="spark-preview-thumb">
                <img src={missionSceneImage} alt="Mission preview" />
              </div>
              <strong>Mission</strong>
            </article>
            <article className="spark-preview-card spark-preview-progress-card">
              <span>Level {profileLevel}</span>
              <strong>{heroXp} / 650 XP</strong>
              <div className="track soft">
                <div className="track-fill track-fill-hero" style={{ width: heroXpWidth }} />
              </div>
              <small>Confidence {emotionalPulse.confidence}%</small>
              <strong>Progress</strong>
            </article>
          </div>
        </aside>
      </main>

    </div>
  )
}

export default App

