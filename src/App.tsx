import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AuthScreen } from './auth/AuthScreen'
import { useAuth } from './auth/AuthProvider'
import {
  Bell,
  BookOpen,
  CalendarDays,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  Grip,
  Headphones,
  Home,
  Map,
  Medal,
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

type LessonCard = {
  category: string
  title: string
  progress: number
  image: string
  tone: 'sky' | 'violet' | 'mint'
  blurb: string
}

type MultipleChoiceExercise = {
  id: 'q1' | 'q3' | 'q4' | 'q6'
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

type DragFillExercise = {
  id: 'q2'
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
  id: 'q5'
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

type Exercise = MultipleChoiceExercise | DragFillExercise | OrderingExercise
type MascotMood = 'guide' | 'cheer' | 'oops' | 'streak'
type ActiveReaction = {
  exerciseId: Exercise['id']
  kind: 'success' | 'error'
  label: string
}

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

const lessonCards: LessonCard[] = [
  {
    category: 'Vocabulário',
    title: 'At the Airport',
    progress: 60,
    image: '/pollinations/airport-card.png',
    tone: 'sky',
    blurb: 'Palavras visuais, objetos reais e micro-histórias para memorizar sem esforço.',
  },
  {
    category: 'Gramática',
    title: 'Present Simple',
    progress: 40,
    image: '/pollinations/grammar-card.png',
    tone: 'violet',
    blurb: 'Regra rápida, exemplos vivos e desafios curtos que fixam o padrão.',
  },
  {
    category: 'Listening',
    title: 'Daily Routines',
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

const leaderboard = [
  { name: 'Kate', xp: '1250 XP' },
  { name: 'You', xp: '980 XP', highlighted: true },
  { name: 'Mark', xp: '870 XP' },
  { name: 'Sam', xp: '690 XP' },
]

const normalizeTokenOrder = (words: string[]) => words.map((word) => word.toLowerCase()).join('|')
const formatSentence = (words: string[]) => {
  const sentence = words.join(' ').replace(/\s([?.!,;:])/g, '$1')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
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

function App() {
  const { status, user, profile, signOut, platformConfig } = useAuth()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeFilter, setActiveFilter] = useState<FilterKey>('Todos')
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string | null>>({
    q1: null,
    q3: null,
    q4: null,
    q6: null,
  })
  const [dragFillAnswer, setDragFillAnswer] = useState<string | null>(null)
  const [orderWords, setOrderWords] = useState<string[]>(['you', 'Where', 'are', 'from', '?'])
  const [sessionStreak, setSessionStreak] = useState(0)
  const [mascotMood, setMascotMood] = useState<MascotMood>('guide')
  const [mascotLine, setMascotLine] = useState('Escolha um mini desafio e deixa comigo o ritmo da jornada.')
  const [activeReaction, setActiveReaction] = useState<ActiveReaction | null>(null)
  const previousOrderingSolved = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  const orderingSolved = useMemo(() => {
    const orderingExercise = exercises.find((exercise): exercise is OrderingExercise => exercise.kind === 'ordering')
    return orderingExercise ? normalizeTokenOrder(orderWords) === normalizeTokenOrder(orderingExercise.solution) : false
  }, [orderWords])

  const visibleExercises = useMemo(() => {
    if (activeFilter === 'Todos') return exercises
    return exercises.filter((exercise) => exercise.tag === activeFilter)
  }, [activeFilter])

  const completedCount = useMemo(() => {
    return exercises.filter((exercise) => {
      if (exercise.kind === 'multiple-choice') return choiceAnswers[exercise.id] === exercise.correct
      if (exercise.kind === 'drag-fill') return dragFillAnswer === exercise.correct
      return orderingSolved
    }).length
  }, [choiceAnswers, dragFillAnswer, orderingSolved])

  const totalXp = useMemo(() => {
    let xp = 0
    exercises.forEach((exercise) => {
      if (exercise.kind === 'multiple-choice' && choiceAnswers[exercise.id] === exercise.correct) xp += exercise.reward
      if (exercise.kind === 'drag-fill' && dragFillAnswer === exercise.correct) xp += exercise.reward
      if (exercise.kind === 'ordering' && orderingSolved) xp += exercise.reward
    })
    return xp
  }, [choiceAnswers, dragFillAnswer, orderingSolved])

  const totalAvailableXp = useMemo(() => exercises.reduce((sum, exercise) => sum + exercise.reward, 0), [])
  const heroXp = Math.min(650, 350 + totalXp)
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

  const playUiSound = useCallback((kind: 'success' | 'error' | 'combo' | 'play' | 'click') => {
    if (typeof window === 'undefined') return

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

  useEffect(() => {
    if (!activeReaction) return
    const timeout = window.setTimeout(() => setActiveReaction(null), 1650)
    return () => window.clearTimeout(timeout)
  }, [activeReaction])

  useEffect(() => {
    const exercise = exercises.find((item): item is OrderingExercise => item.kind === 'ordering')
    const justSolved = orderingSolved && !previousOrderingSolved.current

    if (exercise && justSolved) {
      triggerMoment({
        exerciseId: exercise.id,
        correct: true,
        reward: exercise.reward,
        successLine: 'A frase encaixou perfeita. Bora para a próxima etapa.',
        errorLine: '',
      })
    }

    previousOrderingSolved.current = orderingSolved
  }, [orderingSolved, triggerMoment])

  const handleChoiceSelect = (id: MultipleChoiceExercise['id'], option: string) => {
    const exercise = exercises.find((item): item is MultipleChoiceExercise => item.id === id && item.kind === 'multiple-choice')
    if (!exercise) return

    const previous = choiceAnswers[id]
    if (previous === option) return

    const isCorrect = option === exercise.correct
    setChoiceAnswers((current) => ({ ...current, [id]: option }))
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

  const handleDragFillEnd = (event: DragEndEvent) => {
    const draggedWord = String(event.active.id)
    if (event.over?.id !== 'drag-fill-slot' || dragFillAnswer === draggedWord) return

    const exercise = exercises.find((item): item is DragFillExercise => item.kind === 'drag-fill')
    if (!exercise) return

    const isCorrect = draggedWord === exercise.correct
    setDragFillAnswer(draggedWord)
    triggerMoment({
      exerciseId: exercise.id,
      correct: isCorrect,
      reward: exercise.reward,
      successLine: 'Acertou no encaixe. O combo segue vivo.',
      errorLine: 'Essa peça não encaixou. Solta outra e continua.',
    })
  }

  const handleOrderingEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setOrderWords((current) => {
      const oldIndex = current.indexOf(String(active.id))
      const newIndex = current.indexOf(String(over.id))
      return arrayMove(current, oldIndex, newIndex)
    })
  }

  const launchRun = () => {
    setMascotMood('guide')
    setMascotLine('A aventura começou. Fecha um warm-up e eu acelero o combo.')
    playUiSound('play')
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
    return <AuthScreen />
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
        </nav>

        <div className="sidebar-streak">
          <p className="sidebar-streak-label">
            <Flame size={16} />
            Sequência
          </p>
          <strong>12 dias!</strong>
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
              <button className="avatar-pill avatar-action" onClick={() => signOut()} title="Sair" type="button">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="avatar-image" />
                ) : (
                  <UserRound size={18} />
                )}
              </button>
            </div>

            <div className="hero-quick-grid">
              <article className="hero-quick-card">
                <span>Foco de hoje</span>
                <strong>Airport pack</strong>
                <small>1 aula visual + 2 desafios curtos</small>
              </article>
              <article className="hero-quick-card">
                <span>Próxima recompensa</span>
                <strong>+80 XP</strong>
                <small>Faltam 2 atividades para o bônus</small>
              </article>
              <article className="hero-quick-card">
                <span>Streak</span>
                <strong>12 dias</strong>
                <small>Sua melhor sequência nesta semana</small>
              </article>
            </div>

            <div className="hero-progress-row">
              <div className="level-chip">
                <span>Nível</span>
                <strong>7</strong>
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
                <span>7 dias seguidos</span>
              </div>
              <div className="hero-badge">
                <Sparkles size={16} />
                <span>6 tipos de desafio</span>
              </div>
              <div className="hero-badge">
                <Medal size={16} />
                <span>Feedback instantâneo</span>
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
                <p>{mascotLine}</p>
              </div>
              <div className="mascot-console-stats">
                <span>Combo</span>
                <strong>x{Math.max(sessionStreak, 1)}</strong>
              </div>
            </div>

            <div className="quest-rail">
              {questFlow.map((step, index) => (
                <div key={step.label} className={`quest-node${step.done ? ' done' : ''}${index === completedCount % questFlow.length ? ' live' : ''}`}>
                  <div className="quest-node-dot">{index + 1}</div>
                  <div className="quest-node-copy">
                    <strong>{step.label}</strong>
                    <span>{step.done ? 'Concluído' : 'Próximo passo'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hero-highlight-row">
              <article className="hero-highlight hero-highlight-gold">
                <p>Daily Quest</p>
                <strong>Complete 3 atividades hoje</strong>
                <span>Ganhe uma caixa surpresa e mantenha sua streak viva.</span>
              </article>
              <article className="hero-highlight hero-highlight-soft">
                <p>Modo rápido</p>
                <strong>5 minutos por sessão</strong>
                <span>Perfeito para estudar entre tarefas sem perder o ritmo.</span>
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
            {lessonCards.map((lesson, index) => (
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
                  <strong>{completedCount}/{exercises.length}</strong>
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

                  if (exercise.kind === 'multiple-choice') {
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

                        {exercise.id === 'q3' && (
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
                    const isCorrect = dragFillAnswer === exercise.correct
                    const isWrong = dragFillAnswer !== null && dragFillAnswer !== exercise.correct

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

                        <DndContext sensors={sensors} onDragEnd={handleDragFillEnd}>
                          <div className="sentence-card">
                            <span>{exercise.sentenceBefore}</span>
                            <DropSlot
                              id="drag-fill-slot"
                              value={dragFillAnswer}
                              isCorrect={isCorrect}
                              isWrong={isWrong}
                              onClear={() => setDragFillAnswer(null)}
                            />
                            <span>{exercise.sentenceAfter}</span>
                          </div>

                          <div className="token-bank">
                            {exercise.options.map((option) => (
                              <DraggableToken key={option} id={option} disabled={dragFillAnswer === option} label={option} />
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

                  const isOrdered = normalizeTokenOrder(orderWords) === normalizeTokenOrder(exercise.solution)

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

                      <DndContext sensors={sensors} onDragEnd={handleOrderingEnd}>
                        <SortableContext items={orderWords} strategy={horizontalListSortingStrategy}>
                          <div className="ordering-lane">
                            {orderWords.map((word) => (
                              <SortableWord key={word} id={word} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

                      <div className={`feedback-strip${isOrdered ? ' success' : ''}`}>
                        <span>{isOrdered ? `Perfeito: ${formatSentence(exercise.solution)}` : exercise.explanation}</span>
                        <div className="feedback-actions">
                          <strong>⚡ {exercise.reward} XP</strong>
                          <button className="retry-link" onClick={() => setOrderWords([...exercise.scrambled])}>
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
                    <strong>65%</strong>
                    <span>do nível 7</span>
                  </div>
                </div>
                <p>Faltam 300 XP para o próximo nível</p>
                <button>Ver progresso</button>
              </article>

              <article className="rail-card streak-rail">
                <Flame size={44} />
                <strong>12</strong>
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
                  <span className="badge"><Headphones size={22} /></span>
                  <span className="badge"><Star size={22} /></span>
                  <span className="badge"><Target size={22} /></span>
                </div>
                <small>{completedCount} de {exercises.length} desafios concluídos</small>
              </article>

              <article className="challenge-card">
                <div className="challenge-head">
                  <Trophy size={28} />
                  <span>Desafio especial</span>
                </div>
                <strong>Complete 5 quizzes esta semana e ganhe 100 gemas!</strong>
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
            <strong>7 dias seguidos</strong>
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
