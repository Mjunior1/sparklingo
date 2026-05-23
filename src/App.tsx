import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminScreen } from './admin/AdminScreen'
import { AuthEntry } from './auth/AuthEntry'
import { useAuth } from './auth/AuthProvider'
import { OnboardingScreen } from './auth/OnboardingScreen'
import {
  getAchievementCatalog,
  getLessonsCatalog,
  getQuizCatalog,
  getQuizQuestions,
  type AchievementCatalogItem,
  type LessonCatalogItem,
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
  Bell,
  BookOpen,
  CalendarDays,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  Grip,
  Headphones,
  Home,
  Map,
  Medal,
  Mic,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Store,
  Target,
  Trophy,
  UserRound,
  WandSparkles,
  Zap,
} from 'lucide-react'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type FilterKey = 'Todos' | 'Gramática' | 'Vocabulário' | 'Listening' | 'Reading' | 'Speaking'
type Difficulty = 'Fácil' | 'Médio'

type NavItem = {
  label: string
  icon: typeof Home
  active?: boolean
}

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

const navItems: NavItem[] = [
  { label: 'Início', icon: Home, active: true },
  { label: 'Missões', icon: Target },
  { label: 'Aulas', icon: BookOpen },
  { label: 'Quizzes', icon: Gamepad2 },
  { label: 'Desafios', icon: Flame },
  { label: 'Ranking', icon: Trophy },
  { label: 'Coleção', icon: Sparkles },
  { label: 'Perfil', icon: UserRound },
]

const dailyMissions = [
  { title: 'Ouça 3 áudios', progress: '2/3', xp: 30, progressValue: 67, icon: Headphones },
  { title: 'Acerte 5 perguntas', progress: '3/5', xp: 40, progressValue: 60, icon: Medal },
  { title: 'Estude 15 minutos', progress: '10/15', xp: 20, progressValue: 68, icon: Flame },
  { title: 'Complete 1 quiz', progress: '0/1', xp: 50, progressValue: 8, icon: Sparkles },
]

const lessonCards: LessonCatalogItem[] = [
  {
    category: 'Vocabulário',
    title: 'At the Airport',
    id: 'lesson-airport',
    progress: 60,
    image: '/pollinations/airport-card.png',
    tone: 'sky',
    blurb: 'Palavras visuais, objetos reais e micro-histórias para memorizar sem esforço.',
  },
  {
    category: 'Gramática',
    title: 'Present Simple',
    id: 'lesson-present-simple',
    progress: 40,
    image: '/pollinations/grammar-card.png',
    tone: 'violet',
    blurb: 'Regra rápida, exemplos vivos e desafios curtos que fixam o padrão.',
  },
  {
    category: 'Listening',
    title: 'Daily Routines',
    id: 'lesson-daily-routines',
    progress: 20,
    image: '/pollinations/listening-card.png',
    tone: 'mint',
    blurb: 'Áudios curtos e repetição inteligente para treinar ouvido e confiança.',
  },
]

const filters: FilterKey[] = ['Todos', 'Gramática', 'Vocabulário', 'Listening', 'Reading', 'Speaking']

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

const normalizeTokenOrder = (words: string[]) => words.map((word) => word.toLowerCase()).join('|')
const formatSentence = (words: string[]) => {
  const sentence = words.join(' ').replace(/\s([?.!,;:])/g, '$1')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}
const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

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
      const art = linkedQuiz?.coverArt || question.art

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

const mascotTitles: Record<MascotMood, string> = {
  guide: 'Spark está guiando sua run',
  cheer: 'Spark curtiu esse acerto',
  oops: 'Spark viu espaço para ajustar',
  streak: 'Spark entrou no modo combo',
}

const getExerciseMode = (exercise: Exercise) => {
  if (exercise.kind === 'drag-fill') return 'Drag challenge'
  if (exercise.kind === 'ordering') return 'Word shuffle'
  if (exercise.tag === 'Listening') return 'Audio sprint'
  return 'XP rush'
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeFilter, setActiveFilter] = useState<FilterKey>('Todos')
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string | null>>({})
  const [dragFillAnswers, setDragFillAnswers] = useState<Record<string, string | null>>({})
  const [speakingCompletions, setSpeakingCompletions] = useState<Record<string, boolean>>({})
  const [orderWordMap, setOrderWordMap] = useState<Record<string, string[]>>({})
  const [sessionStreak, setSessionStreak] = useState(0)
  const [mascotMood, setMascotMood] = useState<MascotMood>('guide')
  const [mascotLine, setMascotLine] = useState('Escolha um mini desafio e deixa comigo o ritmo da jornada.')
  const [activeReaction, setActiveReaction] = useState<ActiveReaction | null>(null)
  const [progressHydrated, setProgressHydrated] = useState(false)
  const [progressSnapshot, setProgressSnapshot] = useState<UserProgress | null>(null)
  const [lessonsCatalog, setLessonsCatalog] = useState<LessonCatalogItem[]>(lessonCards)
  const [quizCatalog, setQuizCatalog] = useState<QuizCatalogItem[]>([])
  const [achievementCatalog, setAchievementCatalog] = useState<AchievementCatalogItem[]>([])
  const [quizQuestionCatalog, setQuizQuestionCatalog] = useState<QuizQuestionItem[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(fallbackLeaderboard)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncMessage, setSyncMessage] = useState('Progresso local pronto para sincronizar.')
  const [view, setView] = useState<'home' | 'admin'>('home')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const previousOrderingSolved = useRef(false)
  const exercisePresentedAtRef = useRef<Record<string, number>>({})
  const responseTimesRef = useRef<Record<string, number>>({})
  const attemptCountsRef = useRef<Record<string, number>>({})
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioUnlockedRef = useRef(false)

  const runtimeExercises = useMemo(
    () => toRuntimeExercises(quizQuestionCatalog, quizCatalog),
    [quizCatalog, quizQuestionCatalog],
  )
  const quizCatalogCount = quizCatalog.length || runtimeExercises.length

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

  const totalAvailableXp = useMemo(() => runtimeExercises.reduce((sum, exercise) => sum + exercise.reward, 0), [runtimeExercises])
  const profileXp = progressSnapshot?.totalXp ?? profile?.xp ?? totalXp
  const streakDays = progressSnapshot?.streakDays ?? profile?.streak ?? 0
  const profileLevel = progressSnapshot?.level ?? profile?.level ?? 1
  const heroXp = Math.min(650, 350 + profileXp)
  const heroXpWidth = `${(heroXp / 650) * 100}%`
  const questFlow = [
    { label: 'Warm-up', done: completedCount >= 1 },
    { label: 'Flow', done: completedCount >= 3 },
    { label: 'Boss', done: completedCount >= 5 },
  ]
  const playTitle = completedCount === 0 ? 'Play agora' : completedCount < 3 ? 'Continuar run' : 'Fechar streak'
  const playCaption = completedCount === 0 ? '5 min de aventura guiada' : completedCount < 3 ? 'Você já engatou o ritmo' : 'Últimos desafios do combo'
  const sessionIntensity = Math.min(100, Math.round((totalXp / totalAvailableXp) * 100))
  const firstName = profile?.displayName?.split(' ')[0] ?? user?.displayName?.split(' ')[0] ?? 'learner'
  const isAdmin = profile?.role === 'admin'
  const currentMissionLesson = useMemo(() => {
    if (!lessonsCatalog.length) return null
    const unfinished = lessonsCatalog
      .filter((lesson) => lesson.progress < 100)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    return unfinished[0] ?? lessonsCatalog[0]
  }, [lessonsCatalog])
  const currentMissionArc = useMemo(
    () => currentMissionLesson?.journeyArc?.length ? currentMissionLesson.journeyArc : [currentMissionLesson?.title ?? ''],
    [currentMissionLesson],
  )
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
      .then(([nextProgress]) => {
        if (cancelled) return
        setChoiceAnswers((current) => ({ ...current, ...nextProgress.choiceAnswers }))
        setDragFillAnswers(nextProgress.dragFillAnswers ?? {})
        setSpeakingCompletions(nextProgress.speakingCompletions ?? {})
        setOrderWordMap(nextProgress.orderWordMap ?? {})
        setProgressSnapshot(nextProgress)
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

    const completedExerciseIds = runtimeExercises
      .filter((exercise) => isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions))
      .map((exercise) => exercise.id)

    const timeout = window.setTimeout(() => {
      setSyncState('saving')
      setSyncMessage('Salvando progresso da sessão...')
      void (async () => {
        try {
        const nextProgress = await saveUserProgress(user.uid, {
            totalXp,
            completedExerciseIds,
            choiceAnswers,
            dragFillAnswers,
            speakingCompletions,
            orderWordMap,
            recentMissionTheme: currentMissionLesson?.missionTitle ?? currentMissionLesson?.title ?? '',
            recentMissionContext: currentMissionLesson?.emotionalContext ?? '',
            emotional: emotionalPulse,
          })

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
              confidence: emotionalPulse.confidence,
              fluency: emotionalPulse.fluency,
              hesitation: emotionalPulse.hesitation,
              emotionalStreak: emotionalPulse.emotionalStreak,
              recentMissionTheme: currentMissionLesson?.missionTitle ?? currentMissionLesson?.title ?? '',
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
    totalXp,
    choiceAnswers,
    dragFillAnswers,
    orderWordMap,
    currentMissionLesson?.emotionalContext,
    currentMissionLesson?.missionTitle,
    currentMissionLesson?.title,
    emotionalPulse,
    patchProfile,
    profile,
    runtimeExercises,
    speakingCompletions,
  ])

  useEffect(() => {
    if (!user || !progressHydrated) return

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

    const timeout = window.setTimeout(() => {
      setSyncState('saving')
      setSyncMessage('Atualizando progresso das aulas...')
      void saveLessonProgressMap(user.uid, nextLessonProgress)
        .then(() => {
          setLessonsCatalog((current) => current.map((lesson) => ({
            ...lesson,
            progress: nextLessonProgress[lesson.id] ?? lesson.progress,
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
  }, [user, progressHydrated, choiceAnswers, dragFillAnswers, orderWordMap, quizQuestionCatalog, runtimeExercises, speakingCompletions])

  useEffect(() => {
    if (!user || !progressHydrated) return

    const timeout = window.setTimeout(() => {
      const quizWrites = runtimeExercises.map((exercise) => {
        const questionSource = quizQuestionCatalog.find((question) => question.id === exercise.id)
        const completed = isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)
        const attempts = getExerciseAttempts(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions)

        return saveQuizProgress(user.uid, {
          quizId: exercise.id,
          lessonId: questionSource?.lessonId ?? '',
          skillId: skillByTag[exercise.tag as Exclude<FilterKey, 'Todos'>],
          completed,
          attempts,
          correct: completed,
          xpEarned: completed ? exercise.reward : 0,
        })
      })

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

      const skillWrites = Object.entries(skillStats).map(([skillId, stats]) => saveSkillProgress(user.uid, {
        skillId,
        xpEarned: stats.xp,
        completedQuizzes: stats.solved,
        accuracy: stats.total ? (stats.solved / stats.total) * 100 : 0,
      }))

      void Promise.all([...quizWrites, ...skillWrites])
    }, 520)

    return () => window.clearTimeout(timeout)
  }, [user, progressHydrated, choiceAnswers, dragFillAnswers, orderWordMap, quizQuestionCatalog, runtimeExercises, speakingCompletions])

  useEffect(() => {
    if (!user || !sessionId || sessionStartedAt === null) return

    const timeout = window.setTimeout(() => {
      void (async () => {
        const endedAt = Date.now()
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

        const completedExerciseIds = runtimeExercises
          .filter((exercise) => isExerciseSolved(exercise, choiceAnswers, dragFillAnswers, orderWordMap, speakingCompletions))
          .map((exercise) => exercise.id)

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
  }, [user, sessionId, sessionStartedAt, totalXp, completedCount, sessionStreak, choiceAnswers, dragFillAnswers, orderWordMap, runtimeExercises, speakingCompletions])

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

  const resetChoice = (id: MultipleChoiceExercise['id']) => {
    setChoiceAnswers((current) => ({ ...current, [id]: null }))
    setMascotMood('guide')
    setMascotLine('Boa. Respira e tenta de novo com calma.')
    playUiSound('click')
  }

  const clearDragFill = (exerciseId: string) => {
    setDragFillAnswers((current) => ({ ...current, [exerciseId]: null }))
  }

  const handleDragFillEnd = (exerciseId: string, event: DragEndEvent) => {
    const draggedWord = String(event.active.id)
    if (event.over?.id !== `drag-fill-slot-${exerciseId}` || dragFillAnswers[exerciseId] === draggedWord) return

    const exercise = runtimeExercises.find((item): item is DragFillExercise => item.id === exerciseId && item.kind === 'drag-fill')
    if (!exercise) return

    const isCorrect = draggedWord === exercise.correct
    registerExerciseAttempt(exercise.id)
    setDragFillAnswers((current) => ({ ...current, [exerciseId]: draggedWord }))
    if (user) {
      void trackProductEvent(user.uid, isCorrect ? 'quiz_completed' : 'quiz_failed', {
        quizId: exercise.id,
        answer: draggedWord,
      })
    }
    triggerMoment({
      exerciseId: exercise.id,
      correct: isCorrect,
      reward: exercise.reward,
      successLine: 'Acertou no encaixe. O combo segue vivo.',
      errorLine: 'Essa peça não encaixou. Solta outra e continua.',
    })
  }

  const handleOrderingEnd = (exerciseId: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    registerExerciseAttempt(exerciseId)

    setOrderWordMap((current) => {
      const words = current[exerciseId] ?? []
      const oldIndex = words.indexOf(String(active.id))
      const newIndex = words.indexOf(String(over.id))
      if (oldIndex < 0 || newIndex < 0) return current
      return { ...current, [exerciseId]: arrayMove(words, oldIndex, newIndex) }
    })
  }

  const resetOrdering = (exercise: OrderingExercise) => {
    setOrderWordMap((current) => ({ ...current, [exercise.id]: [...exercise.scrambled] }))
  }

  const handleSpeakingComplete = (exerciseId: string) => {
    const exercise = runtimeExercises.find((item): item is SpeakingExercise => item.id === exerciseId && item.kind === 'speaking')
    if (!exercise || speakingCompletions[exerciseId]) return

    registerExerciseAttempt(exerciseId)
    setSpeakingCompletions((current) => ({ ...current, [exerciseId]: true }))
    if (user) {
      void trackProductEvent(user.uid, 'quiz_completed', {
        quizId: exerciseId,
        mode: 'speaking',
      })
    }
    triggerMoment({
      exerciseId,
      correct: true,
      reward: exercise.reward,
      successLine: 'Boa. Sua voz entrou no contexto da missão.',
      errorLine: '',
    })
  }

  const launchRun = () => {
    setMascotMood('guide')
    setMascotLine('A aventura começou. Fecha um warm-up e eu acelero o combo.')
    playUiSound('play')
    if (user) {
      const startedAt = Date.now()
      setSessionStartedAt(startedAt)
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <WandSparkles size={20} strokeWidth={2.25} />
          </div>
          <div>
            <strong>SparkLingo</strong>
            <span>play to learn</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.label} className={`nav-pill${item.active ? ' active' : ''}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
          {isAdmin && (
            <button className={`nav-pill${view === 'admin' ? ' active' : ''}`} onClick={() => setView('admin')}>
              <Crown size={18} />
              <span>Admin</span>
            </button>
          )}
        </nav>

        <div className="sidebar-streak">
          <p className="sidebar-streak-label">
            <Flame size={16} />
            Sequência
          </p>
          <strong>{streakDays} dias!</strong>
          <div className="sidebar-creature">
            <img src="/pollinations/sidebar-mascot.png" alt="Spark, mascote do SparkLingo" className="sidebar-mascot-image" />
          </div>
          <button>Keep going!</button>
        </div>
      </aside>

      <main className="main-panel">
        <section className="hero-card">
          <div className="hero-copy">
            <div className="hero-topbar">
              <div className="hero-intro">
                <p className="micro-label">Hey, {firstName}!</p>
                <h1>{platformConfig?.heroHeadline ?? 'Vamos turbinar seu inglês hoje?'}</h1>
                <p className="hero-subtitle">
                  {platformConfig?.heroSubtitle ?? 'Missões curtas, exercícios vivos e uma trilha com energia de jogo, não de dashboard.'}
                </p>
              </div>
            </div>

            <div className="hero-status">
              <div className="status-pill"><Flame size={16} /> 25</div>
              <div className="status-pill"><Gem size={16} /> 340</div>
              <div className="status-pill"><Bell size={16} /> 1</div>
              <div className={`status-pill sync-pill sync-pill-${syncState}`}>
                <Zap size={16} />
                {syncState === 'saving' ? 'salvando' : syncState === 'saved' ? 'sincronizado' : syncState === 'error' ? 'erro' : 'local'}
              </div>
              <button className="avatar-pill avatar-action" onClick={() => signOut()} title="Sair" type="button">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="avatar-image" />
                ) : (
                  <UserRound size={18} />
                )}
              </button>
            </div>

            <p className={`sync-caption sync-caption-${syncState}`}>{syncMessage}</p>

            <div className="hero-quick-grid">
              <article className="hero-quick-card">
                <span>Missão ativa</span>
                <strong>{currentMissionLesson?.missionTitle ?? currentMissionLesson?.title ?? `${profile?.focusSkill ?? 'Listening'} pack`}</strong>
                <small>{currentMissionLesson?.practicalGoal ?? profile?.learningGoal ?? '1 aula visual + 2 desafios curtos'}</small>
              </article>
              <article className="hero-quick-card">
                <span>Confiança percebida</span>
                <strong>{emotionalPulse.confidence}% de confiança</strong>
                <small>Fluidez {emotionalPulse.fluency}% • hesitação {emotionalPulse.hesitation}%</small>
              </article>
              <article className="hero-quick-card">
                <span>Próxima cena</span>
                <strong>{currentMissionLesson?.nextMissionHook ?? currentMissionArc[1] ?? 'Continue a jornada'}</strong>
                <small>{currentMissionLesson?.urgencyNote ?? 'Sua narrativa continua de forma contextual.'}</small>
              </article>
            </div>

            <div className="hero-progress-row">
              <div className="level-chip">
                <span>Nível</span>
                <strong>{profileLevel}</strong>
              </div>

              <div className="hero-progress-panel">
                <div className="hero-progress-head">
                  <span>XP</span>
                  <span>{heroXp} / 650</span>
                </div>
                <div className="track">
                  <div className="track-fill track-fill-hero" style={{ width: heroXpWidth }} />
                </div>
              </div>

              <div className="gift-chip">
                <Gift size={22} />
              </div>
            </div>

            <div className="hero-badges">
              <div className="hero-badge">
                <Star size={16} />
                <span>{streakDays} dias seguidos</span>
              </div>
              <div className="hero-badge">
                <Sparkles size={16} />
                <span>{currentMissionLesson?.tensionLabel ?? `${quizCatalogCount} desafios no catálogo`}</span>
              </div>
              <div className="hero-badge">
                <Medal size={16} />
                <span>Confiança {emotionalPulse.confidence}%</span>
              </div>
            </div>

            <div className="hero-actions">
              <button className="hero-primary hero-primary-play" onClick={launchRun}>
                <Play size={18} fill="currentColor" />
                <span>
                  <strong>{playTitle}</strong>
                  <small>{playCaption}</small>
                </span>
              </button>
              <button className="hero-secondary" onClick={() => playUiSound('click')}>Ver trilha</button>
            </div>

            <div className={`mascot-console mascot-console-${mascotMood}`}>
              <div className="mascot-console-avatar">
                <img src="/pollinations/sidebar-mascot.png" alt="Spark reagindo à sua sessão" className="mascot-console-image" />
              </div>
              <div className="mascot-console-copy">
                <span>Spark ao vivo</span>
                <strong>{mascotTitles[mascotMood]}</strong>
                <p>{mascotLine} {currentMissionLesson?.emotionalGoal ? `Objetivo emocional: ${currentMissionLesson.emotionalGoal}.` : ''}</p>
              </div>
              <div className="mascot-console-stats">
                <span>Domínio percebido</span>
                <strong>{emotionalPulse.confidence}%</strong>
              </div>
            </div>

            <div className="quest-rail">
              {questFlow.map((step, index) => (
                <div key={step.label} className={`quest-node${step.done ? ' done' : ''}${index === completedCount % questFlow.length ? ' live' : ''}`}>
                  <div className="quest-node-dot">{index + 1}</div>
                  <div className="quest-node-copy">
                    <strong>{step.label}</strong>
                    <span>{step.done ? 'Concluído' : currentMissionArc[index] ?? 'Próximo passo'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hero-highlight-row">
              <article className="hero-highlight hero-highlight-gold">
                <p>Tensão da missão</p>
                <strong>{currentMissionLesson?.emotionalContext ?? 'Complete 3 atividades hoje'}</strong>
                <span>{currentMissionLesson?.confidenceTarget ?? 'Ganhe uma caixa surpresa e mantenha sua streak viva.'}</span>
              </article>
              <article className="hero-highlight hero-highlight-soft">
                <p>Adaptação invisível</p>
                <strong>{profile?.dailyMinutes ?? 5} minutos por sessão</strong>
                <span>{emotionalPulse.weakSkills.length ? `Spark vai reforçar ${emotionalPulse.weakSkills.join(' e ')} sem quebrar a fluidez.` : 'Perfeito para estudar entre tarefas sem perder o ritmo.'}</span>
              </article>
            </div>
          </div>

          <div className="hero-scene">
            <div className="hero-scene-label">Adventure mode</div>
            <div className="hero-scene-panel">
              <div className="hero-orb hero-orb-left" />
              <div className="hero-orb hero-orb-right" />
              <div className="hero-speech hero-speech-top">Let&apos;s learn!</div>
              <div className="hero-scene-image-wrap">
                <img src="/pollinations/hero-scene.png" alt="Cena principal do SparkLingo com mascote em palco lilás" className="hero-scene-image" />
              </div>
              <div className="hero-stat-card hero-stat-card-top">
                <Zap size={16} />
                <div>
                  <strong>+120 XP</strong>
                  <span>Semana passada</span>
                </div>
              </div>
            </div>
            <div className="hero-scene-footer">
              <article className="scene-mini-card">
                <span className="scene-mini-kicker"><Star size={14} /> Destaque</span>
                <strong>Sessão com streak viva</strong>
              </article>
              <article className="scene-mini-card">
                <span className="scene-mini-kicker"><Target size={14} /> Meta</span>
                <strong>Missões do dia em progresso</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="journey-section">
          <div className="section-heading-row">
            <div className="section-heading-copy">
              <p className="micro-label">Sua trilha</p>
              <h2>Continue sua jornada</h2>
            </div>
            <div className="journey-meta-pill">
              <Sparkles size={16} />
              <span>Escolha uma aula com mais cara de aventura</span>
            </div>
          </div>

          <div className="lesson-showcase">
            {lessonsCatalog.map((lesson, index) => (
              <article
                key={lesson.title}
                className={`lesson-card lesson-tone-${lesson.tone}${index === 0 ? ' is-featured' : ''}${index === 1 ? ' is-mid' : ''}`}
              >
                <div className="lesson-copy">
                  <span>{lesson.category}</span>
                  <strong>{lesson.title}</strong>
                  <p className="lesson-description">{lesson.blurb}</p>
                </div>
                <img src={lesson.image} alt={lesson.title} className="lesson-card-image" />
                <div className="track soft">
                  <div className="track-fill green" style={{ width: `${lesson.progress}%` }} />
                </div>
                <small>{lesson.progress}% concluído</small>
              </article>
            ))}
          </div>
        </section>

        <section className="mission-band mission-band-standalone">
          <div className="mission-band-head">
            <div>
              <p className="micro-label">Missões do dia</p>
              <h2>Blocos rápidos para manter ritmo</h2>
            </div>
            <button className="ghost-link">Ver todas</button>
          </div>

          <div className="mission-grid">
            {dailyMissions.map((mission) => {
              const Icon = mission.icon
              return (
                <article key={mission.title} className="mission-tile">
                  <div className="mission-icon">
                    <Icon size={18} />
                  </div>
                  <div className="mission-content">
                    <strong>{mission.title}</strong>
                    <span>{mission.progress}</span>
                  </div>
                  <div className="mission-bottom">
                    <div className="micro-track">
                      <span style={{ width: `${mission.progressValue}%` }} />
                    </div>
                    <small>{mission.xp} XP</small>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="quiz-zone">
          <div className="quiz-zone-hero">
            <div className="quiz-zone-copy-block">
              <p className="micro-label">Escolha seu quiz</p>
              <h2>Aprender com cara de jogo, não de formulário</h2>
              <p className="quiz-zone-copy">
                Um catálogo de desafios com visuais vivos, feedback imediato e microvitórias espalhadas pela jornada.
              </p>
            </div>

            <div className="quiz-zone-chip">
              <Target size={18} />
              <span>Desafios curtos, ritmo alto, impacto visual maior</span>
            </div>
          </div>

          <div className="dashboard-layout">
            <div className="dashboard-main">
              <div className="run-state-bar">
                <div className="run-stat run-stat-primary">
                  <Play size={16} fill="currentColor" />
                  <span>Run ativa</span>
                  <strong>{completedCount}/{runtimeExercises.length}</strong>
                </div>
                <div className="run-stat">
                  <Flame size={16} />
                  <span>Combo</span>
                  <strong>x{Math.max(sessionStreak, 1)}</strong>
                </div>
                <div className="run-stat">
                  <Zap size={16} />
                  <span>XP sessão</span>
                  <strong>{totalXp}</strong>
                </div>
                <div className="run-energy">
                  <span>Energia da run</span>
                  <div className="track soft">
                    <div className="track-fill" style={{ width: `${sessionIntensity}%` }} />
                  </div>
                </div>
              </div>

              <div className="filter-row">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    className={`filter-chip${filter === activeFilter ? ' active' : ''}`}
                    onClick={() => {
                      setActiveFilter(filter)
                      playUiSound('click')
                    }}
                  >
                    {filter}
                  </button>
                ))}
                <button className="icon-chip" aria-label="Pesquisa" onClick={() => playUiSound('click')}>
                  <Search size={16} />
                </button>
              </div>

              <div className="exercise-grid">
                {visibleExercises.map((exercise) => {
                  const exerciseTagClass = exercise.tag.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')

                  if (exercise.kind === 'multiple-choice' || exercise.kind === 'listening') {
                    const selected = choiceAnswers[exercise.id]
                    const isCorrect = selected === exercise.correct
                    const isWrong = selected !== null && selected !== exercise.correct

                    return (
                      <article key={exercise.id} className={`exercise-card exercise-card-${exerciseTagClass}`}>
                        <div className="exercise-glow" />
                        {activeReaction?.exerciseId === exercise.id && (
                          <div className={`exercise-burst exercise-burst-${activeReaction.kind}`}>{activeReaction.label}</div>
                        )}
                        <div className="exercise-head">
                          <span className="exercise-kicker">{exercise.kicker}</span>
                          <span className={`difficulty-pill ${exercise.difficulty === 'Fácil' ? 'easy' : 'medium'}`}>
                            {exercise.difficulty}
                          </span>
                        </div>

                        <div className="exercise-topline">
                          <div>
                            <h3>{exercise.title}</h3>
                            <p>{exercise.prompt}</p>
                          </div>
                          <img src={exercise.art} alt={exercise.artAlt} className="exercise-art" />
                        </div>

                        <div className="mini-game-strip">
                          <span><Zap size={14} /> {getExerciseMode(exercise)}</span>
                          <span><Flame size={14} /> combo x{Math.max(sessionStreak, 1)}</span>
                        </div>

                        {exercise.kind === 'listening' && (
                          <div className="audio-player">
                            <button className="play-circle" aria-label="Tocar áudio">
                              <Play size={18} fill="currentColor" />
                            </button>
                            <div className="wave-bar">
                              <div className="wave-lines" />
                            </div>
                            <span>0:05</span>
                          </div>
                        )}

                        <div className="options-column">
                          {exercise.options.map((option, index) => {
                            const letter = String.fromCharCode(65 + index)
                            const showCorrect = selected !== null && option === exercise.correct
                            const showWrong = selected === option && option !== exercise.correct

                            return (
                              <button
                                key={option}
                                className={`option-card${showCorrect ? ' is-correct' : ''}${showWrong ? ' is-wrong' : ''}${selected === option ? ' is-selected' : ''}`}
                                onClick={() => handleChoiceSelect(exercise.id, option)}
                              >
                                <span className="option-letter">{letter}</span>
                                <span className="option-copy">{option}</span>
                                {showCorrect && <span className="option-state">✓</span>}
                                {showWrong && <span className="option-state">✕</span>}
                              </button>
                            )
                          })}
                        </div>

                        <div className={`feedback-strip${isCorrect ? ' success' : ''}${isWrong ? ' error' : ''}`}>
                          <span>{isCorrect ? exercise.explanation : isWrong ? `Quase. ${exercise.explanation}` : 'Dica'}</span>
                          <div className="feedback-actions">
                            <strong>⚡ {exercise.reward} XP</strong>
                            {isWrong && (
                              <button className="retry-link" onClick={() => resetChoice(exercise.id)}>
                                Tentar de novo
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  }

                  if (exercise.kind === 'drag-fill') {
                    const currentDragAnswer = dragFillAnswers[exercise.id] ?? null
                    const isCorrect = currentDragAnswer === exercise.correct
                    const isWrong = currentDragAnswer !== null && currentDragAnswer !== exercise.correct

                    return (
                      <article key={exercise.id} className={`exercise-card exercise-card-${exerciseTagClass}`}>
                        <div className="exercise-glow" />
                        {activeReaction?.exerciseId === exercise.id && (
                          <div className={`exercise-burst exercise-burst-${activeReaction.kind}`}>{activeReaction.label}</div>
                        )}
                        <div className="exercise-head">
                          <span className="exercise-kicker">{exercise.kicker}</span>
                          <span className={`difficulty-pill ${exercise.difficulty === 'Fácil' ? 'easy' : 'medium'}`}>
                            {exercise.difficulty}
                          </span>
                        </div>

                        <div className="exercise-topline">
                          <div>
                            <h3>{exercise.title}</h3>
                            <p>{exercise.prompt}</p>
                          </div>
                          <img src={exercise.art} alt={exercise.artAlt} className="exercise-art" />
                        </div>

                        <div className="mini-game-strip">
                          <span><Grip size={14} /> {getExerciseMode(exercise)}</span>
                          <span><Target size={14} /> acerto instantâneo</span>
                        </div>

                        <DndContext sensors={sensors} onDragEnd={(event) => handleDragFillEnd(exercise.id, event)}>
                          <div className="sentence-card">
                            <span>{exercise.sentenceBefore}</span>
                            <DropSlot
                              id={`drag-fill-slot-${exercise.id}`}
                              value={currentDragAnswer}
                              isCorrect={isCorrect}
                              isWrong={isWrong}
                              onClear={() => clearDragFill(exercise.id)}
                            />
                            <span>{exercise.sentenceAfter}</span>
                          </div>

                          <div className="token-bank">
                            {exercise.options.map((option) => (
                              <DraggableToken key={option} id={option} disabled={currentDragAnswer === option} label={option} />
                            ))}
                          </div>
                        </DndContext>

                        <div className={`feedback-strip${isCorrect ? ' success' : ''}${isWrong ? ' error' : ''}`}>
                          <span>
                            {isCorrect
                              ? exercise.explanation
                              : isWrong
                                ? `A palavra certa é "${exercise.correct}". ${exercise.explanation}`
                                : 'Arraste uma opção para a lacuna.'}
                          </span>
                          <strong>⚡ {exercise.reward} XP</strong>
                        </div>
                      </article>
                    )
                  }

                  if (exercise.kind === 'speaking') {
                    const speakingDone = speakingCompletions[exercise.id] === true

                    return (
                      <article key={exercise.id} className={`exercise-card exercise-card-${exerciseTagClass}`}>
                        <div className="exercise-glow" />
                        {activeReaction?.exerciseId === exercise.id && (
                          <div className={`exercise-burst exercise-burst-${activeReaction.kind}`}>{activeReaction.label}</div>
                        )}
                        <div className="exercise-head">
                          <span className="exercise-kicker">{exercise.kicker}</span>
                          <span className={`difficulty-pill ${exercise.difficulty === 'Fácil' ? 'easy' : 'medium'}`}>
                            {exercise.difficulty}
                          </span>
                        </div>

                        <div className="exercise-topline">
                          <div>
                            <h3>{exercise.title}</h3>
                            <p>{exercise.prompt}</p>
                          </div>
                          <img src={exercise.art} alt={exercise.artAlt} className="exercise-art" />
                        </div>

                        <div className="mini-game-strip">
                          <span><Mic size={14} /> Speaking confidence</span>
                          <span><Target size={14} /> {exercise.contextCue ?? 'responda em voz alta para destravar a próxima cena'}</span>
                        </div>

                        <div className={`speaking-stage${speakingDone ? ' is-done' : ''}`}>
                          <div className="speaking-orb">
                            <Mic size={20} />
                          </div>
                          <div className="speaking-copy">
                            <strong>{speakingDone ? 'Resposta registrada' : 'Momento de voz'}</strong>
                            <span>{speakingDone ? 'Spark marcou este speaking como concluído.' : 'Fale em voz alta, ganhe confiança e depois confirme a conclusão.'}</span>
                          </div>
                          <button className="hero-secondary speaking-cta" type="button" onClick={() => handleSpeakingComplete(exercise.id)}>
                            {speakingDone ? 'Concluído' : 'Já respondi'}
                          </button>
                        </div>

                        <div className={`feedback-strip${speakingDone ? ' success' : ''}`}>
                          <span>{speakingDone ? exercise.explanation : exercise.contextCue ?? 'Respire, responda curto e continue a missão.'}</span>
                          <strong>⚡ {exercise.reward} XP</strong>
                        </div>
                      </article>
                    )
                  }

                  const currentOrderWords = orderWordMap[exercise.id] ?? exercise.scrambled
                  const isOrdered = normalizeTokenOrder(currentOrderWords) === normalizeTokenOrder(exercise.solution)

                  return (
                    <article key={exercise.id} className={`exercise-card exercise-card-${exerciseTagClass}`}>
                      <div className="exercise-glow" />
                      {activeReaction?.exerciseId === exercise.id && (
                        <div className={`exercise-burst exercise-burst-${activeReaction.kind}`}>{activeReaction.label}</div>
                      )}
                      <div className="exercise-head">
                        <span className="exercise-kicker">{exercise.kicker}</span>
                        <span className={`difficulty-pill ${exercise.difficulty === 'Fácil' ? 'easy' : 'medium'}`}>
                          {exercise.difficulty}
                        </span>
                      </div>

                      <div className="exercise-topline">
                        <div>
                          <h3>{exercise.title}</h3>
                          <p>{exercise.prompt}</p>
                        </div>
                        <img src={exercise.art} alt={exercise.artAlt} className="exercise-art" />
                      </div>

                      <div className="mini-game-strip">
                        <span><Sparkles size={14} /> {getExerciseMode(exercise)}</span>
                        <span><Zap size={14} /> ordem perfeita rende bônus</span>
                      </div>

                      <DndContext sensors={sensors} onDragEnd={(event) => handleOrderingEnd(exercise.id, event)}>
                        <SortableContext items={currentOrderWords} strategy={horizontalListSortingStrategy}>
                          <div className="ordering-lane">
                            {currentOrderWords.map((word) => (
                              <SortableWord key={word} id={word} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

                      <div className={`feedback-strip${isOrdered ? ' success' : ''}`}>
                        <span>{isOrdered ? `Perfeito: ${formatSentence(exercise.solution)}` : exercise.explanation}</span>
                        <div className="feedback-actions">
                          <strong>⚡ {exercise.reward} XP</strong>
                          <button className="retry-link" onClick={() => resetOrdering(exercise)}>
                            <RotateCcw size={14} />
                            Resetar
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            <aside className="dashboard-rail">
              <article className="rail-card progress-card">
                <h3>Seu progresso</h3>
                <div className="progress-ring">
                  <div className="ring-core">
                    <strong>{Math.min(100, Math.round((profileXp / 650) * 100))}%</strong>
                    <span>do nível {profileLevel}</span>
                  </div>
                </div>
                <p>XP persistido no Firestore e sincronizado com sua conta.</p>
                <button>Ver progresso</button>
              </article>

              <article className="rail-card streak-rail">
                <Flame size={44} />
                <strong>{streakDays}</strong>
                <span>dias</span>
                <small>Incrível</small>
              </article>

              <article className="rail-card ranking-card">
                <h3>Ranking semanal</h3>
                <ul>
                  {leaderboard.map((player, index) => (
                    <li key={player.name} className={player.highlighted ? 'is-you' : ''}>
                      <span>{index + 1}. {player.name}</span>
                      <strong>{player.xp}</strong>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rail-card badges-card">
                <h3>Conquistas recentes</h3>
                <div className="badge-row">
                  {achievementCatalog.slice(0, 3).map((achievement) => (
                    <span key={achievement.id} className="badge" title={achievement.title}>
                      {achievement.icon === 'headphones' && <Headphones size={22} />}
                      {achievement.icon === 'star' && <Star size={22} />}
                      {achievement.icon === 'target' && <Target size={22} />}
                    </span>
                  ))}
                </div>
                <small>{completedCount} de {runtimeExercises.length} desafios concluídos</small>
              </article>

              <article className="challenge-card">
                <div className="challenge-head">
                  <Trophy size={28} />
                  <span>Desafio especial</span>
                </div>
                <strong>Complete {Math.min(5, Math.max(3, quizCatalogCount))} quizzes esta semana e ganhe 100 gemas!</strong>
                <div className="track dark">
                  <div className="track-fill gold" style={{ width: '40%' }} />
                </div>
                <button>Quero ganhar!</button>
              </article>
            </aside>
          </div>
        </section>

        <section className="stats-footer">
          <article className="footer-card">
            <p>XP da sessão</p>
            <strong>{totalXp} XP</strong>
            <div className="dot-row">
              <span className="on" />
              <span className="on" />
              <span className="on" />
              <span className="on" />
              <span className="off" />
              <span className="off" />
            </div>
          </article>
          <article className="footer-card">
            <p>Weekly goal</p>
            <strong>70 / 100 estrelas</strong>
            <div className="track soft">
              <div className="track-fill" style={{ width: '70%' }} />
            </div>
          </article>
          <article className="footer-card">
            <p>Streak</p>
            <strong>{streakDays} dias seguidos</strong>
            <div className="mini-pills">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
            </div>
          </article>
        </section>

        <footer className="bottom-dock">
          <button onClick={() => playUiSound('click')}><Map size={16} /> Mapa</button>
          <button onClick={() => playUiSound('click')}><Search size={16} /> Review</button>
          <button className="dock-primary" onClick={launchRun}><Play size={16} /> Play</button>
          <button onClick={() => playUiSound('click')}><Store size={16} /> Store</button>
          <button onClick={() => playUiSound('click')}><CalendarDays size={16} /> Eventos</button>
        </footer>
      </main>
    </div>
  )
}

function DraggableToken({ id, label, disabled }: { id: string; label: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled })

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`token-pill${isDragging ? ' dragging' : ''}${disabled ? ' disabled' : ''}`}
      {...listeners}
      {...attributes}
    >
      <Grip size={14} />
      {label}
    </button>
  )
}

function DropSlot({
  id,
  value,
  isCorrect,
  isWrong,
  onClear,
}: {
  id: string
  value: string | null
  isCorrect: boolean
  isWrong: boolean
  onClear: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <button
      ref={setNodeRef}
      className={`drop-slot${isOver ? ' over' : ''}${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}`}
      onClick={() => value && onClear()}
    >
      {value ?? 'solte aqui'}
    </button>
  )
}

function SortableWord({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`sortable-word${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      {id}
    </button>
  )
}

export default App
