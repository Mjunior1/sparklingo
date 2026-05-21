import './AdminScreen.css'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  AudioLines,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Gamepad2,
  Gem,
  Image,
  LayoutDashboard,
  Mic,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  defaultAchievementCatalog,
  deleteAchievement,
  deleteLesson,
  deleteQuiz,
  deleteQuizQuestion,
  seedDefaultCatalog,
  upsertAchievement,
  upsertLesson,
  upsertQuiz,
  upsertQuizQuestion,
  type AchievementCatalogItem,
  type FilterKey,
  type LessonCatalogItem,
  type LessonTone,
  type QuizCatalogItem,
  type QuizQuestionItem,
} from '../services/catalog'
import { defaultPlatformConfig, savePlatformConfig, type PlatformConfig } from '../services/platform'

type AdminScreenProps = {
  lessons: LessonCatalogItem[]
  quizzes: QuizCatalogItem[]
  questions: QuizQuestionItem[]
  achievements: AchievementCatalogItem[]
  onBack: () => void
  onRefresh: () => Promise<void>
  platformConfig: PlatformConfig | null
}

type SectionKey =
  | 'dashboard'
  | 'lessons'
  | 'quizzes'
  | 'questions'
  | 'achievements'
  | 'media'
  | 'users'
  | 'analytics'
  | 'settings'

type DrawerMode = 'create' | 'edit'
type DrawerKind = 'lesson' | 'quiz' | 'question' | 'achievement'

type DrawerState =
  | { open: false }
  | { open: true; kind: DrawerKind; mode: DrawerMode }

type ToastState =
  | { type: 'success' | 'error' | 'info'; message: string }
  | null

type StatusFilter = 'all' | 'active' | 'paused'
type QuizKindFilter = QuizQuestionItem['kind'] | 'all'

const tagOptions: Exclude<FilterKey, 'Todos'>[] = ['Gramática', 'Vocabulário', 'Listening', 'Reading', 'Speaking']
const questionKinds: QuizQuestionItem['kind'][] = ['multiple-choice', 'drag-fill', 'ordering', 'listening', 'speaking']

const navItems: Array<{ key: SectionKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'lessons', label: 'Lições', icon: BookOpen },
  { key: 'quizzes', label: 'Quizzes', icon: Gamepad2 },
  { key: 'questions', label: 'Questões', icon: WandSparkles },
  { key: 'achievements', label: 'Conquistas', icon: Trophy },
  { key: 'media', label: 'Biblioteca de mídia', icon: Image },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Configurações', icon: Settings },
]

const mediaLibrary = [
  { id: 'airport', label: 'Airport', path: '/pollinations/airport-card.png', tone: 'sky' },
  { id: 'grammar', label: 'Grammar', path: '/pollinations/grammar-card.png', tone: 'violet' },
  { id: 'listening', label: 'Listening', path: '/pollinations/listening-card.png', tone: 'mint' },
  { id: 'mountain', label: 'Mountain', path: '/pollinations/mountain-card.png', tone: 'sky' },
  { id: 'dog', label: 'Dog', path: '/pollinations/dog-card.png', tone: 'mint' },
  { id: 'storm', label: 'Storm', path: '/pollinations/storm-card.png', tone: 'violet' },
]

const mediaStyles = ['cartoon', '3D', 'pastel', 'kawaii', 'cinematic'] as const
type MediaStyle = (typeof mediaStyles)[number]

const emptyLesson: LessonCatalogItem = {
  id: '',
  category: 'Vocabulário',
  title: '',
  blurb: '',
  image: mediaLibrary[0].path,
  tone: 'sky',
  progress: 0,
}

const emptyQuiz: QuizCatalogItem = {
  id: '',
  lessonId: '',
  tag: 'Vocabulário',
  title: '',
  difficulty: 'Fácil',
  reward: 25,
  kind: 'multiple-choice',
  order: 1,
  active: true,
}

const emptyQuestion: QuizQuestionItem = {
  id: '',
  quizId: '',
  lessonId: '',
  tag: 'Vocabulário',
  kind: 'multiple-choice',
  difficulty: 'Fácil',
  kicker: 'Novo desafio',
  title: '',
  prompt: '',
  art: mediaLibrary[0].path,
  artAlt: '',
  reward: 25,
  active: true,
  options: ['', '', '', ''],
  correct: '',
  explanation: '',
  sentenceBefore: '',
  sentenceAfter: '',
  scrambled: [],
  solution: [],
}

const emptyAchievement: AchievementCatalogItem = {
  id: '',
  title: '',
  icon: 'star',
  description: '',
  xpReward: 20,
}

const sectionTitle: Record<SectionKey, string> = {
  dashboard: 'Dashboard operacional',
  lessons: 'Lições',
  quizzes: 'Quizzes',
  questions: 'Questões',
  achievements: 'Conquistas',
  media: 'Biblioteca de mídia',
  users: 'Usuários',
  analytics: 'Analytics',
  settings: 'Configurações',
}

const sectionCopy: Record<SectionKey, string> = {
  dashboard: 'Organize o catálogo, acompanhe volume de conteúdo e entre nas áreas certas sem navegar por formulários gigantes.',
  lessons: 'A lição é o topo da hierarquia. Ela estrutura a trilha e organiza os quizzes vinculados.',
  quizzes: 'Cada quiz pertence a uma lição e concentra um conjunto de desafios do mesmo bloco de aprendizagem.',
  questions: 'Encontre, filtre, edite e publique questões em segundos com uma grade compacta e um drawer lateral.',
  achievements: 'Conquistas e recompensas emocionais para sustentar a retenção e o senso de progresso.',
  media: 'Selecione mídia com preview visual e prepare prompts de IA sem depender de caminhos manuais.',
  users: 'Área preparada para gestão de contas, papéis, trilhas e suporte operacional.',
  analytics: 'Área preparada para retenção, sessões, streak, desempenho e consumo de conteúdo.',
  settings: 'Runtime da plataforma, home e catálogo base em um fluxo limpo e seguro.',
}

const questionPrefixByKind: Record<QuizQuestionItem['kind'], string> = {
  'multiple-choice': 'QT-MC',
  'drag-fill': 'QT-DD',
  ordering: 'QT-OD',
  listening: 'QT-LS',
  speaking: 'QT-SP',
}

const achievementIconLabel: Record<AchievementCatalogItem['icon'], string> = {
  headphones: 'Audio',
  star: 'Star',
  target: 'Target',
}

const formatQuestionKind = (kind: QuizQuestionItem['kind']) => {
  if (kind === 'multiple-choice') return 'Múltipla escolha'
  if (kind === 'drag-fill') return 'Drag & Drop'
  if (kind === 'ordering') return 'Ordenação'
  if (kind === 'listening') return 'Listening'
  return 'Speaking'
}

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const padNumber = (value: number) => String(value).padStart(3, '0')

const nextNumericId = (existingIds: string[], prefix: string) => {
  const matches = existingIds
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number(id.replace(`${prefix}-`, '')))
    .filter((value) => Number.isFinite(value))

  return `${prefix}-${padNumber((matches.length ? Math.max(...matches) : 0) + 1)}`
}

const useDebouncedValue = (value: string, delay = 180) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}

const isActiveMatch = (active: boolean, filter: StatusFilter) => {
  if (filter === 'all') return true
  return filter === 'active' ? active : !active
}

const questionDraftFromItem = (question?: QuizQuestionItem): QuizQuestionItem => ({
  ...emptyQuestion,
  ...(question ?? {}),
  options: question?.options?.length ? [...question.options] : ['', '', '', ''],
  scrambled: question?.scrambled?.length ? [...question.scrambled] : [],
  solution: question?.solution?.length ? [...question.solution] : [],
})

export function AdminScreen({
  lessons,
  quizzes,
  questions,
  achievements,
  onBack,
  onRefresh,
  platformConfig,
}: AdminScreenProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard')
  const [drawer, setDrawer] = useState<DrawerState>({ open: false })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>({ type: 'info', message: 'CMS conectado ao Firestore. Conteúdo real pronto para operar.' })

  const [lessonSearchInput, setLessonSearchInput] = useState('')
  const [lessonCategoryFilter, setLessonCategoryFilter] = useState<'Todos' | Exclude<FilterKey, 'Todos'>>('Todos')
  const [quizSearchInput, setQuizSearchInput] = useState('')
  const [quizCategoryFilter, setQuizCategoryFilter] = useState<'Todos' | Exclude<FilterKey, 'Todos'>>('Todos')
  const [quizKindFilter, setQuizKindFilter] = useState<QuizKindFilter>('all')
  const [quizStatusFilter, setQuizStatusFilter] = useState<StatusFilter>('all')
  const [questionSearchInput, setQuestionSearchInput] = useState('')
  const [questionCategoryFilter, setQuestionCategoryFilter] = useState<'Todos' | Exclude<FilterKey, 'Todos'>>('Todos')
  const [questionKindFilter, setQuestionKindFilter] = useState<QuizKindFilter>('all')
  const [questionStatusFilter, setQuestionStatusFilter] = useState<StatusFilter>('all')
  const [questionQuizFilter, setQuestionQuizFilter] = useState<string>('all')
  const [achievementSearchInput, setAchievementSearchInput] = useState('')

  const [lessonDraft, setLessonDraft] = useState<LessonCatalogItem>(emptyLesson)
  const [quizDraft, setQuizDraft] = useState<QuizCatalogItem>(emptyQuiz)
  const [questionDraft, setQuestionDraft] = useState<QuizQuestionItem>(emptyQuestion)
  const [achievementDraft, setAchievementDraft] = useState<AchievementCatalogItem>(emptyAchievement)
  const [platformDraft, setPlatformDraft] = useState<PlatformConfig>(platformConfig ?? defaultPlatformConfig)
  const [mediaTarget, setMediaTarget] = useState<'lesson' | 'quiz' | 'question'>('lesson')
  const [mediaTargetId, setMediaTargetId] = useState('')
  const [mediaStyle, setMediaStyle] = useState<MediaStyle>('3D')

  const lessonSearch = useDebouncedValue(lessonSearchInput)
  const quizSearch = useDebouncedValue(quizSearchInput)
  const questionSearch = useDebouncedValue(questionSearchInput)
  const achievementSearch = useDebouncedValue(achievementSearchInput)

  useEffect(() => {
    setPlatformDraft(platformConfig ?? defaultPlatformConfig)
  }, [platformConfig])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), toast.type === 'error' ? 5000 : 3400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!questionDraft.lessonId) {
      if (questionDraft.quizId) {
        setQuestionDraft((current) => ({ ...current, quizId: '' }))
      }
      return
    }

    if (!questionDraft.quizId) return
    const linkedQuiz = quizzes.find((quiz) => quiz.id === questionDraft.quizId)
    if (!linkedQuiz || linkedQuiz.lessonId !== questionDraft.lessonId) {
      setQuestionDraft((current) => ({ ...current, quizId: '' }))
    }
  }, [questionDraft.lessonId, questionDraft.quizId, quizzes])

  useEffect(() => {
    if (!questionDraft.quizId) return
    const linkedQuiz = quizzes.find((quiz) => quiz.id === questionDraft.quizId)
    if (!linkedQuiz) return

    setQuestionDraft((current) => ({
      ...current,
      lessonId: linkedQuiz.lessonId,
      tag: linkedQuiz.tag,
      difficulty: linkedQuiz.difficulty,
      reward: current.reward || linkedQuiz.reward,
    }))
  }, [questionDraft.quizId, quizzes])

  useEffect(() => {
    if (questionDraft.kind === 'multiple-choice' || questionDraft.kind === 'drag-fill' || questionDraft.kind === 'listening') {
      setQuestionDraft((current) => ({
        ...current,
        options: current.options?.length ? current.options : ['', '', '', ''],
        correct: current.correct ?? '',
      }))
      return
    }

    if (questionDraft.kind === 'ordering') {
      setQuestionDraft((current) => ({
        ...current,
        scrambled: current.scrambled ?? [],
        solution: current.solution ?? [],
      }))
      return
    }

    setQuestionDraft((current) => ({
      ...current,
      correct: current.correct ?? '',
      options: [],
      scrambled: [],
      solution: [],
      sentenceBefore: '',
      sentenceAfter: '',
    }))
  }, [questionDraft.kind])

  const lessonIdPreview = useMemo(
    () => lessonDraft.id || nextNumericId(lessons.map((item) => item.id), 'LS'),
    [lessonDraft.id, lessons],
  )

  const quizIdPreview = useMemo(
    () => quizDraft.id || nextNumericId(quizzes.map((item) => item.id), 'QZ'),
    [quizDraft.id, quizzes],
  )

  const questionIdPreview = useMemo(
    () => questionDraft.id || nextNumericId(questions.map((item) => item.id), questionPrefixByKind[questionDraft.kind]),
    [questionDraft.id, questionDraft.kind, questions],
  )

  const achievementIdPreview = useMemo(
    () => achievementDraft.id || nextNumericId(achievements.map((item) => item.id), 'AC'),
    [achievementDraft.id, achievements],
  )

  const lessonMap = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons])
  const quizMap = useMemo(() => new Map(quizzes.map((quiz) => [quiz.id, quiz])), [quizzes])

  const dashboardStats = [
    { label: 'Lições', value: lessons.length, helper: 'trilhas ativas' },
    { label: 'Quizzes', value: quizzes.length, helper: 'blocos jogáveis' },
    { label: 'Questões', value: questions.length, helper: 'itens no catálogo' },
    { label: 'Conquistas', value: achievements.length || defaultAchievementCatalog.length, helper: 'recompensas' },
  ]

  const filteredLessons = useMemo(() => {
    const query = normalizeSearch(lessonSearch)
    return lessons
      .filter((lesson) => lessonCategoryFilter === 'Todos' || lesson.category === lessonCategoryFilter)
      .filter((lesson) => {
        if (!query) return true
        return normalizeSearch(`${lesson.id} ${lesson.title} ${lesson.category}`).includes(query)
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [lessons, lessonCategoryFilter, lessonSearch])

  const filteredQuizzes = useMemo(() => {
    const query = normalizeSearch(quizSearch)
    return quizzes
      .filter((quiz) => quizCategoryFilter === 'Todos' || quiz.tag === quizCategoryFilter)
      .filter((quiz) => quizKindFilter === 'all' || quiz.kind === quizKindFilter)
      .filter((quiz) => isActiveMatch(quiz.active, quizStatusFilter))
      .filter((quiz) => {
        if (!query) return true
        const lessonTitle = lessonMap.get(quiz.lessonId)?.title ?? ''
        return normalizeSearch(`${quiz.id} ${quiz.title} ${quiz.tag} ${lessonTitle}`).includes(query)
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  }, [lessonMap, quizCategoryFilter, quizKindFilter, quizSearch, quizStatusFilter, quizzes])

  const filteredQuestions = useMemo(() => {
    const query = normalizeSearch(questionSearch)
    return questions
      .filter((question) => questionCategoryFilter === 'Todos' || question.tag === questionCategoryFilter)
      .filter((question) => questionKindFilter === 'all' || question.kind === questionKindFilter)
      .filter((question) => questionQuizFilter === 'all' || question.quizId === questionQuizFilter)
      .filter((question) => isActiveMatch(question.active, questionStatusFilter))
      .filter((question) => {
        if (!query) return true
        const quizTitle = quizMap.get(question.quizId)?.title ?? ''
        const lessonTitle = lessonMap.get(question.lessonId)?.title ?? ''
        return normalizeSearch(`${question.id} ${question.title} ${question.tag} ${quizTitle} ${lessonTitle}`).includes(query)
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  }, [lessonMap, questionCategoryFilter, questionKindFilter, questionQuizFilter, questionSearch, questionStatusFilter, questions, quizMap])

  const filteredAchievements = useMemo(() => {
    const catalog = achievements.length ? achievements : defaultAchievementCatalog
    const query = normalizeSearch(achievementSearch)
    return catalog
      .filter((achievement) => !query || normalizeSearch(`${achievement.id} ${achievement.title} ${achievement.description}`).includes(query))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [achievementSearch, achievements])

  const lessonOptions = useMemo(() => lessons.slice().sort((a, b) => a.title.localeCompare(b.title)), [lessons])
  const quizOptions = useMemo(() => {
    const base = questionDraft.lessonId
      ? quizzes.filter((quiz) => quiz.lessonId === questionDraft.lessonId)
      : quizzes
    return base.slice().sort((a, b) => a.title.localeCompare(b.title))
  }, [questionDraft.lessonId, quizzes])

  const currentQuestionLesson = questionDraft.lessonId ? lessonMap.get(questionDraft.lessonId) : null
  const currentQuestionQuiz = questionDraft.quizId ? quizMap.get(questionDraft.quizId) : null

  const aiTargetOptions = useMemo(() => {
    if (mediaTarget === 'lesson') return lessons.map((lesson) => ({ id: lesson.id, label: lesson.title, meta: lesson.category }))
    if (mediaTarget === 'quiz') return quizzes.map((quiz) => ({ id: quiz.id, label: quiz.title, meta: lessonMap.get(quiz.lessonId)?.title ?? quiz.lessonId }))
    return questions.map((question) => ({ id: question.id, label: question.title, meta: quizMap.get(question.quizId)?.title ?? question.quizId }))
  }, [lessons, mediaTarget, questions, quizMap, quizzes, lessonMap])

  useEffect(() => {
    if (aiTargetOptions.length && !aiTargetOptions.some((option) => option.id === mediaTargetId)) {
      setMediaTargetId(aiTargetOptions[0]?.id ?? '')
    }
  }, [aiTargetOptions, mediaTargetId])

  const generatedPrompt = useMemo(() => {
    const target = aiTargetOptions.find((option) => option.id === mediaTargetId)
    if (!target) return 'Selecione um item para gerar um prompt automático.'

    return [
      `${mediaStyle} educational illustration for SparkLingo`,
      `target: ${target.label}`,
      `context: ${target.meta}`,
      'premium playful learning product, soft lighting, polished UI-friendly composition, no text',
    ].join(', ')
  }, [aiTargetOptions, mediaStyle, mediaTargetId])

  const openDrawer = (kind: DrawerKind, mode: DrawerMode) => setDrawer({ open: true, kind, mode })
  const closeDrawer = () => setDrawer({ open: false })

  const showToast = (type: NonNullable<ToastState>['type'], message: string) => {
    setToast({ type, message })
  }

  const runAdminTask = async (task: () => Promise<void>, successMessage: string, errorMessage: string) => {
    setSaving(true)
    try {
      await task()
      await onRefresh()
      showToast('success', successMessage)
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage
      showToast('error', message || errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const saveLesson = async () => {
    await runAdminTask(
      async () => {
        await upsertLesson({
          ...lessonDraft,
          id: lessonIdPreview,
          title: lessonDraft.title.trim(),
          blurb: lessonDraft.blurb.trim(),
        })
        setLessonDraft(emptyLesson)
        closeDrawer()
      },
      `Lição "${lessonDraft.title}" salva no Firestore.`,
      'Não foi possível salvar a lição.',
    )
  }

  const saveQuiz = async () => {
    await runAdminTask(
      async () => {
        await upsertQuiz({
          ...quizDraft,
          id: quizIdPreview,
          title: quizDraft.title.trim(),
          order: quizDraft.order || quizzes.length + 1,
        })
        setQuizDraft(emptyQuiz)
        closeDrawer()
      },
      `Quiz "${quizDraft.title}" salvo no Firestore.`,
      'Não foi possível salvar o quiz.',
    )
  }

  const saveQuestion = async () => {
    const preparedOptions = (questionDraft.options ?? []).map((item) => item.trim()).filter(Boolean)
    const preparedScrambled = (questionDraft.scrambled ?? []).map((item) => item.trim()).filter(Boolean)
    const preparedSolution = (questionDraft.solution ?? []).map((item) => item.trim()).filter(Boolean)

    await runAdminTask(
      async () => {
        await upsertQuizQuestion({
          ...questionDraft,
          id: questionIdPreview,
          title: questionDraft.title.trim(),
          prompt: questionDraft.prompt.trim(),
          explanation: questionDraft.explanation.trim(),
          artAlt: questionDraft.artAlt.trim(),
          sentenceBefore: questionDraft.kind === 'drag-fill' ? questionDraft.sentenceBefore?.trim() ?? '' : '',
          sentenceAfter: questionDraft.kind === 'drag-fill' ? questionDraft.sentenceAfter?.trim() ?? '' : '',
          options: questionDraft.kind === 'multiple-choice' || questionDraft.kind === 'drag-fill' || questionDraft.kind === 'listening' ? preparedOptions : [],
          correct: questionDraft.correct?.trim() ?? '',
          scrambled: questionDraft.kind === 'ordering' ? preparedScrambled : [],
          solution: questionDraft.kind === 'ordering' ? preparedSolution : [],
        })
        setQuestionDraft(emptyQuestion)
        closeDrawer()
      },
      `Questão "${questionDraft.title}" salva no Firestore.`,
      'Não foi possível salvar a questão.',
    )
  }

  const saveAchievementItem = async () => {
    await runAdminTask(
      async () => {
        await upsertAchievement({
          ...achievementDraft,
          id: achievementIdPreview,
          title: achievementDraft.title.trim(),
          description: achievementDraft.description.trim(),
        })
        setAchievementDraft(emptyAchievement)
        closeDrawer()
      },
      `Conquista "${achievementDraft.title}" salva no Firestore.`,
      'Não foi possível salvar a conquista.',
    )
  }

  const saveRuntime = async () => {
    await runAdminTask(
      () => savePlatformConfig(platformDraft),
      'Configurações da plataforma salvas.',
      'Não foi possível salvar as configurações.',
    )
  }

  const populateCatalog = async () => {
    await runAdminTask(
      () => seedDefaultCatalog(),
      'Catálogo base criado/atualizado com sucesso.',
      'Não foi possível popular o catálogo base.',
    )
  }

  const removeCatalogItem = async (label: string, task: () => Promise<void>) => {
    if (!window.confirm(`Excluir "${label}"? Esta ação remove o item do Firestore.`)) return
    await runAdminTask(task, `"${label}" excluído com sucesso.`, `Não foi possível excluir "${label}".`)
  }

  const openLessonEditor = (lesson?: LessonCatalogItem) => {
    setLessonDraft(lesson ? { ...lesson } : emptyLesson)
    openDrawer('lesson', lesson ? 'edit' : 'create')
  }

  const openQuizEditor = (quiz?: QuizCatalogItem) => {
    setQuizDraft(quiz ? { ...quiz } : emptyQuiz)
    openDrawer('quiz', quiz ? 'edit' : 'create')
  }

  const openQuestionEditor = (question?: QuizQuestionItem) => {
    setQuestionDraft(questionDraftFromItem(question))
    openDrawer('question', question ? 'edit' : 'create')
  }

  const openAchievementEditor = (achievement?: AchievementCatalogItem) => {
    setAchievementDraft(achievement ? { ...achievement } : emptyAchievement)
    openDrawer('achievement', achievement ? 'edit' : 'create')
  }

  const duplicateQuestion = (question: QuizQuestionItem) => {
    setQuestionDraft({
      ...questionDraftFromItem(question),
      id: '',
      title: `${question.title} copy`,
    })
    setActiveSection('questions')
    openDrawer('question', 'create')
  }

  const duplicateQuiz = (quiz: QuizCatalogItem) => {
    setQuizDraft({
      ...quiz,
      id: '',
      title: `${quiz.title} copy`,
    })
    setActiveSection('quizzes')
    openDrawer('quiz', 'create')
  }

  const applyMediaAsset = (path: string) => {
    if (!drawer.open) return
    if (drawer.kind === 'lesson') {
      setLessonDraft((current) => ({ ...current, image: path }))
      return
    }
    if (drawer.kind === 'question') {
      setQuestionDraft((current) => ({ ...current, art: path }))
    }
  }

  const renderDrawerContent = () => {
    if (!drawer.open) return null

    if (drawer.kind === 'lesson') {
      return (
        <DrawerShell
          kicker={drawer.mode === 'create' ? 'Nova lição' : 'Editar lição'}
          title={lessonDraft.title || 'Defina a trilha principal'}
          subtitle={`ID automático • ${lessonIdPreview}`}
          saving={saving}
          onClose={closeDrawer}
          onSave={saveLesson}
          saveLabel="Salvar lição"
        >
          <div className="drawer-grid">
            <section className="drawer-section">
              <div className="drawer-section-head">
                <strong>Estrutura da trilha</strong>
                <span>A lição é o primeiro nível e pode conter vários quizzes.</span>
              </div>
              <div className="drawer-form">
                <label>Categoria
                  <select value={lessonDraft.category} onChange={(event) => setLessonDraft((current) => ({ ...current, category: event.target.value as LessonCatalogItem['category'] }))}>
                    {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                </label>
                <label>Título
                  <input value={lessonDraft.title} onChange={(event) => setLessonDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: At the Airport" />
                </label>
                <label>Resumo curto
                  <textarea value={lessonDraft.blurb} onChange={(event) => setLessonDraft((current) => ({ ...current, blurb: event.target.value }))} placeholder="Explique em uma frase o objetivo da lição." />
                </label>
                <label>Tom visual
                  <select value={lessonDraft.tone} onChange={(event) => setLessonDraft((current) => ({ ...current, tone: event.target.value as LessonTone }))}>
                    <option value="sky">Sky</option>
                    <option value="violet">Violet</option>
                    <option value="mint">Mint</option>
                  </select>
                </label>
              </div>
            </section>
            <MediaPicker selected={lessonDraft.image} onPick={applyMediaAsset} />
          </div>
        </DrawerShell>
      )
    }

    if (drawer.kind === 'quiz') {
      return (
        <DrawerShell
          kicker={drawer.mode === 'create' ? 'Novo quiz' : 'Editar quiz'}
          title={quizDraft.title || 'Estruture o bloco jogável'}
          subtitle={`ID automático • ${quizIdPreview}`}
          saving={saving}
          onClose={closeDrawer}
          onSave={saveQuiz}
          saveLabel="Salvar quiz"
        >
          <div className="drawer-grid drawer-grid-single">
            <section className="drawer-section">
              <div className="drawer-section-head">
                <strong>Vínculo e configuração</strong>
                <span>O quiz pertence a uma lição e depois recebe questões dentro do fluxo.</span>
              </div>
              <div className="drawer-flow">
                <span className={quizDraft.lessonId ? 'is-complete' : ''}>1. Selecionar lição</span>
                <ChevronRight size={14} />
                <span className={quizDraft.title ? 'is-complete' : ''}>2. Nomear quiz</span>
                <ChevronRight size={14} />
                <span className={quizDraft.kind ? 'is-complete' : ''}>3. Definir tipo principal</span>
              </div>
              <div className="drawer-form">
                <label>Lição vinculada
                  <select value={quizDraft.lessonId} onChange={(event) => {
                    const nextLessonId = event.target.value
                    const nextLesson = lessonMap.get(nextLessonId)
                    setQuizDraft((current) => ({
                      ...current,
                      lessonId: nextLessonId,
                      tag: (nextLesson?.category as QuizCatalogItem['tag']) ?? current.tag,
                    }))
                  }}>
                    <option value="">Selecione uma lição</option>
                    {lessonOptions.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                </label>
                <label>Título
                  <input value={quizDraft.title} onChange={(event) => setQuizDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Forma correta" />
                </label>
                <div className="drawer-two-col">
                  <label>Categoria
                    <select value={quizDraft.tag} onChange={(event) => setQuizDraft((current) => ({ ...current, tag: event.target.value as QuizCatalogItem['tag'] }))}>
                      {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </label>
                  <label>Dificuldade
                    <select value={quizDraft.difficulty} onChange={(event) => setQuizDraft((current) => ({ ...current, difficulty: event.target.value as QuizCatalogItem['difficulty'] }))}>
                      <option value="Fácil">Fácil</option>
                      <option value="Médio">Médio</option>
                    </select>
                  </label>
                </div>
                <div className="drawer-two-col">
                  <label>Tipo principal
                    <select value={quizDraft.kind} onChange={(event) => setQuizDraft((current) => ({ ...current, kind: event.target.value as QuizCatalogItem['kind'] }))}>
                      {questionKinds.map((kind) => <option key={kind} value={kind}>{formatQuestionKind(kind)}</option>)}
                    </select>
                  </label>
                  <label>XP base
                    <input type="number" value={quizDraft.reward} onChange={(event) => setQuizDraft((current) => ({ ...current, reward: Number(event.target.value) || 0 }))} />
                  </label>
                </div>
                <label className="toggle-row">
                  <span>Status</span>
                  <button
                    type="button"
                    className={`toggle-pill${quizDraft.active ? ' is-on' : ''}`}
                    onClick={() => setQuizDraft((current) => ({ ...current, active: !current.active }))}
                  >
                    {quizDraft.active ? 'Ativo' : 'Pausado'}
                  </button>
                </label>
              </div>
            </section>
          </div>
        </DrawerShell>
      )
    }

    if (drawer.kind === 'question') {
      return (
        <DrawerShell
          kicker={drawer.mode === 'create' ? 'Nova questão' : 'Editar questão'}
          title={questionDraft.title || 'Construa o desafio jogável'}
          subtitle={`ID automático • ${questionIdPreview}`}
          saving={saving}
          onClose={closeDrawer}
          onSave={saveQuestion}
          saveLabel="Salvar questão"
        >
          <div className="drawer-grid">
            <section className="drawer-section">
              <div className="drawer-section-head">
                <strong>Fluxo operacional</strong>
                <span>Questões vivem dentro de um quiz, e o quiz fica dentro da lição.</span>
              </div>
              <div className="drawer-flow">
                <span className={questionDraft.lessonId ? 'is-complete' : ''}>1. Lição</span>
                <ChevronRight size={14} />
                <span className={questionDraft.quizId ? 'is-complete' : ''}>2. Quiz</span>
                <ChevronRight size={14} />
                <span className={questionDraft.title ? 'is-complete' : ''}>3. Builder</span>
              </div>
              <div className="drawer-form">
                <label>Lição vinculada
                  <select value={questionDraft.lessonId} onChange={(event) => setQuestionDraft((current) => ({ ...current, lessonId: event.target.value, quizId: '' }))}>
                    <option value="">Selecione uma lição</option>
                    {lessonOptions.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                </label>
                <label>Quiz vinculado
                  <select value={questionDraft.quizId} onChange={(event) => setQuestionDraft((current) => ({ ...current, quizId: event.target.value }))}>
                    <option value="">Selecione um quiz</option>
                    {quizOptions.map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>{quiz.title} • {lessonMap.get(quiz.lessonId)?.title ?? quiz.lessonId}</option>
                    ))}
                  </select>
                </label>
                <div className="drawer-two-col">
                  <label>Categoria
                    <select value={questionDraft.tag} onChange={(event) => setQuestionDraft((current) => ({ ...current, tag: event.target.value as Exclude<FilterKey, 'Todos'> }))}>
                      {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </label>
                  <label>Tipo
                    <select value={questionDraft.kind} onChange={(event) => setQuestionDraft((current) => ({ ...current, kind: event.target.value as QuizQuestionItem['kind'] }))}>
                      {questionKinds.map((kind) => <option key={kind} value={kind}>{formatQuestionKind(kind)}</option>)}
                    </select>
                  </label>
                </div>
                <div className="drawer-two-col">
                  <label>Dificuldade
                    <select value={questionDraft.difficulty} onChange={(event) => setQuestionDraft((current) => ({ ...current, difficulty: event.target.value as QuizQuestionItem['difficulty'] }))}>
                      <option value="Fácil">Fácil</option>
                      <option value="Médio">Médio</option>
                    </select>
                  </label>
                  <label>XP
                    <input type="number" value={questionDraft.reward} onChange={(event) => setQuestionDraft((current) => ({ ...current, reward: Number(event.target.value) || 0 }))} />
                  </label>
                </div>
                <label>Título
                  <input value={questionDraft.title} onChange={(event) => setQuestionDraft((current) => ({ ...current, title: event.target.value }))} />
                </label>
                <label>Prompt
                  <textarea value={questionDraft.prompt} onChange={(event) => setQuestionDraft((current) => ({ ...current, prompt: event.target.value }))} />
                </label>
                <label>Explicação amigável
                  <textarea value={questionDraft.explanation} onChange={(event) => setQuestionDraft((current) => ({ ...current, explanation: event.target.value }))} />
                </label>

                {(questionDraft.kind === 'multiple-choice' || questionDraft.kind === 'listening') && (
                  <>
                    <label>Alternativas (uma por linha)
                      <textarea
                        value={(questionDraft.options ?? []).join('\n')}
                        onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))}
                      />
                    </label>
                    <label>Resposta correta
                      <input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} />
                    </label>
                  </>
                )}

                {questionDraft.kind === 'drag-fill' && (
                  <>
                    <div className="drawer-two-col">
                      <label>Texto antes
                        <input value={questionDraft.sentenceBefore ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, sentenceBefore: event.target.value }))} />
                      </label>
                      <label>Texto depois
                        <input value={questionDraft.sentenceAfter ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, sentenceAfter: event.target.value }))} />
                      </label>
                    </div>
                    <label>Peças arrastáveis (uma por linha)
                      <textarea
                        value={(questionDraft.options ?? []).join('\n')}
                        onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))}
                      />
                    </label>
                    <label>Resposta correta
                      <input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} />
                    </label>
                  </>
                )}

                {questionDraft.kind === 'ordering' && (
                  <>
                    <label>Peças embaralhadas (uma por linha)
                      <textarea
                        value={(questionDraft.scrambled ?? []).join('\n')}
                        onChange={(event) => setQuestionDraft((current) => ({ ...current, scrambled: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) }))}
                      />
                    </label>
                    <label>Solução correta (uma por linha)
                      <textarea
                        value={(questionDraft.solution ?? []).join('\n')}
                        onChange={(event) => setQuestionDraft((current) => ({ ...current, solution: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) }))}
                      />
                    </label>
                  </>
                )}

                {questionDraft.kind === 'speaking' && (
                  <label>Frase alvo
                    <input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} placeholder="Ex.: I usually play basketball." />
                  </label>
                )}
              </div>
            </section>

            <section className="drawer-section">
              <QuestionPreviewCard
                question={questionDraft}
                quizTitle={currentQuestionQuiz?.title ?? 'Sem quiz'}
                lessonTitle={currentQuestionLesson?.title ?? 'Sem lição'}
              />
              <MediaPicker selected={questionDraft.art} onPick={applyMediaAsset} compact />
            </section>
          </div>
        </DrawerShell>
      )
    }

    return (
      <DrawerShell
        kicker={drawer.mode === 'create' ? 'Nova conquista' : 'Editar conquista'}
        title={achievementDraft.title || 'Defina uma recompensa'}
        subtitle={`ID automático • ${achievementIdPreview}`}
        saving={saving}
        onClose={closeDrawer}
        onSave={saveAchievementItem}
        saveLabel="Salvar conquista"
      >
        <div className="drawer-grid drawer-grid-single">
          <section className="drawer-section">
            <div className="drawer-section-head">
              <strong>Recompensa e comunicação</strong>
              <span>Uma boa conquista deve ser curta, clara e emocionalmente recompensadora.</span>
            </div>
            <div className="drawer-form">
              <label>Título
                <input value={achievementDraft.title} onChange={(event) => setAchievementDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>Descrição
                <textarea value={achievementDraft.description} onChange={(event) => setAchievementDraft((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <div className="drawer-two-col">
                <label>Ícone
                  <select value={achievementDraft.icon} onChange={(event) => setAchievementDraft((current) => ({ ...current, icon: event.target.value as AchievementCatalogItem['icon'] }))}>
                    <option value="headphones">Headphones</option>
                    <option value="star">Star</option>
                    <option value="target">Target</option>
                  </select>
                </label>
                <label>XP reward
                  <input type="number" value={achievementDraft.xpReward} onChange={(event) => setAchievementDraft((current) => ({ ...current, xpReward: Number(event.target.value) || 0 }))} />
                </label>
              </div>
            </div>
          </section>
        </div>
      </DrawerShell>
    )
  }

  return (
    <div className="cms-shell">
      <aside className="cms-sidebar">
        <div className="cms-brand">
          <div className="cms-brand-mark"><Shield size={18} /></div>
          <div>
            <strong>SparkLingo CMS</strong>
            <span>conteúdo + operação</span>
          </div>
        </div>

        <nav className="cms-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                className={`cms-nav-item${activeSection === item.key ? ' is-active' : ''}`}
                onClick={() => setActiveSection(item.key)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <button className="cms-back" type="button" onClick={onBack}>
          <ArrowLeft size={16} />
          Voltar para a jornada
        </button>
      </aside>

      <div className="cms-main">
        <header className="cms-header">
          <div>
            <p className="admin-kicker">{sectionTitle[activeSection]}</p>
            <h1>{sectionTitle[activeSection]}</h1>
            <p className="cms-header-copy">{sectionCopy[activeSection]}</p>
          </div>
          <div className="cms-header-pill">
            <Shield size={16} />
            Painel admin protegido
          </div>
        </header>

        {activeSection === 'dashboard' && (
          <section className="cms-panel-stack">
            <section className="cms-summary-grid">
              {dashboardStats.map((card) => (
                <article key={card.label} className="cms-stat-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.helper}</small>
                </article>
              ))}
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Fluxo editorial</h2>
                  <p className="admin-helper">Use o mesmo raciocínio da plataforma: primeiro a lição, depois o quiz, depois a questão.</p>
                </div>
              </div>
              <div className="cms-hierarchy-grid">
                <article className="cms-hierarchy-card">
                  <span>1. Lição</span>
                  <strong>Trilha principal</strong>
                  <p>Define tema, visual e intenção pedagógica.</p>
                </article>
                <article className="cms-hierarchy-card">
                  <span>2. Quiz</span>
                  <strong>Bloco jogável</strong>
                  <p>Agrupa desafios de uma mesma etapa da lição.</p>
                </article>
                <article className="cms-hierarchy-card">
                  <span>3. Questão</span>
                  <strong>Micro-game</strong>
                  <p>Item individual com preview, feedback e recompensa.</p>
                </article>
              </div>
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Ações rápidas</h2>
                  <p className="admin-helper">Entre direto no tipo de conteúdo que você quer operar agora.</p>
                </div>
              </div>
              <div className="cms-quick-grid">
                <button className="cms-quick-card" type="button" onClick={() => { setActiveSection('lessons'); openLessonEditor() }}>
                  <BookOpen size={18} />
                  <strong>Nova lição</strong>
                  <span>Crie a trilha principal da jornada.</span>
                </button>
                <button className="cms-quick-card" type="button" onClick={() => { setActiveSection('quizzes'); openQuizEditor() }}>
                  <Gamepad2 size={18} />
                  <strong>Novo quiz</strong>
                  <span>Monte o bloco jogável dentro da lição.</span>
                </button>
                <button className="cms-quick-card" type="button" onClick={() => { setActiveSection('questions'); openQuestionEditor() }}>
                  <WandSparkles size={18} />
                  <strong>Nova questão</strong>
                  <span>Abra o builder com preview em tempo real.</span>
                </button>
                <button className="cms-quick-card" type="button" onClick={() => setActiveSection('settings')}>
                  <Settings size={18} />
                  <strong>Configurações</strong>
                  <span>Ajuste runtime, home e catálogo base.</span>
                </button>
              </div>
            </section>
          </section>
        )}

        {activeSection === 'lessons' && (
          <section className="cms-panel-stack">
            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Lições</h2>
                  <p className="admin-helper">Busque por título, ID ou categoria. A lição organiza toda a trilha abaixo dela.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={() => openLessonEditor()}>
                  <Plus size={16} />
                  Nova lição
                </button>
              </div>

              <div className="cms-filter-row cms-filter-row-lessons">
                <label className="cms-search">
                  <Search size={16} />
                  <input value={lessonSearchInput} onChange={(event) => setLessonSearchInput(event.target.value)} placeholder="Buscar por ID, título ou categoria" />
                </label>
                <select value={lessonCategoryFilter} onChange={(event) => setLessonCategoryFilter(event.target.value as typeof lessonCategoryFilter)}>
                  <option value="Todos">Todas as categorias</option>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>

              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Categoria</th>
                      <th>Título</th>
                      <th>Quizzes</th>
                      <th>Tom</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLessons.map((lesson) => {
                      const quizCount = quizzes.filter((quiz) => quiz.lessonId === lesson.id).length
                      return (
                        <tr key={lesson.id}>
                          <td>{lesson.id}</td>
                          <td>{lesson.category}</td>
                          <td>
                            <strong>{lesson.title}</strong>
                            <small>{lesson.blurb}</small>
                          </td>
                          <td>{quizCount}</td>
                          <td>{lesson.tone}</td>
                          <td className="cms-row-actions">
                            <button type="button" onClick={() => openLessonEditor(lesson)}><Pencil size={14} />Editar</button>
                            <button type="button" className="danger" onClick={() => removeCatalogItem(`${lesson.id} • ${lesson.title}`, () => deleteLesson(lesson.id))}><Trash2 size={14} />Excluir</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === 'quizzes' && (
          <section className="cms-panel-stack">
            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Quizzes</h2>
                  <p className="admin-helper">Filtre por categoria, tipo e status. Cada quiz sempre pertence a uma lição.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={() => openQuizEditor()}>
                  <Plus size={16} />
                  Novo quiz
                </button>
              </div>

              <div className="cms-filter-row">
                <label className="cms-search">
                  <Search size={16} />
                  <input value={quizSearchInput} onChange={(event) => setQuizSearchInput(event.target.value)} placeholder="Buscar por ID, título, lição ou categoria" />
                </label>
                <select value={quizCategoryFilter} onChange={(event) => setQuizCategoryFilter(event.target.value as typeof quizCategoryFilter)}>
                  <option value="Todos">Todas as categorias</option>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select value={quizKindFilter} onChange={(event) => setQuizKindFilter(event.target.value as QuizKindFilter)}>
                  <option value="all">Todos os tipos</option>
                  {questionKinds.map((kind) => <option key={kind} value={kind}>{formatQuestionKind(kind)}</option>)}
                </select>
                <select value={quizStatusFilter} onChange={(event) => setQuizStatusFilter(event.target.value as StatusFilter)}>
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="paused">Pausados</option>
                </select>
              </div>

              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Lição</th>
                      <th>Título</th>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>XP</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuizzes.map((quiz) => (
                      <tr key={quiz.id}>
                        <td>{quiz.id}</td>
                        <td>{lessonMap.get(quiz.lessonId)?.title ?? quiz.lessonId}</td>
                        <td>{quiz.title}</td>
                        <td>{quiz.tag}</td>
                        <td>{formatQuestionKind(quiz.kind)}</td>
                        <td>{quiz.reward}</td>
                        <td>{quiz.active ? 'Ativo' : 'Pausado'}</td>
                        <td className="cms-row-actions">
                          <button type="button" onClick={() => openQuizEditor(quiz)}><Pencil size={14} />Editar</button>
                          <button type="button" onClick={() => duplicateQuiz(quiz)}><Copy size={14} />Duplicar</button>
                          <button type="button" className="danger" onClick={() => removeCatalogItem(`${quiz.id} • ${quiz.title}`, () => deleteQuiz(quiz.id))}><Trash2 size={14} />Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === 'questions' && (
          <section className="cms-panel-stack">
            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Questões</h2>
                  <p className="admin-helper">Tabela compacta com busca instantânea, filtros e edição em drawer lateral.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={() => openQuestionEditor()}>
                  <Plus size={16} />
                  Nova questão
                </button>
              </div>

              <div className="cms-filter-row">
                <label className="cms-search">
                  <Search size={16} />
                  <input value={questionSearchInput} onChange={(event) => setQuestionSearchInput(event.target.value)} placeholder="Buscar por ID, título, quiz ou lição" />
                </label>
                <select value={questionCategoryFilter} onChange={(event) => setQuestionCategoryFilter(event.target.value as typeof questionCategoryFilter)}>
                  <option value="Todos">Todas as categorias</option>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select value={questionKindFilter} onChange={(event) => setQuestionKindFilter(event.target.value as QuizKindFilter)}>
                  <option value="all">Todos os tipos</option>
                  {questionKinds.map((kind) => <option key={kind} value={kind}>{formatQuestionKind(kind)}</option>)}
                </select>
                <select value={questionQuizFilter} onChange={(event) => setQuestionQuizFilter(event.target.value)}>
                  <option value="all">Todos os quizzes</option>
                  {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
                </select>
                <select value={questionStatusFilter} onChange={(event) => setQuestionStatusFilter(event.target.value as StatusFilter)}>
                  <option value="all">Todos os status</option>
                  <option value="active">Ativas</option>
                  <option value="paused">Pausadas</option>
                </select>
              </div>

              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tipo</th>
                      <th>Categoria</th>
                      <th>Título</th>
                      <th>XP</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((question) => (
                      <tr key={question.id}>
                        <td>{question.id}</td>
                        <td>{formatQuestionKind(question.kind)}</td>
                        <td>{question.tag}</td>
                        <td>
                          <strong>{question.title}</strong>
                          <small>{quizMap.get(question.quizId)?.title ?? question.quizId}</small>
                        </td>
                        <td>{question.reward}</td>
                        <td>{question.active ? 'Ativa' : 'Pausada'}</td>
                        <td className="cms-row-actions">
                          <button type="button" onClick={() => openQuestionEditor(question)}><Pencil size={14} />Editar</button>
                          <button type="button" onClick={() => duplicateQuestion(question)}><Copy size={14} />Duplicar</button>
                          <button type="button" className="danger" onClick={() => removeCatalogItem(`${question.id} • ${question.title}`, () => deleteQuizQuestion(question.id))}><Trash2 size={14} />Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === 'achievements' && (
          <section className="cms-panel-stack">
            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Conquistas</h2>
                  <p className="admin-helper">Recompensas compactas, editáveis e preparadas para escalar sem poluir a operação.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={() => openAchievementEditor()}>
                  <Plus size={16} />
                  Nova conquista
                </button>
              </div>

              <div className="cms-filter-row cms-filter-row-lessons">
                <label className="cms-search">
                  <Search size={16} />
                  <input value={achievementSearchInput} onChange={(event) => setAchievementSearchInput(event.target.value)} placeholder="Buscar por ID, título ou descrição" />
                </label>
              </div>

              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Título</th>
                      <th>Ícone</th>
                      <th>XP</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAchievements.map((achievement) => (
                      <tr key={achievement.id}>
                        <td>{achievement.id}</td>
                        <td>
                          <strong>{achievement.title}</strong>
                          <small>{achievement.description}</small>
                        </td>
                        <td>{achievementIconLabel[achievement.icon]}</td>
                        <td>{achievement.xpReward}</td>
                        <td className="cms-row-actions">
                          <button type="button" onClick={() => openAchievementEditor(achievement)}><Pencil size={14} />Editar</button>
                          <button type="button" className="danger" onClick={() => removeCatalogItem(`${achievement.id} • ${achievement.title}`, () => deleteAchievement(achievement.id))}><Trash2 size={14} />Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeSection === 'media' && (
          <section className="cms-panel-stack">
            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Biblioteca de mídia</h2>
                  <p className="admin-helper">Selecione visuais por preview e prepare prompts para uma futura integração real com Pollinations.</p>
                </div>
              </div>

              <div className="cms-media-layout">
                <MediaPicker selected={null} onPick={() => undefined} />
                <article className="cms-ai-card">
                  <div className="cms-ai-head">
                    <span><Sparkles size={16} /> Gerar mídia com IA</span>
                    <small>Mock funcional preparado para futura integração</small>
                  </div>

                  <div className="drawer-form">
                    <div className="drawer-two-col">
                      <label>Escopo
                        <select value={mediaTarget} onChange={(event) => setMediaTarget(event.target.value as typeof mediaTarget)}>
                          <option value="lesson">Lição</option>
                          <option value="quiz">Quiz</option>
                          <option value="question">Questão</option>
                        </select>
                      </label>
                      <label>Estilo
                        <select value={mediaStyle} onChange={(event) => setMediaStyle(event.target.value as MediaStyle)}>
                          {mediaStyles.map((style) => <option key={style} value={style}>{style}</option>)}
                        </select>
                      </label>
                    </div>

                    <label>Destino
                      <select value={mediaTargetId} onChange={(event) => setMediaTargetId(event.target.value)}>
                        {aiTargetOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label} • {option.meta}</option>
                        ))}
                      </select>
                    </label>

                    <label>Prompt gerado
                      <textarea value={generatedPrompt} readOnly />
                    </label>
                  </div>

                  <div className="cms-ai-actions">
                    <button
                      className="admin-primary"
                      type="button"
                      onClick={() => showToast('info', `Prompt de IA preparado para ${mediaTarget}. Próximo passo: integrar Pollinations + rembg nesse fluxo.`)}
                    >
                      <Sparkles size={16} />
                      Gerar mídia com IA
                    </button>
                  </div>
                </article>
              </div>
            </section>
          </section>
        )}

        {(activeSection === 'users' || activeSection === 'analytics') && (
          <section className="cms-panel-stack">
            <section className="cms-panel cms-empty-panel">
              {activeSection === 'users' ? <Users size={28} /> : <BarChart3 size={28} />}
              <h2>{activeSection === 'users' ? 'Usuários' : 'Analytics'}</h2>
              <p>
                Esta área já existe estruturalmente no CMS. O próximo passo é ligar listagem real de usuários, sessões, streak e retenção usando Firestore e Functions.
              </p>
            </section>
          </section>
        )}

        {activeSection === 'settings' && (
          <section className="cms-panel-stack">
            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Configurações da plataforma</h2>
                  <p className="admin-helper">Runtime e conteúdo base em um fluxo claro, sem depender de deploy para operar o produto.</p>
                </div>
              </div>

              <div className="cms-settings-grid">
                <article className="cms-settings-callout">
                  <strong>Popular catálogo base</strong>
                  <p>Cria ou atualiza lições, quizzes, questões e conquistas iniciais para destravar a operação do CMS com conteúdo consistente.</p>
                  <button className="admin-primary" disabled={saving} onClick={populateCatalog} type="button">
                    <Sparkles size={16} />
                    Popular catálogo base
                  </button>
                </article>

                <article className="cms-settings-form">
                  <div className="drawer-form">
                    <label>Headline do hero
                      <input value={platformDraft.heroHeadline} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroHeadline: event.target.value }))} />
                    </label>
                    <label>Subtítulo
                      <textarea value={platformDraft.heroSubtitle} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroSubtitle: event.target.value }))} />
                    </label>
                    <label>CTA principal
                      <input value={platformDraft.playCta} onChange={(event) => setPlatformDraft((current) => ({ ...current, playCta: event.target.value }))} />
                    </label>
                  </div>
                  <button className="admin-primary" disabled={saving} onClick={saveRuntime} type="button">
                    <Save size={16} />
                    Salvar plataforma
                  </button>
                </article>
              </div>
            </section>
          </section>
        )}
      </div>

      {drawer.open && (
        <div className="admin-drawer-backdrop" onClick={closeDrawer}>
          <aside className="admin-drawer" onClick={(event) => event.stopPropagation()}>
            {renderDrawerContent()}
          </aside>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'error' && <X size={16} />}
          {toast.type === 'info' && <Sparkles size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

function DrawerShell({
  kicker,
  title,
  subtitle,
  children,
  saving,
  saveLabel,
  onClose,
  onSave,
}: {
  kicker: string
  title: string
  subtitle: string
  children: ReactNode
  saving: boolean
  saveLabel: string
  onClose: () => void
  onSave: () => void
}) {
  return (
    <>
      <div className="admin-drawer-head">
        <div>
          <span className="admin-drawer-kicker">{kicker}</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="drawer-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="admin-drawer-body">{children}</div>

      <div className="admin-drawer-footer">
        <button className="admin-secondary" type="button" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button className="admin-primary admin-primary-compact" type="button" onClick={onSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Salvando...' : saveLabel}
        </button>
      </div>
    </>
  )
}

function MediaPicker({
  selected,
  onPick,
  compact = false,
}: {
  selected: string | null
  onPick: (path: string) => void
  compact?: boolean
}) {
  return (
    <section className={`drawer-section${compact ? ' is-compact' : ''}`}>
      <div className="drawer-section-head">
        <strong>Biblioteca visual</strong>
        <span>Selecione um asset pelo preview, não pelo path.</span>
      </div>
      <div className="media-grid">
        {mediaLibrary.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className={`media-card${selected === asset.path ? ' is-selected' : ''}`}
            onClick={() => onPick(asset.path)}
          >
            <img src={asset.path} alt={asset.label} />
            <span>{asset.label}</span>
            {selected === asset.path && <Check size={14} />}
          </button>
        ))}
      </div>
    </section>
  )
}

function QuestionPreviewCard({
  question,
  quizTitle,
  lessonTitle,
}: {
  question: QuizQuestionItem
  quizTitle: string
  lessonTitle: string
}) {
  return (
    <article className="question-preview-card">
      <div className="question-preview-head">
        <span><Gem size={14} /> {question.tag}</span>
        <span><Gamepad2 size={14} /> {quizTitle}</span>
        <span><BookOpen size={14} /> {lessonTitle}</span>
      </div>
      <strong>{question.title || 'Prévia do desafio'}</strong>
      <p>{question.prompt || 'Monte o desafio e acompanhe a experiência antes de publicar.'}</p>
      <QuestionPreviewStage question={question} />
    </article>
  )
}

function QuestionPreviewStage({ question }: { question: QuizQuestionItem }) {
  if (question.kind === 'multiple-choice') {
    const options = question.options?.filter(Boolean) ?? []
    return (
      <div className="question-preview-stage">
        <div className="preview-choice-list">
          {(options.length ? options : ['option A', 'option B', 'option C', 'option D']).map((option) => (
            <span key={option} className={`preview-choice${option === question.correct ? ' is-answer' : ''}`}>{option}</span>
          ))}
        </div>
      </div>
    )
  }

  if (question.kind === 'listening') {
    return (
      <div className="question-preview-stage">
        <div className="preview-audio-player">
          <button type="button"><AudioLines size={16} /></button>
          <div className="preview-audio-wave" />
          <span>0:05</span>
        </div>
        <div className="preview-choice-list compact">
          {((question.options?.filter(Boolean) ?? ['It is a cat.', 'It is a dog.', 'It is a bird.']).slice(0, 3)).map((option) => (
            <span key={option} className={`preview-choice${option === question.correct ? ' is-answer' : ''}`}>{option}</span>
          ))}
        </div>
      </div>
    )
  }

  if (question.kind === 'speaking') {
    return (
      <div className="question-preview-stage">
        <div className="preview-speaking-stage">
          <div className="preview-mic-ring">
            <Mic size={22} />
          </div>
          <strong>Toque para falar</strong>
          <span>{question.correct || 'I usually play basketball.'}</span>
        </div>
      </div>
    )
  }

  if (question.kind === 'drag-fill') {
    return (
      <div className="question-preview-stage">
        <div className="preview-sentence">
          <span>{question.sentenceBefore || 'I enjoy'}</span>
          <span className="preview-slot">{question.correct || 'swimming'}</span>
          <span>{question.sentenceAfter || 'in the mountains.'}</span>
        </div>
        <div className="preview-token-row">
          {(question.options?.filter(Boolean) ?? ['swim', 'to swim', 'swimming']).map((option) => (
            <span key={option} className="preview-token">{option}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="question-preview-stage">
      <div className="preview-token-row">
        {(question.scrambled?.length ? question.scrambled : ['Where', 'are', 'you', 'from', '?']).map((token) => (
          <span key={token} className="preview-token">{token}</span>
        ))}
      </div>
      <div className="preview-solution">
        {(question.solution?.length ? question.solution.join(' ') : 'Where are you from ?')}
      </div>
    </div>
  )
}
