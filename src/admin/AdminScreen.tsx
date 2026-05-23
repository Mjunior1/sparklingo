import './AdminScreen.css'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bot,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  Gamepad2,
  Gauge,
  Gem,
  Image,
  LayoutDashboard,
  RefreshCw,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  Volume2,
  Mic,
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
import {
  buildDraftFromComposer,
  defaultQuestionMix,
  draftQuestionTypeOptions,
  getAIDrafts,
  missionLevelOptions,
  missionTemplateOptions,
  publishAIDraft,
  regenerateDraftPart,
  saveAIDraft,
  studentGoalOptions,
  updateAIDraftStatus,
  visualStyleOptions,
  type AIDraftRecord,
  type DraftQuestionType,
  type LessonComposerInput,
  type MissionTemplate,
  type PartialRegenerationMode,
  type StudentGoal,
  type VisualStyle,
} from '../services/aiDrafts'
import {
  defaultAIControlConfig,
  defaultMemoryEngineConfig,
  getAIControlConfig,
  getMemoryEngineConfig,
  maskApiKey,
  providerModels,
  saveAIControlConfig,
  saveMemoryEngineConfig,
  testProviderConnection,
  type AIControlConfig,
  type AIProvider,
  type MemoryEngineConfig,
} from '../services/aiControl'
import {
  generateMediaToFirestore,
  getGeneratedMediaCatalog,
  markGeneratedMediaApplied,
  type GeneratedMediaAsset,
} from '../services/media'
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
  | 'ai-control'
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

type MediaAiScope = 'lesson' | 'quiz' | 'question'
type MediaAiStyle = 'cartoon' | '3D' | 'pastel' | 'kawaii' | 'cinematic'
type MediaAsset = {
  id: string
  label: string
  path: string
  tone: LessonTone
}

const tagOptions: Exclude<FilterKey, 'Todos'>[] = ['Gramática', 'Vocabulário', 'Listening', 'Reading', 'Speaking']
type ToastState = {
  tone: 'success' | 'error' | 'info'
  message: string
} | null

type StatusFilter = 'all' | 'active' | 'inactive'

const questionKinds: Array<QuizQuestionItem['kind']> = ['multiple-choice', 'drag-fill', 'ordering', 'listening', 'speaking']

const navItems: Array<{ key: SectionKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'ai-control', label: 'AI Control Center', icon: BrainCircuit },
  { key: 'lessons', label: 'Lições', icon: BookOpen },
  { key: 'quizzes', label: 'Quizzes', icon: Gamepad2 },
  { key: 'questions', label: 'Questões', icon: WandSparkles },
  { key: 'achievements', label: 'Conquistas', icon: Trophy },
  { key: 'media', label: 'Biblioteca de mídia', icon: Image },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Configurações', icon: Settings },
]

const mediaLibrary: MediaAsset[] = [
  { id: 'airport', label: 'Airport', path: '/pollinations/airport-card.png', tone: 'sky' },
  { id: 'grammar', label: 'Grammar', path: '/pollinations/grammar-card.png', tone: 'violet' },
  { id: 'listening', label: 'Listening', path: '/pollinations/listening-card.png', tone: 'mint' },
  { id: 'mountain', label: 'Mountain', path: '/pollinations/mountain-card.png', tone: 'sky' },
  { id: 'dog', label: 'Dog', path: '/pollinations/dog-card.png', tone: 'mint' },
  { id: 'storm', label: 'Storm', path: '/pollinations/storm-card.png', tone: 'violet' },
]

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
  coverArt: '',
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

const formatQuestionKind = (kind: QuizQuestionItem['kind']) => {
  if (kind === 'multiple-choice') return 'Múltipla escolha'
  if (kind === 'drag-fill') return 'Drag & Drop'
  if (kind === 'ordering') return 'Ordenação'
  if (kind === 'listening') return 'Listening'
  return 'Speaking'
}

const formatDraftType = (kind: DraftQuestionType) => {
  if (kind === 'multiple-choice') return 'Múltipla escolha'
  if (kind === 'drag-fill') return 'Drag & Drop'
  if (kind === 'fill-blank') return 'Completar frase'
  if (kind === 'matching') return 'Matching'
  if (kind === 'listening') return 'Listening'
  return 'Speaking'
}

const templateDefaultsForLabel = (template: MissionTemplate) => {
  if (template === 'Travel Beginner') return 'sessão leve com segurança pedagógica'
  if (template === 'Airport Survival') return 'missão contextual para viagem e urgência'
  if (template === 'Restaurant Mission') return 'vocabulário funcional para vida real'
  if (template === 'Speaking Heavy') return 'mais fala, menos passividade'
  if (template === 'Listening Booster') return 'ouvido rápido com pistas curtas'
  return 'sprint diária com baixa fricção'
}

const padNumber = (value: number) => String(value).padStart(5, '0')

const buildDisplayIdMap = (ids: string[], prefix: string) =>
  new Map(
    ids
      .slice()
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((id, index) => [id, `${prefix}-${padNumber(index + 1)}`]),
  )

const nextNumericId = (existingIds: string[], prefix: string) => {
  const matches = existingIds
    .map((id) => {
      const explicit = id.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'))
      if (explicit) return Number(explicit[1])
      const trailing = id.match(/(\d+)(?!.*\d)/)
      return trailing ? Number(trailing[1]) : Number.NaN
    })
    .filter((value) => Number.isFinite(value))

  return `${prefix}-${padNumber((matches.length ? Math.max(...matches) : existingIds.length) + 1)}`
}

const sectionTitle: Record<SectionKey, string> = {
  dashboard: 'Dashboard operacional',
  'ai-control': 'AI Control Center',
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
  dashboard: 'Acompanhe o catálogo, veja o volume de conteúdo e acesse ações rápidas sem abrir formulários gigantes.',
  'ai-control': 'Configure providers, guardrails, drafts e geração contextual sem quebrar a hierarquia atual de lições, quizzes e questões.',
  lessons: 'Crie e organize as trilhas principais. Cada lição agrupa quizzes e define o tom visual da jornada.',
  quizzes: 'Estruture os blocos jogáveis dentro das lições e mantenha a progressão clara.',
  questions: 'Encontre, filtre e edite qualquer desafio em segundos com uma grade compacta e um drawer lateral.',
  achievements: 'Gerencie recompensas e marcos emocionais da experiência.',
  media: 'Escolha assets visuais de forma rápida, sem depender de caminhos manuais.',
  users: 'Área preparada para gestão de contas, turmas e suporte operacional.',
  analytics: 'Área preparada para retenção, sessões, streak, desempenho e consumo de conteúdo.',
  settings: 'Ajuste o runtime e os textos principais da plataforma.',
}

const pedagogicalModes: AIControlConfig['pedagogicalMode'][] = [
  'Beginner Safe',
  'Travel Immersion',
  'Speaking Heavy',
  'Vocabulary Focus',
  'Listening Booster',
  'Fast Daily Lesson',
]

const aiComposerDefaults: LessonComposerInput = {
  template: 'Airport Survival',
  theme: 'At the Airport',
  emotionalContext: 'You missed your flight in London.',
  practicalGoal: 'Aluno consegue pedir ajuda e entender o próximo passo no aeroporto.',
  level: 'Beginner',
  quizCount: 3,
  questionsPerQuiz: 2,
  visualStyle: 'Cartoon 3D',
  studentGoal: 'Travel',
  pedagogicalMode: 'Travel Immersion',
  questionMix: {
    ...defaultQuestionMix,
    speaking: 2,
    listening: 1,
  },
}

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
  const [status, setStatus] = useState('CMS conectado ao Firestore. Crie, edite e publique conteúdo real sem depender de deploy.')
  const [toast, setToast] = useState<ToastState>(null)
  const [saving, setSaving] = useState(false)
  const [lessonSearch, setLessonSearch] = useState('')
  const [lessonFilterTag, setLessonFilterTag] = useState<FilterKey | 'Todos'>('Todos')
  const [quizSearch, setQuizSearch] = useState('')
  const [quizFilterTag, setQuizFilterTag] = useState<FilterKey | 'Todos'>('Todos')
  const [quizFilterStatus, setQuizFilterStatus] = useState<StatusFilter>('all')
  const [questionSearch, setQuestionSearch] = useState('')
  const [filterTag, setFilterTag] = useState<FilterKey | 'Todos'>('Todos')
  const [filterKind, setFilterKind] = useState<QuizQuestionItem['kind'] | 'all'>('all')
  const [filterQuizId, setFilterQuizId] = useState<string>('all')
  const [questionStatus, setQuestionStatus] = useState<StatusFilter>('all')
  const [achievementSearch, setAchievementSearch] = useState('')
  const [lessonDraft, setLessonDraft] = useState<LessonCatalogItem>(emptyLesson)
  const [quizDraft, setQuizDraft] = useState<QuizCatalogItem>(emptyQuiz)
  const [questionDraft, setQuestionDraft] = useState<QuizQuestionItem>(emptyQuestion)
  const [achievementDraft, setAchievementDraft] = useState<AchievementCatalogItem>(emptyAchievement)
  const [platformDraft, setPlatformDraft] = useState<PlatformConfig>(platformConfig ?? defaultPlatformConfig)
  const [mediaAiOpen, setMediaAiOpen] = useState(false)
  const [mediaAiTarget, setMediaAiTarget] = useState<MediaAiScope>('lesson')
  const [mediaAiTargetId, setMediaAiTargetId] = useState('')
  const [mediaAiStyle, setMediaAiStyle] = useState<MediaAiStyle>('3D')
  const [mediaAiGenerated, setMediaAiGenerated] = useState<GeneratedMediaAsset[]>([])
  const [mediaAiSelectedId, setMediaAiSelectedId] = useState('')
  const [mediaAiGenerating, setMediaAiGenerating] = useState(false)
  const [generatedMediaLibrary, setGeneratedMediaLibrary] = useState<GeneratedMediaAsset[]>([])
  const [aiControl, setAiControl] = useState<AIControlConfig>(defaultAIControlConfig)
  const [memoryConfig, setMemoryConfig] = useState<MemoryEngineConfig>(defaultMemoryEngineConfig)
  const [aiApiKeyInput, setAiApiKeyInput] = useState('')
  const [aiConnectionMessage, setAiConnectionMessage] = useState('')
  const [aiTestingConnection, setAiTestingConnection] = useState(false)
  const [aiDrafts, setAiDrafts] = useState<AIDraftRecord[]>([])
  const [aiComposer, setAiComposer] = useState<LessonComposerInput>(aiComposerDefaults)
  const [aiPreviewDraft, setAiPreviewDraft] = useState<AIDraftRecord | null>(null)
  const [aiSelectedDraftId, setAiSelectedDraftId] = useState('')
  const [aiComposerLoading, setAiComposerLoading] = useState(false)

  const debouncedLessonSearch = useDebouncedValue(lessonSearch)
  const debouncedQuizSearch = useDebouncedValue(quizSearch)
  const debouncedQuestionSearch = useDebouncedValue(questionSearch)
  const debouncedAchievementSearch = useDebouncedValue(achievementSearch)

  useEffect(() => {
    setPlatformDraft(platformConfig ?? defaultPlatformConfig)
  }, [platformConfig])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!questionDraft.quizId) return
    const linkedQuiz = quizzes.find((quiz) => quiz.id === questionDraft.quizId)
    if (!linkedQuiz) return

    setQuestionDraft((current) => ({
      ...current,
      lessonId: linkedQuiz.lessonId,
      tag: linkedQuiz.tag,
      reward: current.reward || linkedQuiz.reward,
      difficulty: linkedQuiz.difficulty,
    }))
  }, [questionDraft.quizId, quizzes])

  const lessonIdPreview = useMemo(
    () => lessonDraft.id || nextNumericId(lessons.map((item) => item.id), 'LS'),
    [lessonDraft.id, lessons],
  )

  const quizIdPreview = useMemo(
    () => quizDraft.id || nextNumericId(quizzes.map((item) => item.id), 'QZ'),
    [quizDraft.id, quizzes],
  )

  const questionIdPreview = useMemo(
    () => questionDraft.id || nextNumericId(questions.map((item) => item.id), 'QT'),
    [questionDraft.id, questions],
  )

  const achievementIdPreview = useMemo(
    () => achievementDraft.id || nextNumericId(achievements.map((item) => item.id), 'AC'),
    [achievementDraft.id, achievements],
  )

  const lessonDisplayIds = useMemo(() => buildDisplayIdMap(lessons.map((item) => item.id), 'LS'), [lessons])
  const quizDisplayIds = useMemo(() => buildDisplayIdMap(quizzes.map((item) => item.id), 'QZ'), [quizzes])
  const questionDisplayIds = useMemo(() => buildDisplayIdMap(questions.map((item) => item.id), 'QT'), [questions])
  const achievementDisplayIds = useMemo(() => buildDisplayIdMap(achievements.map((item) => item.id), 'AC'), [achievements])

  const displayId = (id: string, kind: 'lesson' | 'quiz' | 'question' | 'achievement') => {
    if (!id) return ''
    const map =
      kind === 'lesson'
        ? lessonDisplayIds
        : kind === 'quiz'
          ? quizDisplayIds
          : kind === 'question'
            ? questionDisplayIds
            : achievementDisplayIds

    return map.get(id) ?? id.toUpperCase()
  }

  const sortedLessons = useMemo(() => lessons.slice().sort((a, b) => a.title.localeCompare(b.title)), [lessons])
  const sortedQuizzes = useMemo(() => quizzes.slice().sort((a, b) => a.title.localeCompare(b.title)), [quizzes])
  const filteredLessons = useMemo(() => {
    return sortedLessons
      .filter((lesson) => lessonFilterTag === 'Todos' || lesson.category === lessonFilterTag)
      .filter((lesson) => {
        if (!debouncedLessonSearch.trim()) return true
        const haystack = `${lesson.id} ${lesson.title} ${lesson.category}`.toLowerCase()
        return haystack.includes(debouncedLessonSearch.toLowerCase())
      })
  }, [debouncedLessonSearch, lessonFilterTag, sortedLessons])

  const filteredQuizzes = useMemo(() => {
    return sortedQuizzes
      .filter((quiz) => quizFilterTag === 'Todos' || quiz.tag === quizFilterTag)
      .filter((quiz) => quizFilterStatus === 'all' || (quizFilterStatus === 'active'  ? quiz.active : !quiz.active))
      .filter((quiz) => {
        if (!debouncedQuizSearch.trim()) return true
        const linkedLesson = lessons.find((lesson) => lesson.id === quiz.lessonId)
        const haystack = `${quiz.id} ${quiz.title} ${quiz.tag} ${quiz.lessonId} ${linkedLesson?.title ?? ''}`.toLowerCase()
        return haystack.includes(debouncedQuizSearch.toLowerCase())
      })
  }, [debouncedQuizSearch, lessons, quizFilterStatus, quizFilterTag, sortedQuizzes])

  const filteredQuestions = useMemo(() => {
    return questions
      .filter((question) => filterTag === 'Todos' || question.tag === filterTag)
      .filter((question) => filterKind === 'all' || question.kind === filterKind)
      .filter((question) => filterQuizId === 'all' || question.quizId === filterQuizId)
      .filter((question) => questionStatus === 'all' || (questionStatus === 'active'  ? question.active : !question.active))
      .filter((question) => {
        if (!debouncedQuestionSearch.trim()) return true
        const haystack = `${question.id} ${question.title} ${question.prompt} ${question.quizId} ${question.lessonId}`.toLowerCase()
        return haystack.includes(debouncedQuestionSearch.toLowerCase())
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  }, [debouncedQuestionSearch, filterKind, filterQuizId, filterTag, questionStatus, questions])

  const filteredAchievements = useMemo(() => {
    const source = achievements.length  ? achievements : defaultAchievementCatalog
    return source.filter((achievement) => {
      if (!debouncedAchievementSearch.trim()) return true
      const haystack = `${achievement.id} ${achievement.title} ${achievement.description}`.toLowerCase()
      return haystack.includes(debouncedAchievementSearch.toLowerCase())
    })
  }, [achievements, debouncedAchievementSearch])

  const dashboardStats = [
    { label: 'Lições', value: lessons.length, helper: 'trilhas vivas' },
    { label: 'Quizzes', value: quizzes.length, helper: 'blocos jogáveis' },
    { label: 'Questões', value: questions.length, helper: 'itens no catálogo' },
    { label: 'Conquistas', value: achievements.length || defaultAchievementCatalog.length, helper: 'recompensas' },
  ]

  const currentQuestionQuiz = quizzes.find((quiz) => quiz.id === questionDraft.quizId)
  const currentQuestionLesson = lessons.find((lesson) => lesson.id === questionDraft.lessonId)
  const selectedMediaLesson = lessons.find((lesson) => lesson.id === mediaAiTargetId)
  const selectedMediaQuiz = quizzes.find((quiz) => quiz.id === mediaAiTargetId)
  const selectedMediaQuestion = questions.find((question) => question.id === mediaAiTargetId)
  const mediaTargetOptions = mediaAiTarget === 'lesson'
    ? sortedLessons.map((lesson) => ({ id: lesson.id, label: lesson.title }))
    : mediaAiTarget === 'quiz'
      ? sortedQuizzes.map((quiz) => ({ id: quiz.id, label: quiz.title }))
      : questions.map((question) => ({ id: question.id, label: question.title }))
  const selectedMediaTarget = mediaTargetOptions.find((item) => item.id === mediaAiTargetId)

  const questionPreview = useMemo(() => {
    if (questionDraft.kind === 'drag-fill') {
      return `${questionDraft.sentenceBefore || 'I enjoy'} [ slot ] ${questionDraft.sentenceAfter || 'in the mountains.'}`
    }

    if (questionDraft.kind === 'ordering') {
      return (questionDraft.scrambled ?? []).join(' • ') || 'Where • are • you • from • ?'
    }

    return (questionDraft.options ?? []).filter(Boolean).join(' • ') || 'go • goes • going • gone'
  }, [questionDraft])

  const mediaPrompt = useMemo(() => {
    const label = selectedMediaTarget?.label ?? 'conteúdo atual'
    const scopeLabel = mediaAiTarget === 'lesson' ? 'uma lição' : mediaAiTarget === 'quiz' ? 'um quiz' : 'uma questão'
    const targetCategory =
      mediaAiTarget === 'lesson'
        ? selectedMediaLesson?.category
        : mediaAiTarget === 'quiz'
          ? selectedMediaQuiz?.tag
          : selectedMediaQuestion?.tag
    const targetKind =
      mediaAiTarget === 'question'
        ? selectedMediaQuestion?.kind
        : mediaAiTarget === 'quiz'
          ? selectedMediaQuiz?.kind
          : null
    const contextLine = [targetCategory, targetKind ? formatQuestionKind(targetKind).toLowerCase() : null]
      .filter(Boolean)
      .join(', ')

    return `Crie uma ilustração ${mediaAiStyle} simples e premium para ${scopeLabel} do SparkLingo, tema "${label}"${contextLine ? `, contexto ${contextLine}` : ''}, foco em um objeto principal, composição clara, sem texto, sem interface e pronta para card.`
  }, [mediaAiStyle, mediaAiTarget, selectedMediaLesson?.category, selectedMediaQuestion?.kind, selectedMediaQuestion?.tag, selectedMediaQuiz?.kind, selectedMediaQuiz?.tag, selectedMediaTarget])

  const composerQuestionTotal = useMemo(
    () => Object.values(aiComposer.questionMix).reduce((sum, value) => sum + value, 0),
    [aiComposer.questionMix],
  )

  const selectedDraft = useMemo(
    () => aiDrafts.find((item) => item.id === aiSelectedDraftId) ?? null,
    [aiDrafts, aiSelectedDraftId],
  )

  const aiObservability = useMemo(() => {
    const published = aiDrafts.filter((item) => item.status === 'published').length
    const approved = aiDrafts.filter((item) => item.status === 'approved').length
    const rejected = aiDrafts.filter((item) => item.status === 'rejected').length
    const avgCost =
      aiDrafts.length
        ? aiDrafts.reduce((sum, item) => sum + item.estimatedCostUsd, 0) / aiDrafts.length
        : 0

    return {
      total: aiDrafts.length,
      published,
      approvalRate: aiDrafts.length ? Math.round(((published + approved) / aiDrafts.length) * 100) : 0,
      rejected,
      avgCost: avgCost.toFixed(3),
    }
  }, [aiDrafts])

  const generatedMediaAssets = useMemo<GeneratedMediaAsset[]>(() => mediaAiGenerated.slice(0, 3), [mediaAiGenerated])
  const mediaPickerAssets = useMemo<MediaAsset[]>(
    () => [
      ...generatedMediaLibrary.map((asset) => ({
        id: asset.id,
        label: asset.label,
        path: asset.path,
        tone: asset.tone,
      })),
      ...mediaLibrary,
    ],
    [generatedMediaLibrary],
  )

  const selectedGeneratedMedia = useMemo(
    () => generatedMediaAssets.find((asset) => asset.id === mediaAiSelectedId) ?? generatedMediaAssets[0] ?? null,
    [generatedMediaAssets, mediaAiSelectedId],
  )

  useEffect(() => {
    if (!generatedMediaAssets.length) {
      setMediaAiSelectedId('')
      return
    }

    if (!generatedMediaAssets.some((asset) => asset.id === mediaAiSelectedId)) {
      setMediaAiSelectedId(generatedMediaAssets[0].id)
    }
  }, [generatedMediaAssets, mediaAiSelectedId])

  useEffect(() => {
    getGeneratedMediaCatalog()
      .then(setGeneratedMediaLibrary)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    getAIControlConfig().then(setAiControl).catch(() => undefined)
    getMemoryEngineConfig().then(setMemoryConfig).catch(() => undefined)
    getAIDrafts().then(setAiDrafts).catch(() => undefined)
  }, [])

  useEffect(() => {
    const availableModels = providerModels[aiControl.provider]
    if (!availableModels.includes(aiControl.primaryModel) || !availableModels.includes(aiControl.fallbackModel)) {
      setAiControl((current) => ({
        ...current,
        primaryModel: availableModels[0],
        fallbackModel: availableModels[Math.min(1, availableModels.length - 1)] ?? availableModels[0],
      }))
    }
  }, [aiControl.provider, aiControl.primaryModel, aiControl.fallbackModel])

  const openDrawer = (kind: DrawerKind, mode: DrawerMode) => setDrawer({ open: true, kind, mode })
  const closeDrawer = () => setDrawer({ open: false })
  const showToast = (tone: NonNullable<ToastState>['tone'], message: string) => setToast({ tone, message })
  const openMediaAiModal = () => {
    if (drawer.open) {
      if (drawer.kind === 'lesson') {
        setMediaAiTarget('lesson')
        setMediaAiTargetId(lessonIdPreview)
      } else if (drawer.kind === 'quiz') {
        setMediaAiTarget('quiz')
        setMediaAiTargetId(quizIdPreview)
      } else if (drawer.kind === 'question') {
        setMediaAiTarget('question')
        setMediaAiTargetId(questionIdPreview)
      }
    }
    setMediaAiGenerated([])
    setMediaAiSelectedId('')
    setMediaAiOpen(true)
  }

  const generateMediaMocks = async () => {
    if (!mediaAiTargetId) {
      showToast('info', 'Selecione um alvo para gerar a mídia com contexto real.')
      return
    }

    setMediaAiGenerating(true)
    try {
      const basePrompt = `${mediaPrompt}. Crie apenas uma imagem simples de card, sem texto, sem bordas de interface, sem personagens extras e sem colagem visual.`
      const targetTone =
        mediaAiTarget === 'lesson'
          ? selectedMediaLesson?.tone
          : mediaAiTarget === 'question'
            ? mediaLibrary.find((asset) => asset.path === selectedMediaQuestion?.art)?.tone
            : mediaLibrary.find((asset) => asset.path === selectedMediaQuiz?.coverArt)?.tone

      const variants = await generateMediaToFirestore({
        prompt: basePrompt,
        scope: mediaAiTarget,
        targetId: mediaAiTargetId,
        style: mediaAiStyle,
        label: selectedMediaTarget?.label ?? 'Conteúdo',
        tone: targetTone ?? 'violet',
        count: 3,
      })

      setMediaAiGenerated(variants)
      setGeneratedMediaLibrary((current) => [...variants, ...current].slice(0, 36))
      setMediaAiSelectedId(variants[0]?.id ?? '')
      setMediaAiGenerating(false)
      showToast('success', `${variants.length} variações geradas e registradas no Firestore.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível gerar imagens com IA.'
      setMediaAiGenerating(false)
      showToast('error', message)
    }
  }

  const applyGeneratedMedia = async (asset: GeneratedMediaAsset) => {
    const path = asset.path
    if (mediaAiTarget === 'lesson' && drawer.open && drawer.kind === 'lesson') {
      setLessonDraft((current) => ({ ...current, image: path }))
      await markGeneratedMediaApplied(asset.id, { scope: 'lesson', targetId: lessonIdPreview })
      showToast('success', 'Asset aplicado na lição atual.')
      setMediaAiOpen(false)
      return
    }

    if (mediaAiTarget === 'question' && drawer.open && drawer.kind === 'question') {
      setQuestionDraft((current) => ({ ...current, art: path }))
      await markGeneratedMediaApplied(asset.id, { scope: 'question', targetId: questionIdPreview })
      showToast('success', 'Asset aplicado na questão atual.')
      setMediaAiOpen(false)
      return
    }

    if (mediaAiTarget === 'quiz' && drawer.open && drawer.kind === 'quiz') {
      setQuizDraft((current) => ({ ...current, coverArt: path }))
      await markGeneratedMediaApplied(asset.id, { scope: 'quiz', targetId: quizIdPreview })
      showToast('success', 'Asset aplicado no quiz atual.')
      setMediaAiOpen(false)
      return
    }

    await runAdminTask('Aplicando mídia gerada...', 'Mídia aplicada e salva no Firestore.', async () => {
      if (mediaAiTarget === 'lesson') {
        const lesson = lessons.find((item) => item.id === mediaAiTargetId)
        if (!lesson) throw new Error('Selecione uma lição válida para aplicar a mídia.')
        await upsertLesson({ ...lesson, image: path })
        await markGeneratedMediaApplied(asset.id, { scope: 'lesson', targetId: mediaAiTargetId })
        return
      }

      if (mediaAiTarget === 'quiz') {
        const quiz = quizzes.find((item) => item.id === mediaAiTargetId)
        if (!quiz) throw new Error('Selecione um quiz válido para aplicar a mídia.')
        await upsertQuiz({ ...quiz, coverArt: path })
        await markGeneratedMediaApplied(asset.id, { scope: 'quiz', targetId: mediaAiTargetId })
        return
      }

      const question = questions.find((item) => item.id === mediaAiTargetId)
      if (!question) throw new Error('Selecione uma questão válida para aplicar a mídia.')
      await upsertQuizQuestion({ ...question, art: path })
      await markGeneratedMediaApplied(asset.id, { scope: 'question', targetId: mediaAiTargetId })
    })

    setMediaAiOpen(false)
  }

  const runAdminTask = async (loadingMessage: string, successMessage: string, task: () => Promise<void>) => {
    setSaving(true)
    setStatus(loadingMessage)
    try {
      await task()
      await onRefresh()
      setStatus(successMessage)
      showToast('success', successMessage)
    } catch (error) {
      const message = error instanceof Error  ? error.message : 'Não foi possível concluir a operação no Firestore.'
      setStatus(message)
      showToast('error', message)
    } finally {
      setSaving(false)
    }
  }

  const saveLesson = () => runAdminTask(
    'Salvando lição...',
    `Lição "${lessonDraft.title}" salva com sucesso.`,
    async () => {
      await upsertLesson({ ...lessonDraft, id: lessonIdPreview })
      setLessonDraft(emptyLesson)
      closeDrawer()
    },
  )

  const saveQuiz = () => runAdminTask(
    'Salvando quiz...',
    `Quiz "${quizDraft.title}" salvo com sucesso.`,
    async () => {
      await upsertQuiz({ ...quizDraft, id: quizIdPreview })
      setQuizDraft(emptyQuiz)
      closeDrawer()
    },
  )

  const saveQuestion = () => runAdminTask(
    'Salvando questão...',
    `Questão "${questionDraft.title}" salva e já pode alimentar a home.`,
    async () => {
      await upsertQuizQuestion({
        ...questionDraft,
        id: questionIdPreview,
        options: questionDraft.kind === 'multiple-choice' || questionDraft.kind === 'drag-fill' || questionDraft.kind === 'listening'
           ? (questionDraft.options ?? []).filter(Boolean)
          : [],
        correct: questionDraft.kind === 'ordering'  ? '' : (questionDraft.correct ?? ''),
        sentenceBefore: questionDraft.kind === 'drag-fill'  ? (questionDraft.sentenceBefore ?? '') : '',
        sentenceAfter: questionDraft.kind === 'drag-fill'  ? (questionDraft.sentenceAfter ?? '') : '',
        scrambled: questionDraft.kind === 'ordering'  ? (questionDraft.scrambled ?? []).filter(Boolean) : [],
        solution: questionDraft.kind === 'ordering'  ? (questionDraft.solution ?? []).filter(Boolean) : [],
      })
      setQuestionDraft(emptyQuestion)
      closeDrawer()
    },
  )

  const saveAchievementItem = () => runAdminTask(
    'Salvando conquista...',
    `Conquista "${achievementDraft.title}" salva com sucesso.`,
    async () => {
      await upsertAchievement({ ...achievementDraft, id: achievementIdPreview })
      setAchievementDraft(emptyAchievement)
      closeDrawer()
    },
  )

  const removeCatalogItem = async (label: string, task: () => Promise<void>) => {
    if (!window.confirm(`Excluir "${label}" do catálogo?`)) return

    await runAdminTask(
      `Excluindo "${label}"...`,
      `"${label}" removido do Firestore.`,
      task,
    )
  }

  const duplicateQuestion = (question: QuizQuestionItem) => {
    setQuestionDraft({
      ...question,
      id: '',
      title: `${question.title} copy`,
    })
    setActiveSection('questions')
    openDrawer('question', 'create')
  }

  const openLessonEditor = (lesson?: LessonCatalogItem) => {
    setLessonDraft(lesson ?? emptyLesson)
    openDrawer('lesson', lesson  ? 'edit' : 'create')
  }

  const openQuizEditor = (quiz?: QuizCatalogItem) => {
    setQuizDraft(quiz ?? emptyQuiz)
    openDrawer('quiz', quiz  ? 'edit' : 'create')
  }

  const openQuestionEditor = (question?: QuizQuestionItem) => {
    setQuestionDraft(question
       ? {
          ...emptyQuestion,
          ...question,
          options: question.options ?? ['', '', '', ''],
          correct: question.correct ?? '',
          sentenceBefore: question.sentenceBefore ?? '',
          sentenceAfter: question.sentenceAfter ?? '',
          scrambled: question.scrambled ?? [],
          solution: question.solution ?? [],
        }
      : emptyQuestion)
    openDrawer('question', question  ? 'edit' : 'create')
  }

  const openAchievementEditor = (achievement?: AchievementCatalogItem) => {
    setAchievementDraft(achievement ?? emptyAchievement)
    openDrawer('achievement', achievement  ? 'edit' : 'create')
  }

  const applyMediaAsset = (path: string) => {
    if (!drawer.open) {
      navigator.clipboard?.writeText(path).catch(() => undefined)
      showToast('success', 'Path do asset copiado. Abra uma lição, quiz ou questão para aplicar diretamente.')
      return
    }
    if (drawer.kind === 'lesson') {
      setLessonDraft((current) => ({ ...current, image: path }))
      return
    }
    if (drawer.kind === 'quiz') {
      setQuizDraft((current) => ({ ...current, coverArt: path }))
      return
    }
    if (drawer.kind === 'question') {
      setQuestionDraft((current) => ({ ...current, art: path }))
    }
  }

  const applyTemplatePreset = (template: MissionTemplate) => {
    const preset = {
      ...aiComposerDefaults,
      template,
    }

    if (template === 'Travel Beginner') {
      preset.theme = 'Travel Basics'
      preset.emotionalContext = 'Your first day travelling alone.'
      preset.practicalGoal = 'Aluno pede ajuda, entende instruções curtas e ganha confiança.'
    } else if (template === 'Restaurant Mission') {
      preset.theme = 'At the Restaurant'
      preset.emotionalContext = 'You need to order quickly and clearly.'
      preset.practicalGoal = 'Aluno pede comida, pergunta preço e reage com naturalidade.'
      preset.studentGoal = 'Social'
      preset.visualStyle = 'Modern Flat'
    } else if (template === 'Speaking Heavy') {
      preset.theme = 'Talk with confidence'
      preset.emotionalContext = 'You need to answer without freezing.'
      preset.practicalGoal = 'Aluno responde, explica e sustenta micro diálogos.'
      preset.studentGoal = 'Confidence'
      preset.pedagogicalMode = 'Speaking Heavy'
      preset.questionMix = { ...defaultQuestionMix, speaking: 3, listening: 0 }
    } else if (template === 'Listening Booster') {
      preset.theme = 'Fast listening clues'
      preset.emotionalContext = 'You need to catch the key idea on the first try.'
      preset.practicalGoal = 'Aluno entende sinais rápidos, perguntas curtas e instruções.'
      preset.studentGoal = 'Movies'
      preset.pedagogicalMode = 'Listening Booster'
      preset.visualStyle = 'Modern Flat'
      preset.questionMix = { ...defaultQuestionMix, listening: 3, speaking: 0 }
    } else if (template === 'Daily Fast Lesson') {
      preset.theme = 'Daily sprint'
      preset.emotionalContext = 'You only have five focused minutes.'
      preset.practicalGoal = 'Aluno faz uma sessão curta e sai com sensação real de progresso.'
      preset.pedagogicalMode = 'Fast Daily Lesson'
      preset.visualStyle = 'Minimal'
      preset.quizCount = 2
      preset.questionsPerQuiz = 2
    }

    setAiComposer(preset)
  }

  const handleQuestionMixChange = (kind: DraftQuestionType, value: string) => {
    setAiComposer((current) => ({
      ...current,
      questionMix: {
        ...current.questionMix,
        [kind]: Math.max(0, Number(value) || 0),
      },
    }))
  }

  const handleAIControlSave = () =>
    runAdminTask(
      'Salvando AI Control Center...',
      'Configurações de IA salvas com sucesso.',
      async () => {
        await saveAIControlConfig({
          ...aiControl,
          apiKeyMasked: aiApiKeyInput.trim() ? maskApiKey(aiApiKeyInput) : aiControl.apiKeyMasked,
        })
        if (aiApiKeyInput.trim()) setAiApiKeyInput('')
      },
    )

  const handleMemorySave = () =>
    runAdminTask(
      'Salvando Memory Engine...',
      'Configuração do Memory Engine salva com sucesso.',
      async () => {
        await saveMemoryEngineConfig(memoryConfig)
      },
    )

  const handleTestConnection = async () => {
    setAiTestingConnection(true)
    const result = await testProviderConnection(aiControl.provider, aiApiKeyInput)
    setAiConnectionMessage(result.message)
    setAiTestingConnection(false)
    showToast(result.ok ? 'success' : 'error', result.message)
  }

  const handleGenerateAIDraft = async () => {
    setAiComposerLoading(true)
    try {
      const draft = buildDraftFromComposer(aiComposer, aiControl, {
        lessonIds: lessons.map((item) => item.id),
        quizIds: quizzes.map((item) => item.id),
        questionIds: questions.map((item) => item.id),
        existingDraftIds: aiDrafts.map((item) => item.id),
      })

      setAiPreviewDraft(draft)
      setAiComposerLoading(false)
      showToast('success', 'Draft gerado. Revise, regenere partes e salve manualmente.')
    } catch (error) {
      setAiComposerLoading(false)
      showToast('error', error instanceof Error ? error.message : 'Falha ao gerar o draft da missão.')
    }
  }

  const handleSaveAIDraft = () => {
    if (!aiPreviewDraft) {
      showToast('info', 'Gere um draft antes de salvar.')
      return
    }

    void runAdminTask(
      'Salvando draft de IA...',
      `Draft ${aiPreviewDraft.id} salvo no Firestore.`,
      async () => {
        await saveAIDraft(aiPreviewDraft)
        const refreshed = await getAIDrafts()
        setAiDrafts(refreshed)
        setAiSelectedDraftId(aiPreviewDraft.id)
      },
    )
  }

  const handleDraftStatus = (statusValue: 'approved' | 'rejected') => {
    if (!selectedDraft) {
      showToast('info', 'Selecione um draft para alterar o status.')
      return
    }

    void runAdminTask(
      `${statusValue === 'approved' ? 'Aprovando' : 'Rejeitando'} draft...`,
      `Draft ${selectedDraft.id} marcado como ${statusValue}.`,
      async () => {
        await updateAIDraftStatus(selectedDraft.id, statusValue)
        const refreshed = await getAIDrafts()
        setAiDrafts(refreshed)
      },
    )
  }

  const handlePublishDraft = () => {
    if (!selectedDraft) {
      showToast('info', 'Selecione um draft para publicar.')
      return
    }

    void runAdminTask(
      'Publicando draft no catálogo...',
      `Draft ${selectedDraft.id} publicado no catálogo real.`,
      async () => {
        await publishAIDraft(selectedDraft)
        await onRefresh()
        const refreshed = await getAIDrafts()
        setAiDrafts(refreshed)
      },
    )
  }

  const handleRegenerateDraftPart = (mode: PartialRegenerationMode, questionId?: string) => {
    if (!aiPreviewDraft) {
      showToast('info', 'Gere um draft antes de regenerar partes.')
      return
    }

    const updated = regenerateDraftPart(aiPreviewDraft, mode, questionId)
    setAiPreviewDraft(updated)
    showToast('success', 'Parte do draft regenerada para revisão manual.')
  }

  const renderDrawerContent = () => {
    if (!drawer.open) return null

    if (drawer.kind === 'lesson') {
      return (
        <>
          <div className="admin-drawer-head">
            <div>
              <span className="admin-drawer-kicker">{drawer.mode === 'create'  ? 'Nova lição' : 'Editar lição'}</span>
              <h3>{lessonDraft.title || 'Defina a trilha principal'}</h3>
              <p>ID automático: <strong>{displayId(lessonDraft.id || lessonIdPreview, 'lesson')}</strong></p>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}><X size={18} /></button>
          </div>

          <div className="admin-drawer-body">
            <div className="drawer-form">
              <label>Categoria
                <select value={lessonDraft.category} onChange={(event) => setLessonDraft((current) => ({ ...current, category: event.target.value }))}>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </label>
              <label>Título
                <input value={lessonDraft.title} onChange={(event) => setLessonDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>Blurb
                <textarea value={lessonDraft.blurb} onChange={(event) => setLessonDraft((current) => ({ ...current, blurb: event.target.value }))} />
              </label>
              <label>Tom
                <select value={lessonDraft.tone} onChange={(event) => setLessonDraft((current) => ({ ...current, tone: event.target.value as LessonTone }))}>
                  <option value="sky">sky</option>
                  <option value="violet">violet</option>
                  <option value="mint">mint</option>
                </select>
              </label>
            </div>
            <MediaPicker selected={lessonDraft.image} onPick={applyMediaAsset} onGenerateAi={openMediaAiModal} assets={mediaPickerAssets} />
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button className="admin-primary" type="button" disabled={saving || !lessonDraft.title} onClick={saveLesson}>
              <Save size={16} />
              {saving  ? 'Salvando...' : 'Salvar lição'}
            </button>
          </div>
        </>
      )
    }

    if (drawer.kind === 'quiz') {
      return (
        <>
          <div className="admin-drawer-head">
            <div>
              <span className="admin-drawer-kicker">{drawer.mode === 'create'  ? 'Novo quiz' : 'Editar quiz'}</span>
              <h3>{quizDraft.title || 'Estruture o bloco jogável'}</h3>
              <p>ID automático: <strong>{displayId(quizDraft.id || quizIdPreview, 'quiz')}</strong></p>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}><X size={18} /></button>
          </div>

          <div className="admin-drawer-body">
            <div className="drawer-form">
              <label>Lição vinculada
                <select value={quizDraft.lessonId} onChange={(event) => setQuizDraft((current) => ({ ...current, lessonId: event.target.value }))}>
                  <option value="">Selecione uma lição</option>
                  {sortedLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                </select>
              </label>
              <label>Título
                <input value={quizDraft.title} onChange={(event) => setQuizDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>Categoria
                <select value={quizDraft.tag} onChange={(event) => setQuizDraft((current) => ({ ...current, tag: event.target.value as QuizCatalogItem['tag'] }))}>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </label>
              <label>Tipo principal
                <select value={quizDraft.kind} onChange={(event) => setQuizDraft((current) => ({ ...current, kind: event.target.value as QuizCatalogItem['kind'] }))}>
                  {questionKinds.map((kind) => <option key={kind} value={kind}>{formatQuestionKind(kind)}</option>)}
                </select>
              </label>
              <label>Reward base
                <input type="number" value={quizDraft.reward} onChange={(event) => setQuizDraft((current) => ({ ...current, reward: Number(event.target.value) || 0 }))} />
              </label>
            </div>
            <MediaPicker selected={quizDraft.coverArt ?? null} onPick={(path) => setQuizDraft((current) => ({ ...current, coverArt: path }))} onGenerateAi={openMediaAiModal} assets={mediaPickerAssets} />
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button className="admin-primary" type="button" disabled={saving || !quizDraft.lessonId || !quizDraft.title} onClick={saveQuiz}>
              <Save size={16} />
              {saving  ? 'Salvando...' : 'Salvar quiz'}
            </button>
          </div>
        </>
      )
    }

    if (drawer.kind === 'question') {
      return (
        <>
          <div className="admin-drawer-head">
            <div>
              <span className="admin-drawer-kicker">{drawer.mode === 'create'  ? 'Nova questão' : 'Editar questão'}</span>
              <h3>{questionDraft.title || 'Construa o desafio jogável'}</h3>
              <p>ID automático: <strong>{displayId(questionDraft.id || questionIdPreview, 'question')}</strong></p>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}><X size={18} /></button>
          </div>

          <div className="admin-flow-strip">
            <span className={questionDraft.lessonId  ? 'is-complete' : ''}>1. Lição</span>
            <ChevronRight size={14} />
            <span className={questionDraft.quizId  ? 'is-complete' : ''}>2. Quiz</span>
            <ChevronRight size={14} />
            <span className={questionDraft.title  ? 'is-complete' : ''}>3. Questão</span>
          </div>

          <div className="admin-drawer-body admin-drawer-question">
            <div className="drawer-form">
              <label>Quiz vinculado
                <select value={questionDraft.quizId} onChange={(event) => setQuestionDraft((current) => ({ ...current, quizId: event.target.value }))}>
                  <option value="">Selecione um quiz</option>
                  {sortedQuizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>{quiz.title} • {quiz.lessonId}</option>
                  ))}
                </select>
              </label>
              <label>Lição vinculada
                <input value={currentQuestionLesson?.title ?? ''} readOnly placeholder="Será preenchida ao escolher o quiz" />
              </label>
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
              <label>Título
                <input value={questionDraft.title} onChange={(event) => setQuestionDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>Prompt
                <textarea value={questionDraft.prompt} onChange={(event) => setQuestionDraft((current) => ({ ...current, prompt: event.target.value }))} />
              </label>
              <label>Explicação
                <textarea value={questionDraft.explanation} onChange={(event) => setQuestionDraft((current) => ({ ...current, explanation: event.target.value }))} />
              </label>

              {questionDraft.kind === 'multiple-choice' && (
                <>
                  <label>Opções (uma por linha)
                    <textarea value={(questionDraft.options ?? []).join('\n')} onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))} />
                  </label>
                  <label>Resposta correta
                    <input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} />
                  </label>
                </>
              )}

              {questionDraft.kind === 'drag-fill' && (
                <>
                  <label>Texto antes
                    <input value={questionDraft.sentenceBefore ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, sentenceBefore: event.target.value }))} />
                  </label>
                  <label>Texto depois
                    <input value={questionDraft.sentenceAfter ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, sentenceAfter: event.target.value }))} />
                  </label>
                  <label>Opções (uma por linha)
                    <textarea value={(questionDraft.options ?? []).join('\n')} onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))} />
                  </label>
                  <label>Resposta correta
                    <input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} />
                  </label>
                </>
              )}

              {questionDraft.kind === 'ordering' && (
                <>
                  <label>Palavras embaralhadas (uma por linha)
                    <textarea value={(questionDraft.scrambled ?? []).join('\n')} onChange={(event) => setQuestionDraft((current) => ({ ...current, scrambled: event.target.value.split('\n').filter(Boolean) }))} />
                  </label>
                  <label>Solução (uma por linha)
                    <textarea value={(questionDraft.solution ?? []).join('\n')} onChange={(event) => setQuestionDraft((current) => ({ ...current, solution: event.target.value.split('\n').filter(Boolean) }))} />
                  </label>
                </>
              )}
              {questionDraft.kind === 'listening' && (
                <>
                  <label>Opções (uma por linha)
                    <textarea value={(questionDraft.options ?? []).join('\n')} onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))} />
                  </label>
                  <label>Resposta correta
                    <input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} />
                  </label>
                </>
              )}

              {questionDraft.kind === 'speaking' && (
                <label>Guia de fala
                  <textarea value={questionDraft.explanation} onChange={(event) => setQuestionDraft((current) => ({ ...current, explanation: event.target.value }))} />
                </label>
              )}
            </div>

            <div className="question-preview-card">
              <div className="question-preview-head">
                <span><Gem size={14} /> {questionDraft.tag}</span>
                <span><WandSparkles size={14} /> {formatQuestionKind(questionDraft.kind)}</span>
                {currentQuestionQuiz && <span><Gamepad2 size={14} /> {currentQuestionQuiz.title}</span>}
              </div>
              <strong>{questionDraft.title || 'Prévia do desafio'}</strong>
              <p>{questionDraft.prompt || 'Monte a questão visualmente e veja como ela vai aparecer na home.'}</p>
              <QuestionPreviewStage draft={questionDraft} fallbackText={questionPreview} />
              <MediaPicker selected={questionDraft.art} onPick={applyMediaAsset} compact onGenerateAi={openMediaAiModal} assets={mediaPickerAssets} />
            </div>
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button className="admin-primary" type="button" disabled={saving || !questionDraft.quizId || !questionDraft.title} onClick={saveQuestion}>
              <Save size={16} />
              {saving  ? 'Salvando...' : 'Salvar questão'}
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="admin-drawer-head">
          <div>
            <span className="admin-drawer-kicker">{drawer.mode === 'create'  ? 'Nova conquista' : 'Editar conquista'}</span>
            <h3>{achievementDraft.title || 'Defina uma recompensa'}</h3>
            <p>ID automático: <strong>{displayId(achievementDraft.id || achievementIdPreview, 'achievement')}</strong></p>
          </div>
          <button type="button" className="drawer-close" onClick={closeDrawer}><X size={18} /></button>
        </div>

        <div className="admin-drawer-body">
          <div className="drawer-form">
            <label>Título
              <input value={achievementDraft.title} onChange={(event) => setAchievementDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>Descrição
              <textarea value={achievementDraft.description} onChange={(event) => setAchievementDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>XP reward
              <input type="number" value={achievementDraft.xpReward} onChange={(event) => setAchievementDraft((current) => ({ ...current, xpReward: Number(event.target.value) || 0 }))} />
            </label>
          </div>
        </div>

        <div className="admin-drawer-footer">
          <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
          <button className="admin-primary" type="button" disabled={saving || !achievementDraft.title} onClick={saveAchievementItem}>
            <Save size={16} />
            {saving  ? 'Salvando...' : 'Salvar conquista'}
          </button>
        </div>
      </>
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
                className={`cms-nav-item${activeSection === item.key  ? ' is-active' : ''}`}
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
                  <h2>Ações rápidas</h2>
                  <p className="admin-helper">Use o catálogo base, ajuste o hero e entre direto nas áreas de criação.</p>
                </div>
              </div>
              <div className="cms-quick-grid">
                <button className="cms-quick-card" type="button" onClick={() => setActiveSection('ai-control')}>
                  <BrainCircuit size={18} />
                  <strong>AI Control Center</strong>
                  <span>Providers, drafts, templates e guardrails pedagógicos.</span>
                </button>
                <button className="cms-quick-card" type="button" onClick={() => setActiveSection('lessons')}>
                  <BookOpen size={18} />
                  <strong>Nova lição</strong>
                  <span>Abra o editor e monte a trilha principal.</span>
                </button>
                <button className="cms-quick-card" type="button" onClick={() => setActiveSection('quizzes')}>
                  <Gamepad2 size={18} />
                  <strong>Novo quiz</strong>
                  <span>Estruture blocos jogáveis por lição.</span>
                </button>
                <button className="cms-quick-card" type="button" onClick={() => setActiveSection('questions')}>
                  <WandSparkles size={18} />
                  <strong>Questões</strong>
                  <span>Encontre, edite e duplique desafios rapidamente.</span>
                </button>
                <button className="cms-quick-card" type="button" onClick={() => setActiveSection('settings')}>
                  <Settings size={18} />
                  <strong>Configurações</strong>
                  <span>Atualize o runtime e o hero sem deploy.</span>
                </button>
              </div>
            </section>
          </section>
        )}

        {activeSection === 'ai-control' && (
          <section className="cms-panel-stack">
            <section className="cms-summary-grid">
              <article className="cms-stat-card">
                <span>Provider ativo</span>
                <strong>{aiControl.provider}</strong>
                <small>{aiControl.primaryModel}</small>
              </article>
              <article className="cms-stat-card">
                <span>Drafts IA</span>
                <strong>{aiObservability.total}</strong>
                <small>{aiObservability.published} publicados</small>
              </article>
              <article className="cms-stat-card">
                <span>Aprovação</span>
                <strong>{aiObservability.approvalRate}%</strong>
                <small>{aiObservability.rejected} rejeitados</small>
              </article>
              <article className="cms-stat-card">
                <span>Custo médio</span>
                <strong>${aiObservability.avgCost}</strong>
                <small>estimado por draft</small>
              </article>
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>AI Control Center</h2>
                  <p className="admin-helper">Provider, fallback, guardrails, limites e comportamento pedagógico do copiloto Spark.</p>
                </div>
                <div className="cms-header-pill">
                  <ShieldCheck size={16} />
                  Aprovação manual obrigatória
                </div>
              </div>

              <div className="cms-ai-grid">
                <article className="cms-ai-card">
                  <div className="cms-ai-card-head">
                    <strong><Bot size={16} /> Provider e modelos</strong>
                    <span>OpenRouter recomendado como padrão.</span>
                  </div>
                  <div className="drawer-form">
                    <label>Provider
                      <select value={aiControl.provider} onChange={(event) => setAiControl((current) => ({ ...current, provider: event.target.value as AIProvider }))}>
                        <option value="openrouter">OpenRouter</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                      </select>
                    </label>
                    <label>Chave da API (uso da sessão)
                      <input
                        type="password"
                        value={aiApiKeyInput}
                        placeholder={aiControl.apiKeyMasked || 'Cole a chave para testar'}
                        onChange={(event) => setAiApiKeyInput(event.target.value)}
                      />
                    </label>
                    <label>Referência segura
                      <input
                        value={aiControl.apiKeyReference}
                        onChange={(event) => setAiControl((current) => ({ ...current, apiKeyReference: event.target.value }))}
                        placeholder="OPENROUTER_API_KEY"
                      />
                    </label>
                    <div className="cms-inline-actions">
                      <button className="admin-secondary" type="button" disabled={aiTestingConnection} onClick={handleTestConnection}>
                        <RefreshCw size={14} />
                        {aiTestingConnection ? 'Testando...' : 'Testar conexão'}
                      </button>
                      <span className="cms-inline-helper">{aiConnectionMessage || 'A chave real fica fora do Firestore; aqui fica só a referência mascarada.'}</span>
                    </div>
                    <label>Modelo principal
                      <select value={aiControl.primaryModel} onChange={(event) => setAiControl((current) => ({ ...current, primaryModel: event.target.value as AIControlConfig['primaryModel'] }))}>
                        {providerModels[aiControl.provider].map((model) => <option key={model} value={model}>{model}</option>)}
                      </select>
                    </label>
                    <label>Modelo fallback
                      <select value={aiControl.fallbackModel} onChange={(event) => setAiControl((current) => ({ ...current, fallbackModel: event.target.value as AIControlConfig['fallbackModel'] }))}>
                        {providerModels[aiControl.provider].map((model) => <option key={model} value={model}>{model}</option>)}
                      </select>
                    </label>
                    <label>Temperatura
                      <input type="range" min="0" max="1" step="0.05" value={aiControl.temperature} onChange={(event) => setAiControl((current) => ({ ...current, temperature: Number(event.target.value) }))} />
                    </label>
                    <label>Modo pedagógico
                      <select value={aiControl.pedagogicalMode} onChange={(event) => setAiControl((current) => ({ ...current, pedagogicalMode: event.target.value as AIControlConfig['pedagogicalMode'] }))}>
                        {pedagogicalModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                      </select>
                    </label>
                    <div className="cms-mini-grid">
                      <label>Máx. quizzes
                        <input type="number" value={aiControl.limits.maxQuizzes} onChange={(event) => setAiControl((current) => ({ ...current, limits: { ...current.limits, maxQuizzes: Number(event.target.value) || 1 } }))} />
                      </label>
                      <label>Máx. questões
                        <input type="number" value={aiControl.limits.maxQuestions} onChange={(event) => setAiControl((current) => ({ ...current, limits: { ...current.limits, maxQuestions: Number(event.target.value) || 1 } }))} />
                      </label>
                      <label>Limite diário
                        <input type="number" value={aiControl.limits.dailyDrafts} onChange={(event) => setAiControl((current) => ({ ...current, limits: { ...current.limits, dailyDrafts: Number(event.target.value) || 1 } }))} />
                      </label>
                      <label>Orçamento tokens
                        <input type="number" value={aiControl.limits.tokenBudget} onChange={(event) => setAiControl((current) => ({ ...current, limits: { ...current.limits, tokenBudget: Number(event.target.value) || 0 } }))} />
                      </label>
                    </div>
                  </div>
                  <div className="cms-inline-actions">
                    <button className="admin-primary" type="button" disabled={saving} onClick={handleAIControlSave}>
                      <Save size={16} />
                      {saving ? 'Salvando...' : 'Salvar AI Control'}
                    </button>
                  </div>
                </article>

                <article className="cms-ai-card">
                  <div className="cms-ai-card-head">
                    <strong><SlidersHorizontal size={16} /> Guardrails + observabilidade</strong>
                    <span>Limites, naturalidade e o que a IA pode ou não publicar.</span>
                  </div>
                  <div className="drawer-form">
                    <div className="cms-mini-grid">
                      <label>Dificuldade máxima
                        <select value={aiControl.guardrails.difficultyCeiling} onChange={(event) => setAiControl((current) => ({ ...current, guardrails: { ...current.guardrails, difficultyCeiling: event.target.value as AIControlConfig['guardrails']['difficultyCeiling'] } }))}>
                          <option value="beginner">beginner</option>
                          <option value="intermediate">intermediate</option>
                          <option value="advanced">advanced</option>
                        </select>
                      </label>
                      <label>Naturalidade
                        <select value={aiControl.guardrails.naturalness} onChange={(event) => setAiControl((current) => ({ ...current, guardrails: { ...current.guardrails, naturalness: event.target.value as AIControlConfig['guardrails']['naturalness'] } }))}>
                          <option value="guided">guided</option>
                          <option value="balanced">balanced</option>
                          <option value="native">native</option>
                        </select>
                      </label>
                      <label>Máx. palavras por frase
                        <input type="number" value={aiControl.guardrails.maxSentenceWords} onChange={(event) => setAiControl((current) => ({ ...current, guardrails: { ...current.guardrails, maxSentenceWords: Number(event.target.value) || 0 } }))} />
                      </label>
                      <label>Vocabulário por missão
                        <input type="number" value={aiControl.guardrails.maxVocabularyWindow} onChange={(event) => setAiControl((current) => ({ ...current, guardrails: { ...current.guardrails, maxVocabularyWindow: Number(event.target.value) || 0 } }))} />
                      </label>
                      <label>Repetição máxima
                        <input type="number" value={aiControl.guardrails.repetitionLimit} onChange={(event) => setAiControl((current) => ({ ...current, guardrails: { ...current.guardrails, repetitionLimit: Number(event.target.value) || 0 } }))} />
                      </label>
                      <label>Frequência de speaking
                        <input type="number" value={aiControl.guardrails.speakingFrequency} onChange={(event) => setAiControl((current) => ({ ...current, guardrails: { ...current.guardrails, speakingFrequency: Number(event.target.value) || 0 } }))} />
                      </label>
                      <label>Frequência de listening
                        <input type="number" value={aiControl.guardrails.listeningFrequency} onChange={(event) => setAiControl((current) => ({ ...current, guardrails: { ...current.guardrails, listeningFrequency: Number(event.target.value) || 0 } }))} />
                      </label>
                    </div>
                    <div className="cms-ai-observability">
                      <article className="cms-ob-card"><Gauge size={16} /><div><strong>{aiObservability.approvalRate}%</strong><span>taxa de aprovação</span></div></article>
                      <article className="cms-ob-card"><Clock3 size={16} /><div><strong>{aiObservability.total}</strong><span>drafts registrados</span></div></article>
                      <article className="cms-ob-card"><Gem size={16} /><div><strong>${aiObservability.avgCost}</strong><span>custo médio estimado</span></div></article>
                    </div>
                  </div>
                </article>
              </div>

              <div className="cms-ai-grid">
                <article className="cms-ai-card">
                  <div className="cms-ai-card-head">
                    <strong><BookOpen size={16} /> Memory Engine</strong>
                    <span>Estrutura preparada para palavras vistas, erros recorrentes e habilidades fracas.</span>
                  </div>
                  <div className="drawer-form">
                    <label className="cms-toggle-row"><input type="checkbox" checked={memoryConfig.trackLearnedWords} onChange={(event) => setMemoryConfig((current) => ({ ...current, trackLearnedWords: event.target.checked }))} />Rastrear palavras ensinadas</label>
                    <label className="cms-toggle-row"><input type="checkbox" checked={memoryConfig.trackFrequentErrors} onChange={(event) => setMemoryConfig((current) => ({ ...current, trackFrequentErrors: event.target.checked }))} />Rastrear erros frequentes</label>
                    <label className="cms-toggle-row"><input type="checkbox" checked={memoryConfig.trackWeakSkills} onChange={(event) => setMemoryConfig((current) => ({ ...current, trackWeakSkills: event.target.checked }))} />Rastrear habilidades fracas</label>
                    <label className="cms-toggle-row"><input type="checkbox" checked={memoryConfig.trackFavoriteModes} onChange={(event) => setMemoryConfig((current) => ({ ...current, trackFavoriteModes: event.target.checked }))} />Rastrear modos favoritos</label>
                    <label>Janela de memória (dias)
                      <input type="number" value={memoryConfig.historyDepthDays} onChange={(event) => setMemoryConfig((current) => ({ ...current, historyDepthDays: Number(event.target.value) || 7 }))} />
                    </label>
                    <label>Notas operacionais
                      <textarea value={memoryConfig.notes} onChange={(event) => setMemoryConfig((current) => ({ ...current, notes: event.target.value }))} />
                    </label>
                  </div>
                  <div className="cms-inline-actions">
                    <button className="admin-primary" type="button" disabled={saving} onClick={handleMemorySave}>
                      <Save size={16} />
                      {saving ? 'Salvando...' : 'Salvar Memory Engine'}
                    </button>
                  </div>
                </article>

                <article className="cms-ai-card">
                  <div className="cms-ai-card-head">
                    <strong><Sparkles size={16} /> Templates inteligentes</strong>
                    <span>Presets rápidos para a IA decidir o restante com contexto e guardrails.</span>
                  </div>
                  <div className="cms-template-grid">
                    {missionTemplateOptions.map((template) => (
                      <button
                        key={template}
                        type="button"
                        className={`cms-template-card${aiComposer.template === template ? ' is-active' : ''}`}
                        onClick={() => applyTemplatePreset(template)}
                      >
                        <strong>{template}</strong>
                        <span>{templateDefaultsForLabel(template)}</span>
                      </button>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>✨ Criar Missão com Spark AI</h2>
                  <p className="admin-helper">A IA gera uma experiência inteira: contexto, progressão, quizzes e questões. Nada vai ao banco sem revisão e aprovação humana.</p>
                </div>
                <div className="cms-header-pill">
                  <Eye size={16} />
                  Preview antes de publicar
                </div>
              </div>

              <div className="cms-composer-grid">
                <article className="cms-ai-card">
                  <div className="drawer-form">
                    <label>Tema
                      <input value={aiComposer.theme} onChange={(event) => setAiComposer((current) => ({ ...current, theme: event.target.value }))} />
                    </label>
                    <label>Contexto emocional
                      <textarea value={aiComposer.emotionalContext} onChange={(event) => setAiComposer((current) => ({ ...current, emotionalContext: event.target.value }))} />
                    </label>
                    <label>Objetivo prático
                      <textarea value={aiComposer.practicalGoal} onChange={(event) => setAiComposer((current) => ({ ...current, practicalGoal: event.target.value }))} />
                    </label>
                    <div className="cms-mini-grid">
                      <label>Nível
                        <select value={aiComposer.level} onChange={(event) => setAiComposer((current) => ({ ...current, level: event.target.value as LessonComposerInput['level'] }))}>
                          {missionLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                      </label>
                      <label>Objetivo do aluno
                        <select value={aiComposer.studentGoal} onChange={(event) => setAiComposer((current) => ({ ...current, studentGoal: event.target.value as StudentGoal }))}>
                          {studentGoalOptions.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
                        </select>
                      </label>
                      <label>Estilo visual
                        <select value={aiComposer.visualStyle} onChange={(event) => setAiComposer((current) => ({ ...current, visualStyle: event.target.value as VisualStyle }))}>
                          {visualStyleOptions.map((style) => <option key={style} value={style}>{style}</option>)}
                        </select>
                      </label>
                      <label>Modo pedagógico
                        <select value={aiComposer.pedagogicalMode} onChange={(event) => setAiComposer((current) => ({ ...current, pedagogicalMode: event.target.value as LessonComposerInput['pedagogicalMode'] }))}>
                          {pedagogicalModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                        </select>
                      </label>
                      <label>Quizzes
                        <input type="number" value={aiComposer.quizCount} onChange={(event) => setAiComposer((current) => ({ ...current, quizCount: Number(event.target.value) || 1 }))} />
                      </label>
                      <label>Questões por quiz
                        <input type="number" value={aiComposer.questionsPerQuiz} onChange={(event) => setAiComposer((current) => ({ ...current, questionsPerQuiz: Number(event.target.value) || 1 }))} />
                      </label>
                    </div>
                    <div className="cms-composer-mix">
                      {draftQuestionTypeOptions.map((type) => (
                        <label key={type}>
                          <span>{formatDraftType(type)}</span>
                          <input type="number" min="0" value={aiComposer.questionMix[type]} onChange={(event) => handleQuestionMixChange(type, event.target.value)} />
                        </label>
                      ))}
                    </div>
                    <p className="cms-inline-helper">
                      Mix atual: {composerQuestionTotal} desafios distribuídos em {aiComposer.quizCount} quiz{aiComposer.quizCount > 1 ? 'zes' : ''}.
                    </p>
                  </div>
                  <div className="cms-inline-actions">
                    <button className="admin-secondary" type="button" onClick={() => setAiComposer(aiComposerDefaults)}>
                      Reiniciar preset
                    </button>
                    <button className="admin-primary" type="button" disabled={aiComposerLoading} onClick={handleGenerateAIDraft}>
                      <Sparkles size={16} />
                      {aiComposerLoading ? 'Gerando missão...' : 'Gerar experiência'}
                    </button>
                  </div>
                </article>

                <article className="cms-ai-card">
                  <div className="cms-ai-card-head">
                    <strong><Eye size={16} /> Preview da missão</strong>
                    <span>Revise, regenere partes e só então aprove ou publique.</span>
                  </div>
                  {aiPreviewDraft ? (
                    <div className="cms-draft-preview">
                      <div className="cms-draft-hero">
                        <div>
                          <span className="admin-kicker">{aiPreviewDraft.template}</span>
                          <h3>{aiPreviewDraft.title}</h3>
                          <p>{aiPreviewDraft.practicalGoal}</p>
                        </div>
                        <div className="cms-draft-stats">
                          <span>{aiPreviewDraft.quizzes.length} quizzes</span>
                          <span>{aiPreviewDraft.questions.length} questões</span>
                          <span>{aiPreviewDraft.xpTotal} XP</span>
                        </div>
                      </div>
                      <div className="cms-draft-cover">
                        <strong>Prompt de capa</strong>
                        <p>{aiPreviewDraft.coverPrompt}</p>
                        <button className="admin-secondary" type="button" onClick={() => handleRegenerateDraftPart('cover')}>
                          <RefreshCw size={14} />
                          Regenerar capa
                        </button>
                      </div>
                      <div className="cms-draft-quiz-list">
                        {aiPreviewDraft.quizzes.map((quiz) => (
                          <article key={quiz.id} className="cms-draft-quiz">
                            <header>
                              <strong>{quiz.title}</strong>
                              <span>{quiz.kind} • {quiz.reward} XP</span>
                            </header>
                            <div className="cms-draft-question-list">
                              {aiPreviewDraft.questions.filter((item) => item.quizId === quiz.id).map((question) => (
                                <div key={question.id} className="cms-draft-question">
                                  <div>
                                    <strong>{question.title}</strong>
                                    <p>{question.prompt}</p>
                                  </div>
                                  <div className="cms-row-actions">
                                    <button type="button" onClick={() => handleRegenerateDraftPart('question', question.id)}><RefreshCw size={14} />Questão</button>
                                    {(question.kind === 'multiple-choice' || question.kind === 'drag-fill' || question.kind === 'listening') && (
                                      <button type="button" onClick={() => handleRegenerateDraftPart('alternatives', question.id)}><Copy size={14} />Alternativas</button>
                                    )}
                                    {question.kind === 'speaking' && (
                                      <button type="button" onClick={() => handleRegenerateDraftPart('speaking', question.id)}><Mic size={14} />Speaking</button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                      <div className="cms-inline-actions">
                        <button className="admin-secondary" type="button" onClick={() => setAiPreviewDraft(null)}>Fechar preview</button>
                        <button className="admin-primary" type="button" onClick={handleSaveAIDraft}>
                          <Save size={16} />
                          Salvar draft
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="cms-empty-panel cms-empty-panel-inline">
                      <Sparkles size={26} />
                      <h2>Sem draft ativo</h2>
                      <p>Escolha um template, ajuste o contexto e gere uma missão completa para revisar aqui.</p>
                    </div>
                  )}
                </article>
              </div>
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Fila de drafts e aprovação</h2>
                  <p className="admin-helper">A IA nunca publica direto. O operador revisa, aprova, edita e só então envia ao catálogo real.</p>
                </div>
              </div>

              <div className="cms-ai-drafts-grid">
                <div className="cms-draft-list">
                  {aiDrafts.length ? aiDrafts.map((draft) => (
                    <button
                      key={draft.id}
                      type="button"
                      className={`cms-draft-list-item${aiSelectedDraftId === draft.id ? ' is-active' : ''}`}
                      onClick={() => setAiSelectedDraftId(draft.id)}
                    >
                      <div>
                        <strong>{draft.title}</strong>
                        <span>{draft.id} • {draft.status}</span>
                      </div>
                      <small>{draft.quizzes.length} quizzes • {draft.questions.length} questões</small>
                    </button>
                  )) : (
                    <div className="cms-empty-panel cms-empty-panel-inline">
                      <Clock3 size={22} />
                      <h2>Nenhum draft salvo</h2>
                      <p>Quando você salvar uma experiência gerada, ela aparecerá aqui para aprovação e publicação.</p>
                    </div>
                  )}
                </div>

                <article className="cms-ai-card">
                  {selectedDraft ? (
                    <>
                      <div className="cms-ai-card-head">
                        <strong><BrainCircuit size={16} /> {selectedDraft.title}</strong>
                        <span>{selectedDraft.id} • {selectedDraft.status}</span>
                      </div>
                      <div className="cms-draft-hero">
                        <div>
                          <span className="admin-kicker">{selectedDraft.template}</span>
                          <h3>{selectedDraft.lesson.title}</h3>
                          <p>{selectedDraft.emotionalContext}</p>
                        </div>
                        <div className="cms-draft-stats">
                          <span>{selectedDraft.provider}</span>
                          <span>{selectedDraft.model}</span>
                          <span>${selectedDraft.estimatedCostUsd.toFixed(3)}</span>
                        </div>
                      </div>
                      <div className="cms-draft-meta-grid">
                        <div><strong>Objetivo</strong><span>{selectedDraft.practicalGoal}</span></div>
                        <div><strong>Habilidades</strong><span>{selectedDraft.skills.join(' • ')}</span></div>
                        <div><strong>XP total</strong><span>{selectedDraft.xpTotal}</span></div>
                        <div><strong>Status</strong><span>{selectedDraft.status}</span></div>
                      </div>
                      <div className="cms-inline-actions">
                        <button className="admin-secondary" type="button" onClick={() => handleDraftStatus('approved')}>Aprovar</button>
                        <button className="admin-secondary" type="button" onClick={() => handleDraftStatus('rejected')}>Rejeitar</button>
                        <button className="admin-primary" type="button" onClick={handlePublishDraft}>
                          <Sparkles size={16} />
                          Publicar no catálogo
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="cms-empty-panel cms-empty-panel-inline">
                      <BrainCircuit size={24} />
                      <h2>Selecione um draft</h2>
                      <p>Abra um item da fila para ver narrativa, missão, quizzes, XP e estágio de publicação.</p>
                    </div>
                  )}
                </article>
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
                  <p className="admin-helper">A lição é o primeiro nível da hierarquia. Ela contém vários quizzes.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={() => openLessonEditor()}>
                  <Plus size={16} />
                  Nova lição
                </button>
              </div>
              <div className="cms-filter-row cms-filter-row-lessons">
                <label className="cms-search">
                  <Search size={16} />
                  <input value={lessonSearch} onChange={(event) => setLessonSearch(event.target.value)} placeholder="Buscar por ID, título ou categoria" />
                </label>
                <select value={lessonFilterTag} onChange={(event) => setLessonFilterTag(event.target.value as FilterKey | 'Todos')}>
                  <option value="Todos">Todas as categorias</option>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>
              <div className="cms-card-list">
                {filteredLessons.map((lesson) => (
                  <article key={lesson.id} className="cms-content-card">
                    <img src={lesson.image} alt={lesson.title} />
                    <div className="cms-content-copy">
                      <strong>{lesson.title}</strong>
                      <span>{displayId(lesson.id, 'lesson')} • {lesson.category}</span>
                      <p>{lesson.blurb}</p>
                    </div>
                    <div className="cms-content-actions">
                      <button type="button" onClick={() => openLessonEditor(lesson)}><Pencil size={14} />Editar</button>
                      <button type="button" className="danger" onClick={() => removeCatalogItem(lesson.title, () => deleteLesson(lesson.id))}><Trash2 size={14} />Excluir</button>
                    </div>
                  </article>
                ))}
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
                  <p className="admin-helper">Cada quiz pertence a uma lição e agrupa um tipo principal de desafio.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={() => openQuizEditor()}>
                  <Plus size={16} />
                  Novo quiz
                </button>
              </div>
              <div className="cms-filter-row cms-filter-row-quizzes">
                <label className="cms-search">
                  <Search size={16} />
                  <input value={quizSearch} onChange={(event) => setQuizSearch(event.target.value)} placeholder="Buscar por ID, título, lição ou categoria" />
                </label>
                <select value={quizFilterTag} onChange={(event) => setQuizFilterTag(event.target.value as FilterKey | 'Todos')}>
                  <option value="Todos">Todas as categorias</option>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select value={quizFilterStatus} onChange={(event) => setQuizFilterStatus(event.target.value as StatusFilter)}>
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Pausados</option>
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
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuizzes.map((quiz) => (
                      <tr key={quiz.id}>
                        <td>{displayId(quiz.id, 'quiz')}</td>
                        <td>{lessons.find((lesson) => lesson.id === quiz.lessonId)?.title ?? displayId(quiz.lessonId, 'lesson')}</td>
                        <td>{quiz.title}</td>
                        <td>{quiz.tag}</td>
                        <td>{formatQuestionKind(quiz.kind)}</td>
                        <td>{quiz.reward}</td>
                        <td className="cms-row-actions">
                          <button type="button" onClick={() => openQuizEditor(quiz)}><Pencil size={14} />Editar</button>
                          <button type="button" className="danger" onClick={() => removeCatalogItem(quiz.title, () => deleteQuiz(quiz.id))}><Trash2 size={14} />Excluir</button>
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
                  <p className="admin-helper">Tabela compacta, busca e filtros. Edite em drawer lateral, não em formulário gigante inline.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={() => openQuestionEditor()}>
                  <Plus size={16} />
                  Nova questão
                </button>
              </div>

              <div className="cms-filter-row">
                <label className="cms-search">
                  <Search size={16} />
                  <input value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} placeholder="Buscar por ID, título, quiz ou lição" />
                </label>
                <select value={filterTag} onChange={(event) => setFilterTag(event.target.value as FilterKey | 'Todos')}>
                  <option value="Todos">Todas as categorias</option>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select value={filterKind} onChange={(event) => setFilterKind(event.target.value as QuizQuestionItem['kind'] | 'all')}>
                  <option value="all">Todos os tipos</option>
                  {questionKinds.map((kind) => <option key={kind} value={kind}>{formatQuestionKind(kind)}</option>)}
                </select>
                <select value={filterQuizId} onChange={(event) => setFilterQuizId(event.target.value)}>
                  <option value="all">Todos os quizzes</option>
                  {sortedQuizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
                </select>
                <select value={questionStatus} onChange={(event) => setQuestionStatus(event.target.value as StatusFilter)}>
                  <option value="all">Todos os status</option>
                  <option value="active">Ativas</option>
                  <option value="inactive">Pausadas</option>
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
                        <td>{displayId(question.id, 'question')}</td>
                        <td>{formatQuestionKind(question.kind)}</td>
                        <td>{question.tag}</td>
                        <td>
                          <strong>{question.title}</strong>
                          <small>{question.quizId}</small>
                        </td>
                        <td>{question.reward}</td>
                        <td>{question.active  ? 'Ativa' : 'Pausada'}</td>
                        <td className="cms-row-actions">
                          <button type="button" onClick={() => openQuestionEditor(question)}><Pencil size={14} />Editar</button>
                          <button type="button" onClick={() => duplicateQuestion(question)}><Copy size={14} />Duplicar</button>
                          <button type="button" className="danger" onClick={() => removeCatalogItem(question.title, () => deleteQuizQuestion(question.id))}><Trash2 size={14} />Excluir</button>
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
                  <p className="admin-helper">Recompensas emocionais ligadas ao ritmo de estudo.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={() => openAchievementEditor()}>
                  <Plus size={16} />
                  Nova conquista
                </button>
              </div>
              <div className="cms-filter-row cms-filter-row-achievements">
                <label className="cms-search">
                  <Search size={16} />
                  <input value={achievementSearch} onChange={(event) => setAchievementSearch(event.target.value)} placeholder="Buscar por ID, título ou descrição" />
                </label>
              </div>
              <div className="cms-card-list">
                {filteredAchievements.map((achievement) => (
                  <article key={achievement.id} className="cms-content-card cms-content-card-simple">
                    <div className="cms-content-copy">
                      <strong>{achievement.title}</strong>
                      <span>{displayId(achievement.id, 'achievement')} • {achievement.xpReward} XP</span>
                      <p>{achievement.description}</p>
                    </div>
                    <div className="cms-content-actions">
                      <button type="button" onClick={() => openAchievementEditor(achievement)}><Pencil size={14} />Editar</button>
                      <button type="button" className="danger" onClick={() => removeCatalogItem(achievement.title, () => deleteAchievement(achievement.id))}><Trash2 size={14} />Excluir</button>
                    </div>
                  </article>
                ))}
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
                  <p className="admin-helper">Escolha assets visuais por preview, sem digitar caminhos manuais.</p>
                </div>
                <button className="admin-primary cms-inline-button" type="button" onClick={openMediaAiModal}>
                  <Sparkles size={16} />
                  Gerar mídia com IA
                </button>
              </div>
              <MediaPicker selected={null} onPick={applyMediaAsset} assets={mediaPickerAssets} />
            </section>
          </section>
        )}

        {(activeSection === 'users' || activeSection === 'analytics') && (
          <section className="cms-panel-stack">
            <section className="cms-panel cms-empty-panel">
              {activeSection === 'users'  ? <Users size={28} /> : <BarChart3 size={28} />}
              <h2>{activeSection === 'users'  ? 'Usuários' : 'Analytics'}</h2>
              <p>
                Esta área já existe estruturalmente no CMS. O próximo passo é ligar listagem real de usuários, sessões, streak e retenção via Firestore e Functions.
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
                  <p className="admin-helper">Ajuste o runtime da home e popule o catálogo base sem mexer no código.</p>
                </div>
              </div>

              <div className="cms-settings-grid">
                <article className="cms-settings-callout">
                  <strong>Popular catálogo base</strong>
                  <p>Cria lições, quizzes, questões e conquistas iniciais no Firestore para destravar a operação do CMS.</p>
                  <button
                    className="admin-primary"
                    disabled={saving}
                    onClick={() => runAdminTask('Criando catálogo base...', 'Catálogo base populado no Firestore.', () => seedDefaultCatalog())}
                    type="button"
                  >
                    <Sparkles size={16} />
                    {saving  ? 'Processando...' : 'Popular catálogo base'}
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
                  <button
                    className="admin-primary"
                    disabled={saving}
                    onClick={() => runAdminTask('Atualizando runtime...', 'Runtime da plataforma salvo.', () => savePlatformConfig(platformDraft))}
                    type="button"
                  >
                    <Save size={16} />
                    {saving  ? 'Salvando...' : 'Salvar plataforma'}
                  </button>
                </article>
              </div>
            </section>
          </section>
        )}

        <p className="admin-status">{status}</p>
        {toast && (
          <div className={`admin-toast admin-toast-${toast.tone}`}>
            {toast.tone === 'success'  ? <CheckCircle2 size={18} /> : toast.tone === 'error'  ? <AlertCircle size={18} /> : <Sparkles size={18} />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>

      {drawer.open && (
        <div className="admin-drawer-backdrop" onClick={closeDrawer}>
          <aside className={`admin-drawer${drawer.open && drawer.kind === 'question' ? ' is-question' : ' is-simple'}`} onClick={(event) => event.stopPropagation()}>
            {renderDrawerContent()}
          </aside>
        </div>
      )}

      {mediaAiOpen && (
        <div className="admin-modal-backdrop" onClick={() => setMediaAiOpen(false)}>
          <section className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <span className="admin-drawer-kicker">✨ Gerar mídia com IA</span>
                <h3>Gerar imagem contextual</h3>
                <p>Gere imagens reais com Pollinations, registre no Firestore e aplique o asset diretamente no conteúdo atual.</p>
              </div>
              <button type="button" className="drawer-close" onClick={() => setMediaAiOpen(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="drawer-form">
                <label>Escopo
                  <select value={mediaAiTarget} onChange={(event) => { setMediaAiTarget(event.target.value as MediaAiScope); setMediaAiTargetId(''); setMediaAiGenerated([]); setMediaAiSelectedId('') }}>
                    <option value="lesson">Lição</option>
                    <option value="quiz">Quiz</option>
                    <option value="question">Questão</option>
                  </select>
                </label>
                <label>Alvo
                  <select value={mediaAiTargetId} onChange={(event) => { setMediaAiTargetId(event.target.value); setMediaAiGenerated([]); setMediaAiSelectedId('') }}>
                    <option value="">Selecione um item</option>
                    {mediaTargetOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </label>
                <label>Estilo
                  <div className="media-style-row">
                    {(['cartoon', '3D', 'pastel', 'kawaii', 'cinematic'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        className={`media-style-chip${mediaAiStyle === style ? ' is-active' : ''}`}
                        onClick={() => setMediaAiStyle(style)}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </label>
                <label>Prompt sugerido
                  <textarea value={mediaPrompt} readOnly />
                </label>
                <div className="media-ai-context">
                  <strong>Contexto detectado</strong>
                  <div className="media-ai-context-row">
                    <span>{mediaAiTarget === 'lesson' ? 'Lição visual' : mediaAiTarget === 'quiz' ? 'Quiz jogável' : 'Questão'}</span>
                    {selectedMediaLesson?.category && <span>{selectedMediaLesson.category}</span>}
                    {selectedMediaQuiz?.tag && <span>{selectedMediaQuiz.tag}</span>}
                    {selectedMediaQuestion?.tag && <span>{selectedMediaQuestion.tag}</span>}
                    {(selectedMediaQuestion?.kind || selectedMediaQuiz?.kind) && (
                      <span>{formatQuestionKind(selectedMediaQuestion?.kind ?? selectedMediaQuiz?.kind ?? 'multiple-choice')}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="media-ai-preview-panel">
                <div className="media-ai-preview-head">
                  <div>
                    <strong>Variações geradas</strong>
                    <span>Até 3 imagens por geração, prontas para aplicar no conteúdo atual.</span>
                  </div>
                  <button
                    type="button"
                    className="admin-secondary media-ai-generate"
                    disabled={mediaAiGenerating}
                    onClick={generateMediaMocks}
                  >
                    <Sparkles size={14} />
                    {mediaAiGenerating ? 'Gerando imagens...' : 'Gerar variações com IA'}
                  </button>
                </div>
                {selectedGeneratedMedia ? (
                  <div className="media-ai-featured">
                    <img src={selectedGeneratedMedia.path} alt={selectedGeneratedMedia.label} />
                    <div className="media-ai-featured-copy">
                      <strong>{selectedGeneratedMedia.label}</strong>
                      <span>{mediaAiStyle} • {mediaAiTarget === 'question' ? 'questão' : mediaAiTarget === 'lesson' ? 'lição' : 'quiz'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="media-ai-empty-state">
                    <Sparkles size={18} />
                    <span>Escolha um alvo e gere variações para visualizar o resultado aqui.</span>
                  </div>
                )}
                <div className="media-ai-preview-grid">
                  {generatedMediaAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className={`media-ai-card${selectedGeneratedMedia?.id === asset.id ? ' is-selected' : ''}`}
                      onClick={() => setMediaAiSelectedId(asset.id)}
                    >
                      <img src={asset.path} alt={asset.label} />
                      <div className="media-ai-card-copy">
                        <strong>{asset.label}</strong>
                        <span>{mediaAiStyle} • {mediaAiTarget === 'question' ? 'questão' : mediaAiTarget === 'lesson' ? 'lição' : 'quiz'}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="media-ai-actions-row">
                  <button
                    type="button"
                    className="admin-secondary media-ai-apply"
                    disabled={!selectedGeneratedMedia}
                    onClick={() => selectedGeneratedMedia && applyGeneratedMedia(selectedGeneratedMedia)}
                  >
                    Aplicar asset selecionado
                  </button>
                </div>
              </div>
            </div>
            <div className="admin-drawer-footer admin-modal-footer">
              <button className="admin-secondary" type="button" onClick={() => setMediaAiOpen(false)}>Fechar</button>
              <button
                className="admin-primary"
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(mediaPrompt).catch(() => undefined)
                  showToast('success', 'Prompt copiado. Você pode reutilizá-lo em novas variações.')
                }}
              >
                <Sparkles size={16} />
                Copiar prompt
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function MediaPicker({
  selected,
  onPick,
  compact = false,
  onGenerateAi,
  assets = mediaLibrary,
}: {
  selected: string | null
  onPick: (path: string) => void
  compact?: boolean
  onGenerateAi?: () => void
  assets?: MediaAsset[]
}) {
  return (
    <div className={`media-picker${compact  ? ' compact' : ''}`}>
      <div className="media-picker-head">
        <div>
          <strong>Biblioteca visual</strong>
          <span>Selecione um asset pelo preview</span>
        </div>
        {onGenerateAi && (
          <button type="button" className="admin-secondary media-ai-generate" onClick={onGenerateAi}>
            <Sparkles size={14} />
            Gerar mídia com IA
          </button>
        )}
      </div>
      <div className="media-grid">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className={`media-card${selected === asset.path  ? ' is-selected' : ''}`}
            onClick={() => onPick(asset.path)}
          >
            <img src={asset.path} alt={asset.label} />
            <span>{asset.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function QuestionPreviewStage({ draft, fallbackText }: { draft: QuizQuestionItem; fallbackText: string }) {
  if (draft.kind === 'multiple-choice') {
    const options = (draft.options ?? []).filter(Boolean)
    return (
      <div className="question-preview-stage question-preview-mc">
        {options.length  ? options.map((option) => <span key={option}>{option}</span>) : <span>go</span>}
      </div>
    )
  }

  if (draft.kind === 'drag-fill') {
    return (
      <div className="question-preview-stage question-preview-drag">
        <div className="preview-sentence">
          <span>{draft.sentenceBefore || 'I enjoy'}</span>
          <span className="preview-slot">drop here</span>
          <span>{draft.sentenceAfter || 'in the mountains.'}</span>
        </div>
        <div className="preview-token-row">
          {(draft.options ?? []).filter(Boolean).slice(0, 4).map((option) => <span key={option}>{option}</span>)}
        </div>
      </div>
    )
  }

  if (draft.kind === 'ordering') {
    return (
      <div className="question-preview-stage question-preview-ordering">
        <div className="preview-token-row">
          {(draft.scrambled ?? []).filter(Boolean).slice(0, 6).map((word) => <span key={word}>{word}</span>)}
        </div>
      </div>
    )
  }

  if (draft.kind === 'listening') {
    return (
      <div className="question-preview-stage question-preview-audio">
        <div className="preview-audio-player">
          <button type="button"><Volume2 size={14} /></button>
          <div className="preview-audio-wave" />
          <small>0:12</small>
        </div>
        <div className="preview-token-row">
          {(draft.options ?? []).filter(Boolean).slice(0, 3).map((option) => <span key={option}>{option}</span>)}
        </div>
      </div>
    )
  }

  return (
    <div className="question-preview-stage question-preview-speaking">
      <div className="preview-speaking-badge">
        <Mic size={18} />
        <span>Tap to speak</span>
      </div>
      <small>{draft.explanation || fallbackText || 'Seu feedback de fala aparece aqui.'}</small>
    </div>
  )
}

function useDebouncedValue<T>(value: T, delay = 180) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])

  return debounced
}
