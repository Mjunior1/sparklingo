import './AdminScreen.css'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  BarChart3,
  Bot,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Clock3,
  Copy,
  Eye,
  Gamepad2,
  Gauge,
  Gem,
  Image,
  Columns2,
  Grid3X3,
  LayoutDashboard,
  List,
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
  Zap,
  X,
} from 'lucide-react'
import { QuickWinCard, QuickWinsSection } from '../components/quickwins/QuickWinsSection'
import { MissionRuntime, MissionRuntimeScenePreviewCard, type MissionRuntimeMission } from '../components/runtime/MissionRuntime'
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
  type MediaSlotKey,
  type MediaSlots,
  type QuizCatalogItem,
  type QuizQuestionItem,
} from '../services/catalog'
import { SceneRenderer } from '../components/scene/SceneRenderer'
import {
  defaultQuestionMix,
  draftQuestionTypeOptions,
  generateAIDraftWithSpark,
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
  saveAIProviderSecret,
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
import {
  createEmptyQuickWin,
  defaultQuickWinsCatalog,
  defaultQuickWinsConfig,
  deleteQuickWin,
  getQuickWins,
  getQuickWinsConfig,
  quickWinCategoryOptions,
  quickWinCinematicStyleOptions,
  quickWinCTATypeOptions,
  quickWinHeaderIconOptions,
  quickWinHoverEffectOptions,
  quickWinIconOptions,
  quickWinMotionPresetOptions,
  quickWinProgressModeOptions,
  saveQuickWinsConfig,
  seedDefaultQuickWins,
  upsertQuickWin,
  type QuickWinCategory,
  type QuickWinItem,
  type QuickWinsConfig,
} from '../services/quickWins'
import {
  defaultSceneAssetDraft,
  defaultSceneAssetsCatalog,
  deleteSceneAsset,
  getSceneAssets,
  seedDefaultSceneAssets,
  upsertSceneAsset,
  type SceneAssetCategory,
  type SceneAssetFocalPoint,
  type SceneAssetOverlayStyle,
  type SceneAssetRecord,
  type SceneAssetSafeArea,
} from '../services/sceneAssets'
import {
  createEmptyMissionRuntimeScene,
  defaultMissionRuntimeScenes,
  deleteMissionRuntimeScene,
  getMissionRuntimeScenes,
  markMissionRuntimeSceneArchived,
  markMissionRuntimeScenePublished,
  missionRuntimeFeedbackToneOptions,
  seedDefaultMissionRuntimeScenes,
  upsertMissionRuntimeScene,
  type MissionRuntimeAnswerRecord,
  type MissionRuntimeFeedbackTone,
  type MissionRuntimePublicationStatus,
  type MissionRuntimeSceneRecord,
} from '../services/missionRuntime'
import {
  defaultAiMissionStudioBrief,
  generateAiMissionStudioDraft,
  type AiMissionStudioBrief,
  type AiMissionStudioDraft,
  type AiMissionStudioImpactLevel,
  type AiMissionStudioLevel,
  type AiMissionStudioSkill,
} from '../services/aiMissionStudio'

type AdminScreenProps = {
  lessons: LessonCatalogItem[]
  quizzes: QuizCatalogItem[]
  questions: QuizQuestionItem[]
  achievements: AchievementCatalogItem[]
  onBack: () => void
  onRefresh: () => Promise<unknown>
  platformConfig: PlatformConfig | null
}

type SectionKey =
  | 'dashboard'
  | 'ai-control'
  | 'ai-mission-studio'
  | 'quick-wins'
  | 'scene-assets'
  | 'mission-runtime'
  | 'lessons'
  | 'quizzes'
  | 'questions'
  | 'achievements'
  | 'media'
  | 'users'
  | 'analytics'
  | 'settings'

type DrawerMode = 'create' | 'edit'
type DrawerKind = 'lesson' | 'quiz' | 'question' | 'achievement' | 'scene-asset' | 'quick-win' | 'runtime-scene'

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

type MediaSlotGuide = {
  key: MediaSlotKey
  label: string
  ratio: string
  resolution: string
  safeArea: string
}

type SceneAssetStatusFilter = 'all' | 'active' | 'inactive'
type MissionRuntimeStatusFilter = 'all' | 'published' | 'draft' | 'archived' | 'active' | 'inactive'
type MissionRuntimeViewMode = 'list' | 'grid-2' | 'grid-4'

const tagOptions: Exclude<FilterKey, 'Todos'>[] = ['Gramática', 'Vocabulário', 'Listening', 'Reading', 'Speaking']
type ToastState = {
  tone: 'success' | 'error' | 'info'
  message: string
} | null

type StatusFilter = 'all' | 'active' | 'inactive'
type QuickWinStatusFilter = 'all' | 'active' | 'inactive'

const questionKinds: Array<QuizQuestionItem['kind']> = ['multiple-choice', 'drag-fill', 'ordering', 'listening', 'speaking']
const aiMissionStudioLevels: AiMissionStudioLevel[] = ['A1', 'A2', 'B1', 'B2']
const aiMissionStudioSkills: AiMissionStudioSkill[] = ['Speaking', 'Listening', 'Reading', 'Writing', 'Mixed']
const aiMissionStudioImpactLevels: AiMissionStudioImpactLevel[] = ['Low', 'Medium', 'High']
const aiMissionDirectorRequiredFields: Array<keyof AiMissionStudioBrief> = [
  'world',
  'mission',
  'level',
  'skill',
  'grammarTarget',
  'learningIntent',
  'confidenceGoal',
  'scenario',
]
const aiMissionDirectorPresets: Array<{
  id: string
  title: string
  description: string
  patch: Partial<AiMissionStudioBrief>
}> = [
  {
    id: 'authority-confidence',
    title: 'Figura de autoridade',
    description: 'Leve pressão, resposta curta e recuperação gentil.',
    patch: {
      pressureLevel: 'Low',
      emotionalTone: 'Leve tensão.',
      confidenceGoal: 'Reduzir a hesitação ao responder uma figura de autoridade.',
      failureMode: 'Responder de forma vaga ou escolher uma resposta incompatível com a pergunta.',
      recoveryStyle: 'Gentil e encorajador.',
    },
  },
  {
    id: 'real-world-survival',
    title: 'Sobrevivência real',
    description: 'Foco em frase útil, transferência prática e clareza.',
    patch: {
      skill: 'Speaking',
      realLifeTransfer: 'Pode ser reutilizado em aeroportos, entrevistas de visto, consulados e controle de fronteira.',
      recoveryStyle: 'Direto, calmo e sem punição.',
    },
  },
  {
    id: 'listening-first',
    title: 'Escuta contextual',
    description: 'NPC pergunta primeiro; aluno responde como numa situação real.',
    patch: {
      skill: 'Listening',
      pressureLevel: 'Medium',
      emotionalTone: 'Atenção contextual.',
      confidenceGoal: 'Ajudar o aluno a reconhecer a intenção da pergunta antes de responder.',
    },
  },
]
const missionRuntimePublicationLabels: Record<MissionRuntimePublicationStatus, string> = {
  draft: 'Draft',
  published: 'Publicado',
  archived: 'Arquivado',
}
const normalizeAdminText = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const resolveAdminLessonForSceneAsset = (asset: SceneAssetRecord | null, lessons: LessonCatalogItem[]) => {
  if (!asset || !lessons.length) return lessons[0] ?? null
  const assetMission = normalizeAdminText(asset.mission)
  const assetTitle = normalizeAdminText(asset.title)
  const category = normalizeAdminText(asset.category)

  return (
    lessons.find((lesson) => {
      const lessonText = normalizeAdminText([lesson.title, lesson.missionTitle ?? '', lesson.category, lesson.emotionalContext ?? ''].join(' '))
      const lessonMission = normalizeAdminText(lesson.missionTitle)
      return (
        (assetMission && lessonMission && (assetMission.includes(lessonMission) || lessonMission.includes(assetMission))) ||
        (assetTitle && lessonMission && (assetTitle.includes(lessonMission) || lessonMission.includes(assetTitle))) ||
        (category === 'airport' && lessonText.includes('airport')) ||
        (category === 'coffeeshop' && (lessonText.includes('coffee') || lessonText.includes('daily routine'))) ||
        (category === 'park' && lessonText.includes('park'))
      )
    }) ??
    lessons[0] ??
    null
  )
}

const runtimeSceneBelongsToSameMission = (
  candidate: MissionRuntimeSceneRecord,
  target: MissionRuntimeSceneRecord,
) => {
  const candidateLesson = normalizeAdminText(candidate.lessonId)
  const targetLesson = normalizeAdminText(target.lessonId)
  const candidateMission = normalizeAdminText(candidate.missionTitle)
  const targetMission = normalizeAdminText(target.missionTitle)
  const candidateAsset = normalizeAdminText(candidate.sceneAssetId)
  const targetAsset = normalizeAdminText(target.sceneAssetId)

  if (targetLesson && candidateLesson && targetLesson === candidateLesson) return true
  if (targetMission && candidateMission && targetMission === candidateMission) return true
  if (targetAsset && candidateAsset && targetAsset === candidateAsset) return true

  return false
}

const computeMissionRuntimeSceneTotal = (
  catalog: MissionRuntimeSceneRecord[],
  target: MissionRuntimeSceneRecord,
) =>
  Math.max(
    1,
    catalog.filter((scene) =>
      scene.id !== target.id &&
      scene.publicationStatus !== 'archived' &&
      runtimeSceneBelongsToSameMission(scene, target),
    ).length + 1,
  )

const withComputedMissionRuntimeSceneTotal = (
  catalog: MissionRuntimeSceneRecord[],
  scene: MissionRuntimeSceneRecord,
) => ({
  ...scene,
  sceneTotal: computeMissionRuntimeSceneTotal(catalog, scene),
})

const navItems: Array<{ key: SectionKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'ai-control', label: 'AI Control Center', icon: BrainCircuit },
  { key: 'ai-mission-studio', label: 'AI Mission Studio', icon: Sparkles },
  { key: 'quick-wins', label: 'Quick Wins', icon: Zap },
  { key: 'scene-assets', label: 'Scene Assets', icon: Image },
  { key: 'mission-runtime', label: 'Mission Runtime', icon: Clapperboard },
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

const lessonMediaGuides: MediaSlotGuide[] = [
  { key: 'heroImageDesktop', label: 'Hero desktop', resolution: '1600x900', ratio: '16:9', safeArea: 'Mantenha rosto, CTA e tensão no centro.' },
  { key: 'heroImageMobile', label: 'Hero mobile', resolution: '900x1600', ratio: '9:16', safeArea: 'Deixe a ação no miolo para thumb navigation.' },
  { key: 'thumbnail', label: 'Thumbnail da missão', resolution: '1200x700', ratio: '16:9', safeArea: 'Evite texto nas bordas.' },
  { key: 'nodeImage', label: 'Nó do mapa', resolution: '800x800', ratio: '1:1', safeArea: 'Use foco central para crop circular.' },
  { key: 'nodeCompletedImage', label: 'Nó concluído', resolution: '800x800', ratio: '1:1', safeArea: 'Versão com sensação de checkpoint vencido.' },
  { key: 'emotionalBackground', label: 'Fundo emocional', resolution: '1440x1800', ratio: '4:5', safeArea: 'Priorize atmosfera e profundidade.' },
  { key: 'mascotImage', label: 'Mascote / companion', resolution: '1200x1600', ratio: '3:4', safeArea: 'Silhueta limpa, ideal para recorte seguro.' },
]

const quizMediaGuides: MediaSlotGuide[] = [
  { key: 'challengeCardImage', label: 'Card do desafio', resolution: '1200x700', ratio: '16:9', safeArea: 'Título e ação devem sobreviver ao crop.' },
  { key: 'challengeIcon', label: 'Ícone do desafio', resolution: '512x512', ratio: '1:1', safeArea: 'Ícone central com fundo simples.' },
  { key: 'scenarioThumbnail', label: 'Thumbnail de cenário', resolution: '900x1200', ratio: '3:4', safeArea: 'Foco narrativo no centro da cena.' },
]

const questionMediaGuides: MediaSlotGuide[] = [
  { key: 'scenarioThumbnail', label: 'Cenário da questão', resolution: '900x1200', ratio: '3:4', safeArea: 'Contexto visível sem poluição lateral.' },
  { key: 'emotionalThumbnail', label: 'Thumbnail emocional', resolution: '900x1200', ratio: '3:4', safeArea: 'Realce tensão, urgência ou recompensa.' },
  { key: 'challengeIcon', label: 'Ícone da ação', resolution: '512x512', ratio: '1:1', safeArea: 'Funciona bem em chips e cards compactos.' },
]

const sceneAssetCategoryOptions: SceneAssetCategory[] = ['Airport', 'CoffeeShop', 'Park', 'General']
const sceneAssetFocalPointOptions: SceneAssetFocalPoint[] = ['center', 'center-left', 'center-right', 'top', 'bottom']
const sceneAssetOverlayStyleOptions: SceneAssetOverlayStyle[] = ['cinematic-violet', 'midnight-glass', 'ember-glow', 'aurora-soft']

const emptyLesson: LessonCatalogItem = {
  id: '',
  category: 'Vocabulário',
  title: '',
  blurb: '',
  image: mediaLibrary[0].path,
  mediaSlots: {},
  tone: 'sky',
  progress: 0,
}

const emptyQuiz: QuizCatalogItem = {
  id: '',
  lessonId: '',
  tag: 'Vocabulário',
  title: '',
  coverArt: '',
  mediaSlots: {},
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
  mediaSlots: {},
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

const createEmptySceneAsset = (): SceneAssetRecord => ({
  ...defaultSceneAssetDraft,
  textSafeArea: { ...defaultSceneAssetDraft.textSafeArea },
  characterSafeArea: { ...defaultSceneAssetDraft.characterSafeArea },
})

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
  'ai-mission-studio': 'AI Mission Studio',
  'quick-wins': 'Quick Wins',
  'scene-assets': 'Scene Assets',
  'mission-runtime': 'Mission Runtime',
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
  'ai-mission-studio': 'Gere uma Scene completa a partir de intenção pedagógica, valide qualidade, visualize no Runtime real e aprove para produção.',
  'quick-wins': 'Configure o momentum system da home com cards premium, timers, badges de XP e previews cinematográficos em tempo real.',
  'ai-control': 'Configure providers, guardrails, drafts e geração contextual sem quebrar a hierarquia atual de lições, quizzes e questões.',
  'scene-assets': 'Cadastre, organize e ajuste os assets narrativos cinematográficos que alimentam hero, missões e cenas do SparkLingo.',
  'mission-runtime': 'Modele as cenas cinematográficas, diálogos, respostas, feedback e progressão que entram quando o usuário abre uma missão.',
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
  const [quickWinSearch, setQuickWinSearch] = useState('')
  const [quickWinCategoryFilter, setQuickWinCategoryFilter] = useState<QuickWinCategory | 'all'>('all')
  const [quickWinStatus, setQuickWinStatus] = useState<QuickWinStatusFilter>('all')
  const [sceneAssetSearch, setSceneAssetSearch] = useState('')
  const [sceneAssetCategoryFilter, setSceneAssetCategoryFilter] = useState<SceneAssetCategory | 'all'>('all')
  const [sceneAssetStatus, setSceneAssetStatus] = useState<SceneAssetStatusFilter>('all')
  const [missionRuntimeSearch, setMissionRuntimeSearch] = useState('')
  const [missionRuntimeAssetFilter, setMissionRuntimeAssetFilter] = useState<string>('all')
  const [missionRuntimeStatus, setMissionRuntimeStatus] = useState<MissionRuntimeStatusFilter>('all')
  const [missionRuntimeViewMode, setMissionRuntimeViewMode] = useState<MissionRuntimeViewMode>('grid-2')
  const [lessonDraft, setLessonDraft] = useState<LessonCatalogItem>(emptyLesson)
  const [quizDraft, setQuizDraft] = useState<QuizCatalogItem>(emptyQuiz)
  const [questionDraft, setQuestionDraft] = useState<QuizQuestionItem>(emptyQuestion)
  const [achievementDraft, setAchievementDraft] = useState<AchievementCatalogItem>(emptyAchievement)
  const [quickWinDraft, setQuickWinDraft] = useState<QuickWinItem>(createEmptyQuickWin)
  const [quickWins, setQuickWins] = useState<QuickWinItem[]>([])
  const [quickWinsLoaded, setQuickWinsLoaded] = useState(false)
  const [quickWinsConfigDraft, setQuickWinsConfigDraft] = useState<QuickWinsConfig>(defaultQuickWinsConfig)
  const [sceneAssetDraft, setSceneAssetDraft] = useState<SceneAssetRecord>(createEmptySceneAsset)
  const [sceneAssets, setSceneAssets] = useState<SceneAssetRecord[]>([])
  const [sceneAssetsLoaded, setSceneAssetsLoaded] = useState(false)
  const [missionRuntimeDraft, setMissionRuntimeDraft] = useState<MissionRuntimeSceneRecord>(createEmptyMissionRuntimeScene())
  const [missionRuntimeScenes, setMissionRuntimeScenes] = useState<MissionRuntimeSceneRecord[]>([])
  const [missionRuntimeLoaded, setMissionRuntimeLoaded] = useState(false)
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
  const [showAdvancedAiSettings, setShowAdvancedAiSettings] = useState(false)
  const [aiConnectionMessage, setAiConnectionMessage] = useState('')
  const [aiTestingConnection, setAiTestingConnection] = useState(false)
  const [aiDrafts, setAiDrafts] = useState<AIDraftRecord[]>([])
  const [aiComposer, setAiComposer] = useState<LessonComposerInput>(aiComposerDefaults)
  const [aiPreviewDraft, setAiPreviewDraft] = useState<AIDraftRecord | null>(null)
  const [aiSelectedDraftId, setAiSelectedDraftId] = useState('')
  const [aiComposerLoading, setAiComposerLoading] = useState(false)
  const [aiMissionBrief, setAiMissionBrief] = useState<AiMissionStudioBrief>(defaultAiMissionStudioBrief)
  const [aiMissionDraft, setAiMissionDraft] = useState<AiMissionStudioDraft | null>(null)
  const [aiMissionGenerating, setAiMissionGenerating] = useState(false)

  const debouncedLessonSearch = useDebouncedValue(lessonSearch)
  const debouncedQuizSearch = useDebouncedValue(quizSearch)
  const debouncedQuestionSearch = useDebouncedValue(questionSearch)
  const debouncedAchievementSearch = useDebouncedValue(achievementSearch)
  const debouncedQuickWinSearch = useDebouncedValue(quickWinSearch)
  const debouncedSceneAssetSearch = useDebouncedValue(sceneAssetSearch)
  const debouncedMissionRuntimeSearch = useDebouncedValue(missionRuntimeSearch)

  useEffect(() => {
    setPlatformDraft(platformConfig ?? defaultPlatformConfig)
  }, [platformConfig])

  useEffect(() => {
    getSceneAssets()
      .then((items) => {
        setSceneAssets(items)
        setSceneAssetsLoaded(true)
      })
      .catch(() => setSceneAssetsLoaded(true))
  }, [])

  useEffect(() => {
    Promise.all([getQuickWins(), getQuickWinsConfig()])
      .then(([items, config]) => {
        setQuickWins(items)
        setQuickWinsLoaded(true)
        setQuickWinsConfigDraft(config)
      })
      .catch(() => setQuickWinsLoaded(true))
  }, [])

  useEffect(() => {
    getMissionRuntimeScenes()
      .then((items) => {
        setMissionRuntimeScenes(items)
        setMissionRuntimeLoaded(true)
      })
      .catch(() => setMissionRuntimeLoaded(true))
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (aiMissionBrief.sceneAssetId || !sceneAssets.length) return
    const defaultAsset = sceneAssets.find((asset) => asset.category === 'Airport') ?? sceneAssets[0]
    setAiMissionBrief((current) => ({ ...current, sceneAssetId: defaultAsset.id }))
  }, [aiMissionBrief.sceneAssetId, sceneAssets])

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

  const quickWinIdPreview = useMemo(
    () => quickWinDraft.id || nextNumericId(quickWins.map((item) => item.id), 'QW'),
    [quickWinDraft.id, quickWins],
  )

  const sceneAssetIdPreview = useMemo(
    () => sceneAssetDraft.id || nextNumericId(sceneAssets.map((item) => item.id), 'SA'),
    [sceneAssetDraft.id, sceneAssets],
  )

  const missionRuntimeIdPreview = useMemo(
    () => missionRuntimeDraft.id || nextNumericId(missionRuntimeScenes.map((item) => item.id), 'RT'),
    [missionRuntimeDraft.id, missionRuntimeScenes],
  )
  const aiMissionStudioIdPreview = useMemo(
    () => nextNumericId(missionRuntimeScenes.map((item) => item.id), 'RT'),
    [missionRuntimeScenes],
  )

  const lessonDisplayIds = useMemo(() => buildDisplayIdMap(lessons.map((item) => item.id), 'LS'), [lessons])
  const quizDisplayIds = useMemo(() => buildDisplayIdMap(quizzes.map((item) => item.id), 'QZ'), [quizzes])
  const questionDisplayIds = useMemo(() => buildDisplayIdMap(questions.map((item) => item.id), 'QT'), [questions])
  const achievementDisplayIds = useMemo(() => buildDisplayIdMap(achievements.map((item) => item.id), 'AC'), [achievements])
  const quickWinDisplayIds = useMemo(() => buildDisplayIdMap(quickWins.map((item) => item.id), 'QW'), [quickWins])
  const sceneAssetDisplayIds = useMemo(() => buildDisplayIdMap(sceneAssets.map((item) => item.id), 'SA'), [sceneAssets])
  const missionRuntimeDisplayIds = useMemo(() => buildDisplayIdMap(missionRuntimeScenes.map((item) => item.id), 'RT'), [missionRuntimeScenes])

  const displayId = (id: string, kind: 'lesson' | 'quiz' | 'question' | 'achievement' | 'quick-win' | 'scene-asset' | 'runtime-scene') => {
    if (!id) return ''
    const map =
      kind === 'lesson'
        ? lessonDisplayIds
        : kind === 'quiz'
          ? quizDisplayIds
          : kind === 'question'
            ? questionDisplayIds
            : kind === 'achievement'
            ? achievementDisplayIds
            : kind === 'quick-win'
              ? quickWinDisplayIds
              : kind === 'scene-asset'
                ? sceneAssetDisplayIds
                : missionRuntimeDisplayIds

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

  const filteredQuickWins = useMemo(() => {
    return quickWins
      .filter((item) => quickWinCategoryFilter === 'all' || item.category === quickWinCategoryFilter)
      .filter((item) => quickWinStatus === 'all' || (quickWinStatus === 'active' ? item.active : !item.active))
      .filter((item) => {
        if (!debouncedQuickWinSearch.trim()) return true
        const haystack = `${item.id} ${item.title} ${item.subtitle} ${item.category}`.toLowerCase()
        return haystack.includes(debouncedQuickWinSearch.toLowerCase())
      })
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
  }, [debouncedQuickWinSearch, quickWinCategoryFilter, quickWinStatus, quickWins])

  const filteredSceneAssets = useMemo(() => {
    return sceneAssets
      .filter((asset) => sceneAssetCategoryFilter === 'all' || asset.category === sceneAssetCategoryFilter)
      .filter((asset) => sceneAssetStatus === 'all' || (sceneAssetStatus === 'active' ? asset.active : !asset.active))
      .filter((asset) => {
        if (!debouncedSceneAssetSearch.trim()) return true
        const haystack = `${asset.id} ${asset.title} ${asset.slug} ${asset.category} ${asset.chapter} ${asset.mission}`.toLowerCase()
        return haystack.includes(debouncedSceneAssetSearch.toLowerCase())
      })
      .sort((a, b) => a.progressionOrder - b.progressionOrder || a.title.localeCompare(b.title))
  }, [debouncedSceneAssetSearch, sceneAssetCategoryFilter, sceneAssetStatus, sceneAssets])

  const filteredMissionRuntimeScenes = useMemo(() => {
    return missionRuntimeScenes
      .filter((scene) => missionRuntimeAssetFilter === 'all' || scene.sceneAssetId === missionRuntimeAssetFilter)
      .filter((scene) => {
        if (missionRuntimeStatus === 'all') return true
        if (missionRuntimeStatus === 'active') return scene.active
        if (missionRuntimeStatus === 'inactive') return !scene.active
        return scene.publicationStatus === missionRuntimeStatus
      })
      .filter((scene) => {
        if (!debouncedMissionRuntimeSearch.trim()) return true
        const linkedAsset = sceneAssets.find((asset) => asset.id === scene.sceneAssetId)
        const haystack = `${scene.id} ${scene.missionTitle} ${scene.title} ${scene.character} ${scene.question} ${linkedAsset?.title ?? ''}`.toLowerCase()
        return haystack.includes(debouncedMissionRuntimeSearch.toLowerCase())
      })
      .sort((a, b) => a.order - b.order || a.sceneNumber - b.sceneNumber || a.id.localeCompare(b.id))
  }, [
    debouncedMissionRuntimeSearch,
    missionRuntimeAssetFilter,
    missionRuntimeScenes,
    missionRuntimeStatus,
    sceneAssets,
  ])

  const dashboardStats = [
    { label: 'Lições', value: lessons.length, helper: 'trilhas vivas' },
    { label: 'Quizzes', value: quizzes.length, helper: 'blocos jogáveis' },
    { label: 'Questões', value: questions.length, helper: 'itens no catálogo' },
    { label: 'Conquistas', value: achievements.length || defaultAchievementCatalog.length, helper: 'recompensas' },
  ]

  const sceneAssetCategories = useMemo(
    () => Array.from(new Set([...sceneAssetCategoryOptions, ...sceneAssets.map((asset) => asset.category)])).sort(),
    [sceneAssets],
  )

  const missionRuntimeAssetOptions = useMemo(
    () =>
      sceneAssets
        .slice()
        .sort((a, b) => a.progressionOrder - b.progressionOrder || a.title.localeCompare(b.title)),
    [sceneAssets],
  )

  const quickWinCategories = useMemo(
    () => Array.from(new Set([...quickWinCategoryOptions, ...quickWins.map((item) => item.category)])).sort(),
    [quickWins],
  )

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
  const currentMissionRuntimeAsset = sceneAssets.find((asset) => asset.id === missionRuntimeDraft.sceneAssetId) ?? null
  const selectedAiMissionAsset =
    sceneAssets.find((asset) => asset.id === aiMissionBrief.sceneAssetId) ??
    sceneAssets.find((asset) => asset.category === 'Airport') ??
    sceneAssets[0] ??
    null
  const selectedAiMissionLesson = resolveAdminLessonForSceneAsset(selectedAiMissionAsset, lessons)
  const aiMissionPreviewSceneTotal = aiMissionDraft
    ? computeMissionRuntimeSceneTotal(missionRuntimeScenes, aiMissionDraft.runtimeScene)
    : 1
  const aiMissionPreviewMission: MissionRuntimeMission | null = aiMissionDraft ? {
    id: aiMissionDraft.runtimeScene.missionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: aiMissionDraft.runtimeScene.missionTitle,
    chapterLabel: aiMissionDraft.runtimeScene.chapter,
    sceneCount: aiMissionPreviewSceneTotal,
    posterImage: aiMissionDraft.runtimeScene.backgroundImageUrl,
    backgroundDesktop: aiMissionDraft.runtimeScene.backgroundImageUrl,
    backgroundMobile: aiMissionDraft.runtimeScene.backgroundImageUrlMobile || aiMissionDraft.runtimeScene.backgroundImageUrl,
    asset: selectedAiMissionAsset ?? defaultSceneAssetDraft,
  } : null
  const aiMissionBriefCompletion = useMemo(() => {
    const completed = aiMissionDirectorRequiredFields.filter((field) => String(aiMissionBrief[field] ?? '').trim()).length
    return Math.round((completed / aiMissionDirectorRequiredFields.length) * 100)
  }, [aiMissionBrief])
  const aiMissionDirectorNextQuestion = useMemo(() => {
    if (!aiMissionBrief.mission.trim()) return 'Qual situação real o aluno precisa dominar primeiro?'
    if (!aiMissionBrief.learningIntent.trim()) return 'Qual comportamento real o aluno deve conseguir executar com confiança?'
    if (!aiMissionBrief.confidenceGoal.trim()) return 'Qual medo ou hesitação esta cena precisa reduzir?'
    if (!aiMissionBrief.realLifeTransfer.trim()) return 'Onde esta habilidade será reutilizada fora do app?'
    return 'Brief pronto para gerar uma cena. Revise se o nível, skill e gramática realmente combinam com a intenção.'
  }, [aiMissionBrief.confidenceGoal, aiMissionBrief.learningIntent, aiMissionBrief.mission, aiMissionBrief.realLifeTransfer])

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

  const refreshSceneAssets = async () => {
    const items = await getSceneAssets()
    setSceneAssets(items)
    setSceneAssetsLoaded(true)
    return items
  }

  const refreshQuickWins = async () => {
    const [items, config] = await Promise.all([getQuickWins(), getQuickWinsConfig()])
    setQuickWins(items)
    setQuickWinsLoaded(true)
    setQuickWinsConfigDraft(config)
    return { items, config }
  }

  const refreshMissionRuntime = async () => {
    const items = await getMissionRuntimeScenes()
    setMissionRuntimeScenes(items)
    setMissionRuntimeLoaded(true)
    return items
  }

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

  const saveQuickWinItem = () => runAdminTask(
    'Salvando quick win...',
    `Quick Win "${quickWinDraft.title}" salvo com sucesso.`,
    async () => {
      await upsertQuickWin({ ...quickWinDraft, id: quickWinDraft.id || quickWinIdPreview })
      await refreshQuickWins()
      if (onRefresh) await onRefresh()
      setQuickWinDraft(createEmptyQuickWin())
      closeDrawer()
    },
  )

  const saveSceneAssetItem = () => runAdminTask(
    'Salvando scene asset...',
    `Scene asset "${sceneAssetDraft.title}" salvo com sucesso.`,
    async () => {
      await upsertSceneAsset({ ...sceneAssetDraft, id: sceneAssetDraft.id || sceneAssetIdPreview })
      await refreshSceneAssets()
      if (onRefresh) await onRefresh()
      setSceneAssetDraft(createEmptySceneAsset())
      closeDrawer()
    },
  )

  const saveMissionRuntimeItem = () => runAdminTask(
    'Salvando cena runtime...',
    `Cena "${missionRuntimeDraft.title}" salva com sucesso.`,
      async () => {
      const isExistingScene = Boolean(missionRuntimeDraft.id)
      const sceneToSave = withComputedMissionRuntimeSceneTotal(missionRuntimeScenes, {
        ...missionRuntimeDraft,
        id: missionRuntimeDraft.id || missionRuntimeIdPreview,
        provenance: [
          ...missionRuntimeDraft.provenance,
          {
            type: isExistingScene ? 'edited' : 'created',
            at: new Date().toISOString(),
            by: 'admin',
            note: isExistingScene ? 'Cena runtime editada manualmente.' : 'Cena runtime criada manualmente.',
          },
        ],
      })
      await upsertMissionRuntimeScene(sceneToSave)
      await refreshMissionRuntime()
      if (onRefresh) await onRefresh()
      setMissionRuntimeDraft(createEmptyMissionRuntimeScene())
      closeDrawer()
    },
  )

  const updateAiMissionBrief = <Key extends keyof AiMissionStudioBrief>(field: Key, value: AiMissionStudioBrief[Key]) => {
    setAiMissionBrief((current) => ({ ...current, [field]: value }))
  }

  const applyAiMissionDirectorSuggestion = () => {
    setAiMissionBrief((current) => {
      const scenario = current.scenario.trim() || 'real-world situation'
      const mission = current.mission.trim() || 'New Mission'
      const grammar = current.grammarTarget.trim() || 'target language'
      const skill = current.skill
      return {
        ...current,
        learningOutcome:
          current.learningOutcome.trim() ||
          `Student should be able to handle ${scenario.toLowerCase()} using ${grammar}.`,
        learningIntent:
          current.learningIntent.trim() ||
          `O aluno deve conseguir agir com clareza e confiança em "${mission}", usando ${grammar} em uma interação real de ${skill.toLowerCase()}.`,
        confidenceGoal:
          current.confidenceGoal.trim() ||
          `Reduzir a hesitação do aluno ao responder em uma situação de ${scenario.toLowerCase()}.`,
        failureMode:
          current.failureMode.trim() ||
          'Responder de forma vaga, incompatível com a pergunta ou com pouca clareza comunicativa.',
        recoveryStyle:
          current.recoveryStyle.trim() ||
          'Gentil, específico e orientado à próxima tentativa.',
        emotionalTone:
          current.emotionalTone.trim() ||
          (current.pressureLevel === 'High' ? 'Tensão controlada.' : current.pressureLevel === 'Medium' ? 'Atenção prática.' : 'Leve tensão.'),
        realLifeTransfer:
          current.realLifeTransfer.trim() ||
          `Pode ser reutilizado em situações reais de ${scenario.toLowerCase()}, viagens, atendimento e conversas práticas.`,
      }
    })
  }

  const applyAiMissionDirectorPreset = (patch: Partial<AiMissionStudioBrief>) => {
    setAiMissionBrief((current) => ({ ...current, ...patch }))
  }

  const generateAiMissionDraft = async () => {
    setAiMissionGenerating(true)
    setStatus('Gerando Scene Draft com base no Learning Intent...')
    try {
      const draft = await generateAiMissionStudioDraft(aiMissionBrief, {
        sceneAsset: selectedAiMissionAsset,
        nextId: aiMissionStudioIdPreview,
        order: missionRuntimeScenes.length + 1,
        lessonId: selectedAiMissionLesson?.id ?? '',
        parentMissionTitle: selectedAiMissionLesson?.missionTitle || selectedAiMissionLesson?.title || '',
      })
      setAiMissionDraft(draft)
      setStatus(draft.source === 'ai' ? 'Scene Draft gerada pela IA e validada.' : 'Scene Draft gerada em fallback local e validada.')
      setToast({
        tone: draft.validation.valid ? 'success' : 'info',
        message: draft.validation.valid ? 'Scene Draft pronta para preview.' : 'Draft gerado com pontos de validação para revisar.',
      })
    } catch (error) {
      setToast({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível gerar a Scene Draft.',
      })
    } finally {
      setAiMissionGenerating(false)
    }
  }

  const saveAiMissionDraft = () => {
    if (!aiMissionDraft) return

    runAdminTask(
      'Salvando Scene Draft...',
      `Draft "${aiMissionDraft.runtimeScene.title}" salvo no Mission Runtime.`,
      async () => {
        await upsertMissionRuntimeScene(withComputedMissionRuntimeSceneTotal(missionRuntimeScenes, {
          ...aiMissionDraft.runtimeScene,
          publicationStatus: 'draft',
          active: true,
        }))
        await refreshMissionRuntime()
        if (onRefresh) await onRefresh()
      },
    )
  }

  const publishAiMissionDraft = () => {
    if (!aiMissionDraft) return

    runAdminTask(
      'Publicando Scene Draft...',
      `Scene "${aiMissionDraft.runtimeScene.title}" publicada para os alunos.`,
      async () => {
        await upsertMissionRuntimeScene(
          markMissionRuntimeScenePublished(
            withComputedMissionRuntimeSceneTotal(missionRuntimeScenes, aiMissionDraft.runtimeScene),
            'admin',
          ),
        )
        await refreshMissionRuntime()
        if (onRefresh) await onRefresh()
        setAiMissionDraft(null)
      },
    )
  }

  const deleteAiMissionDraft = () => {
    if (!aiMissionDraft) return

    const savedDraft = missionRuntimeScenes.find((scene) => scene.id === aiMissionDraft.runtimeScene.id)
    if (!savedDraft) {
      setAiMissionDraft(null)
      return
    }

    if (!window.confirm(`Excluir o draft "${savedDraft.title}" do Mission Runtime?`)) return

    runAdminTask(
      `Excluindo draft "${savedDraft.title}"...`,
      `Draft "${savedDraft.title}" removido do Mission Runtime.`,
      async () => {
        await deleteMissionRuntimeScene(savedDraft.id)
        await refreshMissionRuntime()
        if (onRefresh) await onRefresh()
        setAiMissionDraft(null)
      },
    )
  }

  const publishMissionRuntimeItem = (scene: MissionRuntimeSceneRecord) => runAdminTask(
    `Publicando "${scene.title}"...`,
    `"${scene.title}" publicada para os alunos.`,
    async () => {
      await upsertMissionRuntimeScene(
        markMissionRuntimeScenePublished(withComputedMissionRuntimeSceneTotal(missionRuntimeScenes, scene), 'admin'),
      )
      await refreshMissionRuntime()
      if (onRefresh) await onRefresh()
    },
  )

  const archiveMissionRuntimeItem = (scene: MissionRuntimeSceneRecord) => runAdminTask(
    `Arquivando "${scene.title}"...`,
    `"${scene.title}" arquivada.`,
    async () => {
      await upsertMissionRuntimeScene(markMissionRuntimeSceneArchived(scene, 'admin'))
      await refreshMissionRuntime()
      if (onRefresh) await onRefresh()
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

  const removeSceneAssetItem = async (asset: SceneAssetRecord) => {
    if (!window.confirm(`Excluir "${asset.title}" de Scene Assets?`)) return

    await runAdminTask(
      `Excluindo "${asset.title}"...`,
      `"${asset.title}" removido de Scene Assets.`,
      async () => {
        await deleteSceneAsset(asset.id)
        await refreshSceneAssets()
      },
    )
  }

  const removeQuickWinItem = async (item: QuickWinItem) => {
    if (!window.confirm(`Excluir "${item.title}" de Quick Wins?`)) return

    await runAdminTask(
      `Excluindo "${item.title}"...`,
      `"${item.title}" removido de Quick Wins.`,
      async () => {
        await deleteQuickWin(item.id)
        await refreshQuickWins()
      },
    )
  }

  const removeMissionRuntimeItem = async (scene: MissionRuntimeSceneRecord) => {
    if (!window.confirm(`Excluir "${scene.title}" do Mission Runtime?`)) return

    await runAdminTask(
      `Excluindo "${scene.title}"...`,
      `"${scene.title}" removida do Mission Runtime.`,
      async () => {
        await deleteMissionRuntimeScene(scene.id)
        await refreshMissionRuntime()
      },
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

  const openQuickWinEditor = (item?: QuickWinItem) => {
    setQuickWinDraft(item ? { ...item } : createEmptyQuickWin())
    openDrawer('quick-win', item ? 'edit' : 'create')
  }

  const openSceneAssetEditor = (asset?: SceneAssetRecord) => {
    setSceneAssetDraft(
      asset
        ? {
            ...asset,
            textSafeArea: { ...asset.textSafeArea },
            characterSafeArea: { ...asset.characterSafeArea },
          }
        : createEmptySceneAsset(),
    )
    openDrawer('scene-asset', asset ? 'edit' : 'create')
  }

  const openMissionRuntimeEditor = (scene?: MissionRuntimeSceneRecord) => {
    setMissionRuntimeDraft(
      scene
        ? {
            ...scene,
            answers: scene.answers.map((answer) => ({ ...answer })),
          }
        : createEmptyMissionRuntimeScene(),
    )
    openDrawer('runtime-scene', scene ? 'edit' : 'create')
  }

  const updateSceneAssetSafeArea = (key: 'textSafeArea' | 'characterSafeArea', field: keyof SceneAssetSafeArea, value: string) => {
    setSceneAssetDraft((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: Number(value) || 0,
      },
    }))
  }

  const updateMissionRuntimeAnswer = (
    index: number,
    field: keyof MissionRuntimeAnswerRecord,
    value: string | number | boolean,
  ) => {
    setMissionRuntimeDraft((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, [field]: value } : answer,
      ),
    }))
  }

  const addMissionRuntimeAnswer = () => {
    setMissionRuntimeDraft((current) => ({
      ...current,
      answers: [
        ...current.answers,
        {
          id: `answer-${current.answers.length + 1}`,
          text: '',
          translation: '',
          audioUrl: '',
          isCorrect: false,
          feedbackTitle: '',
          feedbackBody: '',
          xpReward: 0,
        },
      ],
    }))
  }

  const removeMissionRuntimeAnswer = (index: number) => {
    setMissionRuntimeDraft((current) => {
      if (current.answers.length <= 1) return current
      return {
        ...current,
        answers: current.answers.filter((_, answerIndex) => answerIndex !== index),
      }
    })
  }

  const saveQuickWinsSettings = () =>
    runAdminTask(
      'Salvando Quick Wins...',
      'Configuração de Quick Wins salva com sucesso.',
      async () => {
        await saveQuickWinsConfig(quickWinsConfigDraft)
        await refreshQuickWins()
      },
    )

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

  const updateLessonMediaSlot = (key: MediaSlotKey, path: string) => {
    setLessonDraft((current) => ({
      ...current,
      mediaSlots: {
        ...(current.mediaSlots ?? {}),
        [key]: { path },
      },
    }))
  }

  const updateQuizMediaSlot = (key: MediaSlotKey, path: string) => {
    setQuizDraft((current) => ({
      ...current,
      mediaSlots: {
        ...(current.mediaSlots ?? {}),
        [key]: { path },
      },
    }))
  }

  const updateQuestionMediaSlot = (key: MediaSlotKey, path: string) => {
    setQuestionDraft((current) => ({
      ...current,
      mediaSlots: {
        ...(current.mediaSlots ?? {}),
        [key]: { path },
      },
    }))
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
        let apiKeyMasked = aiControl.apiKeyMasked
        if (aiApiKeyInput.trim()) {
          const result = await saveAIProviderSecret(aiControl.provider, aiApiKeyInput.trim(), aiControl.apiKeyReference)
          apiKeyMasked = result.maskedKey ?? maskApiKey(aiApiKeyInput)
          setAiApiKeyInput('')
        }
        await saveAIControlConfig({
          ...aiControl,
          apiKeyMasked,
        })
        setAiControl((current) => ({ ...current, apiKeyMasked }))
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
    try {
      const result = await testProviderConnection(aiControl.provider, aiControl.apiKeyReference, aiApiKeyInput)
      setAiConnectionMessage(result.message)
      showToast(result.ok ? 'success' : 'error', result.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao testar a conexão com o provider.'
      setAiConnectionMessage(message)
      showToast('error', message)
    } finally {
      setAiTestingConnection(false)
    }
  }

  const handleGenerateAIDraft = async () => {
    setAiComposerLoading(true)
    try {
      const draft = await generateAIDraftWithSpark(aiComposer, aiControl, memoryConfig, {
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
            <MediaSlotEditor
              title="Mission media slots"
              description="Defina os slots visuais que alimentam hero, mapa e thumbnails da jornada."
              slots={lessonDraft.mediaSlots}
              guides={lessonMediaGuides}
              assets={mediaPickerAssets}
              onChange={updateLessonMediaSlot}
            />
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
            <MediaSlotEditor
              title="Challenge media slots"
              description="Cada quiz pode expor capa, ícone e thumbnail de cenário para cards, quick XP e momentos reais."
              slots={quizDraft.mediaSlots}
              guides={quizMediaGuides}
              assets={mediaPickerAssets}
              onChange={updateQuizMediaSlot}
            />
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
              <MediaSlotEditor
                title="Question media slots"
                description="Defina a imagem de cenário, reforço emocional e ícone compacto desta interação."
                slots={questionDraft.mediaSlots}
                guides={questionMediaGuides}
                assets={mediaPickerAssets}
                onChange={updateQuestionMediaSlot}
                compact
              />
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

    if (drawer.kind === 'quick-win') {
      return (
        <>
          <div className="admin-drawer-head">
            <div>
              <span className="admin-drawer-kicker">{drawer.mode === 'create' ? 'Novo quick win' : 'Editar quick win'}</span>
              <h3>{quickWinDraft.title || 'Configure o momentum card'}</h3>
              <p>ID automático: <strong>{displayId(quickWinDraft.id || quickWinIdPreview, 'quick-win')}</strong></p>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}><X size={18} /></button>
          </div>

          <div className="admin-drawer-body">
            <div className="drawer-form">
              <label>Título
                <input value={quickWinDraft.title} onChange={(event) => setQuickWinDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>Subtítulo
                <textarea value={quickWinDraft.subtitle} onChange={(event) => setQuickWinDraft((current) => ({ ...current, subtitle: event.target.value }))} />
              </label>
              <div className="scene-asset-inline-grid">
                <label>Categoria
                  <select value={quickWinDraft.category} onChange={(event) => setQuickWinDraft((current) => ({ ...current, category: event.target.value as QuickWinCategory }))}>
                    {quickWinCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label>Ícone
                  <select value={quickWinDraft.iconType} onChange={(event) => setQuickWinDraft((current) => ({ ...current, iconType: event.target.value as QuickWinItem['iconType'] }))}>
                    {quickWinIconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                  </select>
                </label>
              </div>
              <label>Ícone customizado (opcional)
                <input value={quickWinDraft.iconUrl ?? ''} onChange={(event) => setQuickWinDraft((current) => ({ ...current, iconUrl: event.target.value }))} placeholder="/Images/..." />
              </label>
              <div className="scene-asset-inline-grid">
                <label>Glow do ícone
                  <input value={quickWinDraft.iconGlowColor} onChange={(event) => setQuickWinDraft((current) => ({ ...current, iconGlowColor: event.target.value }))} placeholder="#9b6bff" />
                </label>
                <label>Accent color
                  <input value={quickWinDraft.accentColor} onChange={(event) => setQuickWinDraft((current) => ({ ...current, accentColor: event.target.value }))} placeholder="#9b6bff" />
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Overlay color
                  <input value={quickWinDraft.overlayColor} onChange={(event) => setQuickWinDraft((current) => ({ ...current, overlayColor: event.target.value }))} placeholder="rgba(76, 40, 154, 0.58)" />
                </label>
                <label>XP value
                  <input type="number" min="1" max="250" value={quickWinDraft.XPValue} onChange={(event) => setQuickWinDraft((current) => ({ ...current, XPValue: Number(event.target.value) || 1 }))} />
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Progress mode
                  <select value={quickWinDraft.progressMode} onChange={(event) => setQuickWinDraft((current) => ({ ...current, progressMode: event.target.value as QuickWinItem['progressMode'] }))}>
                    {quickWinProgressModeOptions.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                  </select>
                </label>
                <label>CTA type
                  <select value={quickWinDraft.CTAType} onChange={(event) => setQuickWinDraft((current) => ({ ...current, CTAType: event.target.value as QuickWinItem['CTAType'] }))}>
                    {quickWinCTATypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Progress current
                  <input type="number" min="0" value={quickWinDraft.progressCurrent} onChange={(event) => setQuickWinDraft((current) => ({ ...current, progressCurrent: Number(event.target.value) || 0 }))} />
                </label>
                <label>Progress total
                  <input type="number" min="1" value={quickWinDraft.progressTotal} onChange={(event) => setQuickWinDraft((current) => ({ ...current, progressTotal: Number(event.target.value) || 1 }))} />
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Timer seconds
                  <input type="number" min="0" max="3600" value={quickWinDraft.timerSeconds} onChange={(event) => setQuickWinDraft((current) => ({ ...current, timerSeconds: Number(event.target.value) || 0 }))} />
                </label>
                <label>CTA label
                  <input value={quickWinDraft.CTAButtonLabel} onChange={(event) => setQuickWinDraft((current) => ({ ...current, CTAButtonLabel: event.target.value }))} />
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Hover effect
                  <select value={quickWinDraft.hoverEffect} onChange={(event) => setQuickWinDraft((current) => ({ ...current, hoverEffect: event.target.value as QuickWinItem['hoverEffect'] }))}>
                    {quickWinHoverEffectOptions.map((effect) => <option key={effect} value={effect}>{effect}</option>)}
                  </select>
                </label>
                <label>Cinematic style
                  <select value={quickWinDraft.cinematicStyle} onChange={(event) => setQuickWinDraft((current) => ({ ...current, cinematicStyle: event.target.value as QuickWinItem['cinematicStyle'] }))}>
                    {quickWinCinematicStyleOptions.map((style) => <option key={style} value={style}>{style}</option>)}
                  </select>
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Motion preset
                  <select value={quickWinDraft.motionPreset} onChange={(event) => setQuickWinDraft((current) => ({ ...current, motionPreset: event.target.value as QuickWinItem['motionPreset'] }))}>
                    {quickWinMotionPresetOptions.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
                  </select>
                </label>
                <label>Ordem
                  <input type="number" min="1" value={quickWinDraft.order} onChange={(event) => setQuickWinDraft((current) => ({ ...current, order: Number(event.target.value) || 1 }))} />
                </label>
              </div>
              <label className="scene-asset-toggle">
                <span>Ativo</span>
                <input type="checkbox" checked={quickWinDraft.active} onChange={(event) => setQuickWinDraft((current) => ({ ...current, active: event.target.checked }))} />
              </label>
            </div>

            <div className="cms-quickwins-preview-wrap">
              <div className="media-slot-head">
                <strong>Preview cinematográfico</strong>
                <span>Glow, badge XP, timer e CTA são renderizados em tempo real usando o mesmo componente da home.</span>
              </div>
              <div className="cms-quickwins-preview">
                <QuickWinCard item={{ ...quickWinDraft, id: quickWinDraft.id || quickWinIdPreview }} />
              </div>
            </div>
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button className="admin-primary" type="button" disabled={saving || !quickWinDraft.title || !quickWinDraft.subtitle} onClick={saveQuickWinItem}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar quick win'}
            </button>
          </div>
        </>
      )
    }

    if (drawer.kind === 'scene-asset') {
      return (
        <>
          <div className="admin-drawer-head">
            <div>
              <span className="admin-drawer-kicker">{drawer.mode === 'create' ? 'Novo scene asset' : 'Editar scene asset'}</span>
              <h3>{sceneAssetDraft.title || 'Configure a cena narrativa'}</h3>
              <p>ID automático: <strong>{displayId(sceneAssetDraft.id || sceneAssetIdPreview, 'scene-asset')}</strong></p>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}><X size={18} /></button>
          </div>

          <div className="admin-drawer-body">
            <div className="drawer-form">
              <label>Título
                <input
                  value={sceneAssetDraft.title}
                  onChange={(event) =>
                    setSceneAssetDraft((current) => ({
                      ...current,
                      title: event.target.value,
                      slug: current.slug || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                    }))
                  }
                />
              </label>
              <label>Slug
                <input value={sceneAssetDraft.slug} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, slug: event.target.value }))} />
              </label>
              <label>Categoria
                <select value={sceneAssetDraft.category} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, category: event.target.value as SceneAssetCategory }))}>
                  {sceneAssetCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label>Capítulo
                <input value={sceneAssetDraft.chapter} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, chapter: event.target.value }))} />
              </label>
              <label>Missão
                <input value={sceneAssetDraft.mission} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, mission: event.target.value }))} />
              </label>
              <label>Tom emocional
                <input value={sceneAssetDraft.emotionalTone} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, emotionalTone: event.target.value }))} />
              </label>
              <label>Texto do poster da missão
                <textarea
                  value={sceneAssetDraft.missionCardDescription}
                  onChange={(event) => setSceneAssetDraft((current) => ({ ...current, missionCardDescription: event.target.value }))}
                  placeholder="Pedir ajuda e entender o próximo passo no aeroporto."
                />
              </label>
              <label>Contexto geral da missão
                <input
                  value={sceneAssetDraft.missionContextTitle}
                  onChange={(event) => setSceneAssetDraft((current) => ({ ...current, missionContextTitle: event.target.value }))}
                  placeholder="Airport Survival"
                />
              </label>
              <label>Texto contextual da missão
                <textarea
                  value={sceneAssetDraft.missionContextBody}
                  onChange={(event) => setSceneAssetDraft((current) => ({ ...current, missionContextBody: event.target.value }))}
                  placeholder="Explique o contexto que sustenta todas as cenas desta missão."
                />
              </label>
              <label>Objetivo emocional do Spark
                <input
                  value={sceneAssetDraft.missionObjectiveTitle}
                  onChange={(event) => setSceneAssetDraft((current) => ({ ...current, missionObjectiveTitle: event.target.value }))}
                  placeholder="Spark steps in when pressure rises."
                />
              </label>
              <label>Lembrete / expectativa da missão
                <textarea
                  value={sceneAssetDraft.missionObjectiveBody}
                  onChange={(event) => setSceneAssetDraft((current) => ({ ...current, missionObjectiveBody: event.target.value }))}
                  placeholder="Descreva o que se espera emocionalmente e pedagogicamente do aluno."
                />
              </label>
              <label>URL desktop
                <input value={sceneAssetDraft.imageUrl} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, imageUrl: event.target.value, imageUrlDesktop: event.target.value }))} placeholder="/Images/Airport/..." />
              </label>
              <label>URL mobile
                <input value={sceneAssetDraft.mobileImageUrl} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, mobileImageUrl: event.target.value, imageUrlMobile: event.target.value }))} placeholder="/Images/Airport/..." />
              </label>
              <label>Hero background URL
                <input
                  value={sceneAssetDraft.heroBackgroundImageUrl}
                  onChange={(event) =>
                    setSceneAssetDraft((current) => ({
                      ...current,
                      heroBackgroundImageUrl: event.target.value,
                      backgroundImageUrl: event.target.value,
                    }))
                  }
                  placeholder="/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png"
                />
              </label>
              <div className="scene-asset-inline-grid">
                <label>Aspect ratio recomendado
                  <input value={sceneAssetDraft.recommendedAspectRatio} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, recommendedAspectRatio: event.target.value }))} placeholder="9:16" />
                </label>
                <label>Focal point
                  <select value={sceneAssetDraft.focalPoint} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, focalPoint: event.target.value as SceneAssetFocalPoint }))}>
                    {sceneAssetFocalPointOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Focal point X
                  <input type="number" min="0" max="100" value={sceneAssetDraft.focalPointX} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, focalPointX: Number(event.target.value) || 0 }))} />
                </label>
                <label>Focal point Y
                  <input type="number" min="0" max="100" value={sceneAssetDraft.focalPointY} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, focalPointY: Number(event.target.value) || 0 }))} />
                </label>
              </div>
              <div className="scene-asset-slider-grid">
                <label>Overlay ({sceneAssetDraft.overlayOpacity}%)
                  <input type="range" min="0" max="100" value={sceneAssetDraft.overlayOpacity} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, overlayOpacity: Number(event.target.value) || 0, overlayIntensity: Number(event.target.value) || 0 }))} />
                </label>
                <label>Brightness ({sceneAssetDraft.brightness}%)
                  <input type="range" min="40" max="140" value={sceneAssetDraft.brightness} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, brightness: Number(event.target.value) }))} />
                </label>
                <label>Blur ({sceneAssetDraft.blurIntensity}px)
                  <input type="range" min="0" max="24" value={sceneAssetDraft.blurIntensity} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, blurIntensity: Number(event.target.value) }))} />
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Overlay color
                  <input value={sceneAssetDraft.overlayColor} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, overlayColor: event.target.value }))} placeholder="#090d24" />
                </label>
                <label>Cinematic style
                  <select value={sceneAssetDraft.cinematicStyle} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, cinematicStyle: event.target.value as SceneAssetOverlayStyle, uiOverlayStyle: event.target.value as SceneAssetOverlayStyle }))}>
                    {sceneAssetOverlayStyleOptions.map((style) => <option key={style} value={style}>{style}</option>)}
                  </select>
                </label>
              </div>
              <label className="scene-asset-toggle">
                <span>Featured hero</span>
                <input type="checkbox" checked={sceneAssetDraft.featuredHero} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, featuredHero: event.target.checked }))} />
              </label>
              <label className="scene-asset-toggle">
                <span>Mostrar na Hero</span>
                <input type="checkbox" checked={sceneAssetDraft.showInHero} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, showInHero: event.target.checked }))} />
              </label>
              <div className="scene-asset-inline-grid">
                <label>Ordem de progressão
                  <input type="number" min="1" value={sceneAssetDraft.progressionOrder} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, progressionOrder: Number(event.target.value) || 1 }))} />
                </label>
                <label className="scene-asset-toggle">
                  <span>Ativo</span>
                  <input type="checkbox" checked={sceneAssetDraft.active} onChange={(event) => setSceneAssetDraft((current) => ({ ...current, active: event.target.checked }))} />
                </label>
              </div>
            </div>

            <div className="scene-asset-safearea-panel">
              <div className="media-slot-head">
                <strong>Safe areas</strong>
                <span>Defina onde a Hero global pode respirar e onde o personagem principal não pode ser cortado quando esta missão assumir a atmosfera.</span>
              </div>
              <div className="scene-asset-safearea-grid">
                <SafeAreaFieldset
                  title="Hero global text block"
                  area={sceneAssetDraft.textSafeArea}
                  onChange={(field, value) => updateSceneAssetSafeArea('textSafeArea', field, value)}
                />
                <SafeAreaFieldset
                  title="Character safe area"
                  area={sceneAssetDraft.characterSafeArea}
                  onChange={(field, value) => updateSceneAssetSafeArea('characterSafeArea', field, value)}
                />
              </div>
            </div>

            <div className="scene-asset-preview-card">
              <div className="media-slot-head">
                <strong>Preview cinematográfico</strong>
                <span>O renderer aplica crop responsivo, overlay e áreas seguras enquanto a copy vem da configuração global da Hero.</span>
              </div>
              <SceneRenderer
                asset={{ ...sceneAssetDraft, id: sceneAssetDraft.id || sceneAssetIdPreview }}
                showGuides
                eyebrow={sceneAssetDraft.chapter || 'Chapter'}
                title={platformDraft.heroHeadline || 'Continue\nyour\nadventure'}
                subtitle={platformDraft.heroSubheadline || 'Entre, continue sua jornada e deixe o Spark manter o ritmo da sua aventura.'}
                badge={sceneAssetDraft.emotionalTone || 'emotional tone'}
                cta={sceneAssetDraft.missionCardDescription || 'Pedir ajuda e entender o próximo passo no aeroporto.'}
                footer={sceneAssetDraft.recommendedAspectRatio || '9:16'}
              />
            </div>
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button className="admin-primary" type="button" disabled={saving || !sceneAssetDraft.title || !(sceneAssetDraft.imageUrl || sceneAssetDraft.mobileImageUrl || sceneAssetDraft.heroBackgroundImageUrl)} onClick={saveSceneAssetItem}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar scene asset'}
            </button>
          </div>
        </>
      )
    }

    if (drawer.kind === 'runtime-scene') {
      const computedRuntimeSceneTotal = computeMissionRuntimeSceneTotal(missionRuntimeScenes, {
        ...missionRuntimeDraft,
        id: missionRuntimeDraft.id || missionRuntimeIdPreview,
      })
      const runtimePreviewScene = {
        ...missionRuntimeDraft,
        id: missionRuntimeDraft.id || missionRuntimeIdPreview,
        sceneTotal: computedRuntimeSceneTotal,
        backgroundImageUrl:
          currentMissionRuntimeAsset?.imageUrlDesktop ||
          currentMissionRuntimeAsset?.imageUrl ||
          currentMissionRuntimeAsset?.heroBackgroundImageUrl ||
          currentMissionRuntimeAsset?.backgroundImageUrl ||
          missionRuntimeDraft.backgroundImageUrl ||
          '',
        backgroundImageUrlMobile:
          currentMissionRuntimeAsset?.imageUrlMobile ||
          currentMissionRuntimeAsset?.imageUrlDesktop ||
          currentMissionRuntimeAsset?.imageUrl ||
          currentMissionRuntimeAsset?.mobileImageUrl ||
          currentMissionRuntimeAsset?.heroBackgroundImageUrl ||
          currentMissionRuntimeAsset?.backgroundImageUrl ||
          missionRuntimeDraft.backgroundImageUrlMobile ||
          missionRuntimeDraft.backgroundImageUrl ||
          '',
        missionTitle:
          missionRuntimeDraft.missionTitle ||
          currentMissionRuntimeAsset?.mission ||
          lessons.find((lesson) => lesson.id === missionRuntimeDraft.lessonId)?.missionTitle ||
          lessons.find((lesson) => lesson.id === missionRuntimeDraft.lessonId)?.title ||
          'Mission Runtime',
      }

      return (
        <>
          <div className="admin-drawer-head">
            <div>
              <span className="admin-drawer-kicker">{drawer.mode === 'create' ? 'Nova cena runtime' : 'Editar cena runtime'}</span>
              <h3>{missionRuntimeDraft.title || 'Modele a cena cinematográfica'}</h3>
              <p>ID automático: <strong>{displayId(missionRuntimeDraft.id || missionRuntimeIdPreview, 'runtime-scene')}</strong></p>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}><X size={18} /></button>
          </div>

          <div className="admin-drawer-body">
            <div className="drawer-form">
              <label>Título da cena
                <input
                  value={missionRuntimeDraft.title}
                  onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>Subtítulo
                <textarea
                  value={missionRuntimeDraft.subtitle}
                  onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, subtitle: event.target.value }))}
                />
              </label>
              <div className="scene-asset-inline-grid">
                <label>Scene Asset
                  <select
                    value={missionRuntimeDraft.sceneAssetId}
                    onChange={(event) =>
                      setMissionRuntimeDraft((current) => {
                        const nextAsset = sceneAssets.find((asset) => asset.id === event.target.value)
                        return {
                          ...current,
                          sceneAssetId: event.target.value,
                          missionTitle: current.missionTitle || nextAsset?.mission || '',
                        }
                      })
                    }
                  >
                    <option value="">Selecione um scene asset</option>
                    {missionRuntimeAssetOptions.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.title} • {asset.mission}</option>
                    ))}
                  </select>
                </label>
                <label>Lição vinculada
                  <select
                    value={missionRuntimeDraft.lessonId}
                    onChange={(event) =>
                      setMissionRuntimeDraft((current) => {
                        const nextLesson = lessons.find((lesson) => lesson.id === event.target.value)
                        return {
                          ...current,
                          lessonId: event.target.value,
                          missionTitle: current.missionTitle || nextLesson?.missionTitle || nextLesson?.title || '',
                        }
                      })
                    }
                  >
                    <option value="">Selecione uma lição</option>
                    {sortedLessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Missão
                  <input
                    value={missionRuntimeDraft.missionTitle}
                    onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, missionTitle: event.target.value }))}
                  />
                </label>
                <label>Capítulo
                  <input
                    value={missionRuntimeDraft.chapter}
                    onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, chapter: event.target.value }))}
                  />
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Scene number
                  <input
                    type="number"
                    min="1"
                    value={missionRuntimeDraft.sceneNumber}
                    onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, sceneNumber: Number(event.target.value) || 1 }))}
                  />
                </label>
                <label>Scene total
                  <input
                    type="number"
                    min="1"
                    value={computedRuntimeSceneTotal}
                    readOnly
                    aria-label="Scene total automático"
                  />
                </label>
              </div>
              <label>Character
                <input
                  value={missionRuntimeDraft.character}
                  onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, character: event.target.value }))}
                />
              </label>
              <label>Dialogue label
                <input
                  value={missionRuntimeDraft.dialogue}
                  onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, dialogue: event.target.value }))}
                  placeholder="Immigration Officer"
                />
              </label>
              <label>Pergunta
                <textarea
                  value={missionRuntimeDraft.question}
                  onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, question: event.target.value }))}
                />
              </label>
              <label>Tradução da pergunta
                <textarea
                  value={missionRuntimeDraft.questionTranslation}
                  onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, questionTranslation: event.target.value }))}
                />
              </label>
              <div className="runtime-editor-ownership-card">
                <div className="media-slot-head">
                  <strong>Mídia controlada pelo Scene Asset</strong>
                  <span>O Runtime define a pedagogia da cena. Background, crop, foco, overlay, brilho e composição visual devem ser ajustados em Scene Assets.</span>
                </div>
                <div className="runtime-editor-ownership-meta">
                  <span>Scene Asset vinculado</span>
                  <strong>{currentMissionRuntimeAsset?.title || 'Nenhum scene asset selecionado'}</strong>
                  {currentMissionRuntimeAsset && (
                    <button type="button" onClick={() => openSceneAssetEditor(currentMissionRuntimeAsset)}>
                      <Pencil size={14} />
                      Editar composição visual
                    </button>
                  )}
                </div>
              </div>
              <div className="scene-asset-inline-grid">
                <label>XP reward
                  <input
                    type="number"
                    min="0"
                    value={missionRuntimeDraft.xpReward}
                    onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, xpReward: Number(event.target.value) || 0 }))}
                  />
                </label>
              </div>
              <div className="scene-asset-inline-grid">
                <label>Feedback title
                  <input
                    value={missionRuntimeDraft.emotionalFeedbackTitle}
                    onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, emotionalFeedbackTitle: event.target.value }))}
                  />
                </label>
                <label>Feedback tone
                  <select
                    value={missionRuntimeDraft.emotionalFeedbackTone}
                    onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, emotionalFeedbackTone: event.target.value as MissionRuntimeFeedbackTone }))}
                  >
                    {missionRuntimeFeedbackToneOptions.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
                  </select>
                </label>
              </div>
              <label>Feedback body
                <textarea
                  value={missionRuntimeDraft.emotionalFeedbackBody}
                  onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, emotionalFeedbackBody: event.target.value }))}
                />
              </label>
              <div className="scene-asset-inline-grid">
                <label>Next scene ID
                  <input
                    value={missionRuntimeDraft.nextSceneId}
                    onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, nextSceneId: event.target.value }))}
                    placeholder="RT-00002"
                  />
                </label>
                <label>Order
                  <input
                    type="number"
                    min="1"
                    value={missionRuntimeDraft.order}
                    onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, order: Number(event.target.value) || 1 }))}
                  />
                </label>
              </div>
              <label className="scene-asset-toggle">
                <span>Ativo</span>
                <input
                  type="checkbox"
                  checked={missionRuntimeDraft.active}
                  onChange={(event) => setMissionRuntimeDraft((current) => ({ ...current, active: event.target.checked }))}
                />
              </label>
            </div>

            <div className="scene-asset-safearea-panel">
              <div className="media-slot-head">
                <strong>Answers & narrative decisions</strong>
                <span>Monte as escolhas do usuário com feedback e áudio. A resposta correta usa o XP da cena; respostas incorretas valem 0 XP.</span>
              </div>
              <div className="mission-runtime-answer-stack">
                {missionRuntimeDraft.answers.map((answer, index) => (
                  <article key={answer.id || `answer-${index + 1}`} className="mission-runtime-answer-card">
                    <div className="mission-runtime-answer-grid">
                      <label>Resposta
                        <input
                          value={answer.text}
                          onChange={(event) => updateMissionRuntimeAnswer(index, 'text', event.target.value)}
                        />
                      </label>
                      <label>Tradução
                        <input
                          value={answer.translation}
                          onChange={(event) => updateMissionRuntimeAnswer(index, 'translation', event.target.value)}
                        />
                      </label>
                    </div>
                    <div className="mission-runtime-answer-grid">
                      <label>Feedback title
                        <input
                          value={answer.feedbackTitle}
                          onChange={(event) => updateMissionRuntimeAnswer(index, 'feedbackTitle', event.target.value)}
                        />
                      </label>
                      <label>Feedback body
                        <input
                          value={answer.feedbackBody}
                          onChange={(event) => updateMissionRuntimeAnswer(index, 'feedbackBody', event.target.value)}
                        />
                      </label>
                    </div>
                    <div className="mission-runtime-answer-actions">
                      <label className="scene-asset-toggle">
                        <span>Resposta correta</span>
                        <input
                          type="checkbox"
                          checked={answer.isCorrect}
                          onChange={(event) => updateMissionRuntimeAnswer(index, 'isCorrect', event.target.checked)}
                        />
                      </label>
                      <button
                        className="admin-secondary"
                        type="button"
                        onClick={() => removeMissionRuntimeAnswer(index)}
                        disabled={missionRuntimeDraft.answers.length <= 1}
                      >
                        <Trash2 size={14} />
                        Remover resposta
                      </button>
                    </div>
                  </article>
                ))}
                <button className="admin-secondary" type="button" onClick={addMissionRuntimeAnswer}>
                  <Plus size={14} />
                  Adicionar resposta
                </button>
              </div>
            </div>

            <div className="scene-asset-preview-card">
              <div className="media-slot-head">
                <strong>Preview da cena runtime</strong>
                <span>O card abaixo mostra a leitura cinematográfica da cena que entrará no Mission Runtime ao clicar na missão.</span>
              </div>
              <div className="cms-quickwins-preview">
                <MissionRuntimeScenePreviewCard scene={runtimePreviewScene} missionTitle={runtimePreviewScene.missionTitle} />
              </div>
            </div>
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button
              className="admin-primary"
              type="button"
              disabled={saving || !missionRuntimeDraft.title || !missionRuntimeDraft.sceneAssetId || !missionRuntimeDraft.question}
              onClick={saveMissionRuntimeItem}
            >
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar cena runtime'}
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
                <button className="cms-quick-card" type="button" onClick={() => setActiveSection('ai-mission-studio')}>
                  <Sparkles size={18} />
                  <strong>AI Mission Studio</strong>
                  <span>Gere uma cena por Learning Intent e valide no Runtime real.</span>
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

        {activeSection === 'ai-mission-studio' && (
          <section className="cms-panel-stack ai-mission-studio">
            <section className="cms-summary-grid">
              <article className="cms-stat-card">
                <span>Unidade de geração</span>
                <strong>1 Scene</strong>
                <small>sem gerar missão completa</small>
              </article>
              <article className="cms-stat-card">
                <span>Orientação</span>
                <strong>Intent</strong>
                <small>pedagogia + confiança</small>
              </article>
              <article className="cms-stat-card">
                <span>Preview</span>
                <strong>Runtime real</strong>
                <small>sem mockup de JSON</small>
              </article>
              <article className="cms-stat-card">
                <span>Destino</span>
                <strong>Mission Runtime</strong>
                <small>Approve & Save controlado</small>
              </article>
            </section>

            <section className="cms-panel ai-mission-director-panel">
              <div className="ai-mission-director-copy">
                <span className="admin-kicker">Mission Director</span>
                <h2>Construa o brief como uma conversa editorial.</h2>
                <p>{aiMissionDirectorNextQuestion}</p>
              </div>
              <div className="ai-mission-director-status">
                <div className="ai-mission-director-score">
                  <strong>{aiMissionBriefCompletion}%</strong>
                  <span>brief pronto</span>
                </div>
                <button className="admin-primary" type="button" onClick={applyAiMissionDirectorSuggestion}>
                  <Sparkles size={16} />
                  Sugerir brief
                </button>
              </div>
              <div className="ai-mission-director-presets">
                {aiMissionDirectorPresets.map((preset) => (
                  <button key={preset.id} type="button" onClick={() => applyAiMissionDirectorPreset(preset.patch)}>
                    <strong>{preset.title}</strong>
                    <span>{preset.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="cms-panel ai-studio-brief-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Brief pedagógico + emocional</h2>
                  <p className="admin-helper">Gere apenas uma Scene completa. O objetivo é validar Learning Intent → Draft → Preview → Runtime.</p>
                </div>
                <div className="cms-content-actions">
                  <button className="admin-secondary" type="button" onClick={() => setAiMissionBrief(defaultAiMissionStudioBrief)}>
                    <RefreshCw size={14} />
                    Resetar brief
                  </button>
                  <button className="admin-primary" type="button" disabled={aiMissionGenerating} onClick={generateAiMissionDraft}>
                    <Sparkles size={16} />
                    {aiMissionGenerating ? 'Gerando...' : 'Gerar Scene Draft'}
                  </button>
                </div>
              </div>

              <div className="ai-studio-grid">
                <article className="ai-studio-card">
                  <p className="admin-kicker">Contexto</p>
                  <div className="drawer-form">
                    <label>World
                      <input value={aiMissionBrief.world} onChange={(event) => updateAiMissionBrief('world', event.target.value)} />
                    </label>
                    <label>Mission
                      <input value={aiMissionBrief.mission} onChange={(event) => updateAiMissionBrief('mission', event.target.value)} />
                    </label>
                    <label>Scene Asset
                      <select value={aiMissionBrief.sceneAssetId} onChange={(event) => updateAiMissionBrief('sceneAssetId', event.target.value)}>
                        <option value="">Selecionar asset visual</option>
                        {missionRuntimeAssetOptions.map((asset) => (
                          <option key={asset.id} value={asset.id}>{asset.title} • {asset.category}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>

                <article className="ai-studio-card">
                  <p className="admin-kicker">Pedagogical Core</p>
                  <div className="drawer-form">
                    <div className="drawer-grid-two">
                      <label>Level
                        <select value={aiMissionBrief.level} onChange={(event) => updateAiMissionBrief('level', event.target.value as AiMissionStudioLevel)}>
                          {aiMissionStudioLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                      </label>
                      <label>Skill
                        <select value={aiMissionBrief.skill} onChange={(event) => updateAiMissionBrief('skill', event.target.value as AiMissionStudioSkill)}>
                          {aiMissionStudioSkills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                        </select>
                      </label>
                    </div>
                    <label>Grammar Target
                      <input value={aiMissionBrief.grammarTarget} onChange={(event) => updateAiMissionBrief('grammarTarget', event.target.value)} />
                    </label>
                    <label>Learning Outcome
                      <textarea value={aiMissionBrief.learningOutcome} onChange={(event) => updateAiMissionBrief('learningOutcome', event.target.value)} />
                    </label>
                    <label>Learning Intent
                      <textarea value={aiMissionBrief.learningIntent} onChange={(event) => updateAiMissionBrief('learningIntent', event.target.value)} />
                    </label>
                  </div>
                </article>

                <article className="ai-studio-card">
                  <p className="admin-kicker">Emotional Design</p>
                  <div className="drawer-form">
                    <label>Confidence Goal
                      <textarea value={aiMissionBrief.confidenceGoal} onChange={(event) => updateAiMissionBrief('confidenceGoal', event.target.value)} />
                    </label>
                    <div className="drawer-grid-two">
                      <label>Pressure Level
                        <select value={aiMissionBrief.pressureLevel} onChange={(event) => updateAiMissionBrief('pressureLevel', event.target.value as AiMissionStudioImpactLevel)}>
                          {aiMissionStudioImpactLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                      </label>
                      <label>Emotional Tone
                        <input value={aiMissionBrief.emotionalTone} onChange={(event) => updateAiMissionBrief('emotionalTone', event.target.value)} />
                      </label>
                    </div>
                    <label>Failure Mode
                      <textarea value={aiMissionBrief.failureMode} onChange={(event) => updateAiMissionBrief('failureMode', event.target.value)} />
                    </label>
                    <label>Recovery Style
                      <input value={aiMissionBrief.recoveryStyle} onChange={(event) => updateAiMissionBrief('recoveryStyle', event.target.value)} />
                    </label>
                  </div>
                </article>

                <article className="ai-studio-card">
                  <p className="admin-kicker">Real World</p>
                  <div className="drawer-form">
                    <label>Scenario
                      <input value={aiMissionBrief.scenario} onChange={(event) => updateAiMissionBrief('scenario', event.target.value)} />
                    </label>
                    <label>Real Life Transfer
                      <textarea value={aiMissionBrief.realLifeTransfer} onChange={(event) => updateAiMissionBrief('realLifeTransfer', event.target.value)} />
                    </label>
                  </div>
                </article>
              </div>
            </section>

            {aiMissionDraft && (
              <>
                <section className="cms-panel ai-quality-panel">
                  <div className="cms-panel-head">
                    <div>
                      <h2>Quality Panel</h2>
                      <p className="admin-helper">Métricas linguísticas e impacto de confiança antes da aprovação editorial.</p>
                    </div>
                    <div className={`cms-header-pill ${aiMissionDraft.validation.valid ? 'is-success' : 'is-warning'}`}>
                      <CheckCircle2 size={16} />
                      {aiMissionDraft.validation.valid ? 'Schema válido' : 'Revisão necessária'}
                    </div>
                  </div>

                  <div className="ai-quality-columns">
                    <article className="ai-quality-column">
                      <p className="admin-kicker">Linguistic Quality</p>
                      <div className="ai-quality-grid">
                        {Object.values(aiMissionDraft.quality.linguisticQuality).map((metric) => (
                          <div key={metric.label} className="ai-quality-metric">
                            <span>{metric.label}</span>
                            <strong>{metric.value}</strong>
                            <p>{metric.why}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                    <article className="ai-quality-column">
                      <p className="admin-kicker">Confidence Impact</p>
                      <div className="ai-quality-grid">
                        {Object.values(aiMissionDraft.quality.confidenceImpact).map((metric) => (
                          <div key={metric.label} className="ai-quality-metric">
                            <span>{metric.label}</span>
                            <strong>{metric.value}</strong>
                            <p>{metric.why}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  <div className="ai-validation-strip">
                    <strong>{aiMissionDraft.source === 'ai' ? 'IA provider' : 'Fallback local'}</strong>
                    <span>{missionRuntimePublicationLabels[aiMissionDraft.runtimeScene.publicationStatus]}</span>
                    <span>{aiMissionDraft.generation.provider} • {aiMissionDraft.generation.model}</span>
                    <span>Prompt {aiMissionDraft.generation.promptVersion}</span>
                    {aiMissionDraft.validation.issues.length
                      ? aiMissionDraft.validation.issues.map((issue) => <span key={issue}>{issue}</span>)
                      : <span>Scene Draft compatível com o Mission Runtime atual.</span>}
                  </div>
                </section>

                <section className="cms-panel ai-runtime-preview-panel">
                  <div className="cms-panel-head">
                    <div>
                      <h2>Runtime Preview</h2>
                      <p className="admin-helper">Preview renderizado com o mesmo MissionRuntime usado em produção.</p>
                    </div>
                    <div className="cms-content-actions">
                      <button className="admin-secondary" type="button" onClick={() => openMissionRuntimeEditor(aiMissionDraft.runtimeScene)}>
                        <Pencil size={14} />
                        Ajustar no editor
                      </button>
                      <button className="admin-secondary danger" type="button" onClick={deleteAiMissionDraft}>
                        <Trash2 size={14} />
                        Excluir draft
                      </button>
                      <button className="admin-secondary" type="button" disabled={!aiMissionDraft.validation.valid || saving} onClick={saveAiMissionDraft}>
                        <Save size={16} />
                        Save Draft
                      </button>
                      <button className="admin-primary" type="button" disabled={!aiMissionDraft.validation.valid || saving} onClick={publishAiMissionDraft}>
                        <CheckCircle2 size={16} />
                        Publish
                      </button>
                    </div>
                  </div>

                  <div className="ai-runtime-preview-shell">
                    {aiMissionPreviewMission && (
                      <MissionRuntime
                        mission={aiMissionPreviewMission}
                        scenes={[aiMissionDraft.runtimeScene]}
                        learnerLevel={1}
                        disableResponseTimer
                        streakDays={1}
                        totalXp={130}
                        avatarUrl={null}
                        onBack={() => undefined}
                      />
                    )}
                  </div>
                </section>
              </>
            )}
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
                    <label>Modo pedagógico
                      <select value={aiControl.pedagogicalMode} onChange={(event) => setAiControl((current) => ({ ...current, pedagogicalMode: event.target.value as AIControlConfig['pedagogicalMode'] }))}>
                        {pedagogicalModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                      </select>
                    </label>
                    <button className="admin-secondary cms-inline-button" type="button" onClick={() => setShowAdvancedAiSettings((current) => !current)}>
                      <SlidersHorizontal size={14} />
                      {showAdvancedAiSettings ? 'Ocultar modo avançado' : 'Abrir modo avançado'}
                    </button>
                    {showAdvancedAiSettings && (
                      <div className="cms-advanced-settings">
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
                    )}
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
                    <label className="cms-toggle-row"><input type="checkbox" checked={memoryConfig.trackSpeakingConfidence} onChange={(event) => setMemoryConfig((current) => ({ ...current, trackSpeakingConfidence: event.target.checked }))} />Rastrear medo de speaking</label>
                    <label className="cms-toggle-row"><input type="checkbox" checked={memoryConfig.trackListeningAvoidance} onChange={(event) => setMemoryConfig((current) => ({ ...current, trackListeningAvoidance: event.target.checked }))} />Rastrear abandono de listening</label>
                    <label className="cms-toggle-row"><input type="checkbox" checked={memoryConfig.trackResponseLatency} onChange={(event) => setMemoryConfig((current) => ({ ...current, trackResponseLatency: event.target.checked }))} />Rastrear tempo de resposta</label>
                    <label className="cms-toggle-row"><input type="checkbox" checked={memoryConfig.trackConfidenceSignals} onChange={(event) => setMemoryConfig((current) => ({ ...current, trackConfidenceSignals: event.target.checked }))} />Rastrear sinais de confiança</label>
                    <label>Janela de memória (dias)
                      <input type="number" value={memoryConfig.historyDepthDays} onChange={(event) => setMemoryConfig((current) => ({ ...current, historyDepthDays: Number(event.target.value) || 7 }))} />
                    </label>
                    <label>Continuidade narrativa
                      <select value={memoryConfig.continuityMode} onChange={(event) => setMemoryConfig((current) => ({ ...current, continuityMode: event.target.value as MemoryEngineConfig['continuityMode'] }))}>
                        <option value="linked">linked</option>
                        <option value="episodic">episodic</option>
                      </select>
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
                        <div className="cms-draft-meta-grid">
                          <div><strong>Tensão</strong><span>{aiPreviewDraft.tensionLabel}</span></div>
                          <div><strong>Objetivo emocional</strong><span>{aiPreviewDraft.emotionalGoal}</span></div>
                          <div><strong>Confiança alvo</strong><span>{aiPreviewDraft.confidenceTarget}</span></div>
                          <div><strong>Próxima cena</strong><span>{aiPreviewDraft.continuity.nextScene}</span></div>
                        </div>
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
                        <div><strong>Tensão</strong><span>{selectedDraft.tensionLabel}</span></div>
                        <div><strong>Objetivo emocional</strong><span>{selectedDraft.emotionalGoal}</span></div>
                        <div><strong>Cena atual</strong><span>{selectedDraft.continuity.currentScene}</span></div>
                        <div><strong>Próxima cena</strong><span>{selectedDraft.continuity.nextScene}</span></div>
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

        {activeSection === 'quick-wins' && (
          <section className="cms-panel-stack">
            <section className="cms-summary-grid">
              <article className="cms-stat-card">
                <span>Quick wins</span>
                <strong>{quickWins.length}</strong>
                <small>cards configurados no sistema próprio</small>
              </article>
              <article className="cms-stat-card">
                <span>Ativos</span>
                <strong>{quickWins.filter((item) => item.active).length}</strong>
                <small>visíveis na home quando habilitados</small>
              </article>
              <article className="cms-stat-card">
                <span>Timer mode</span>
                <strong>{quickWins.filter((item) => item.progressMode === 'timer').length}</strong>
                <small>desafios com countdown cinematográfico</small>
              </article>
              <article className="cms-stat-card">
                <span>Progress mode</span>
                <strong>{quickWins.filter((item) => item.progressMode === 'progress').length}</strong>
                <small>desafios com barra de progresso</small>
              </article>
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Header de Quick Wins</h2>
                  <p className="admin-helper">Edite o título, subtítulo, ícone de abertura e o CTA da faixa exatamente como ela aparece na home.</p>
                </div>
                <button className="admin-primary" type="button" disabled={saving} onClick={saveQuickWinsSettings}>
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar header'}
                </button>
              </div>

              <div className="cms-quickwins-config-grid">
                <div className="drawer-form">
                  <label>Título
                    <input value={quickWinsConfigDraft.title} onChange={(event) => setQuickWinsConfigDraft((current) => ({ ...current, title: event.target.value }))} />
                  </label>
                  <label>Subtítulo
                    <textarea value={quickWinsConfigDraft.subtitle} onChange={(event) => setQuickWinsConfigDraft((current) => ({ ...current, subtitle: event.target.value }))} />
                  </label>
                  <div className="scene-asset-inline-grid">
                    <label>Ícone do header
                      <select value={quickWinsConfigDraft.headerIconType} onChange={(event) => setQuickWinsConfigDraft((current) => ({ ...current, headerIconType: event.target.value as QuickWinsConfig['headerIconType'] }))}>
                        {quickWinHeaderIconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                      </select>
                    </label>
                    <label>CTA "Ver todas"
                      <input value={quickWinsConfigDraft.viewAllLabel} onChange={(event) => setQuickWinsConfigDraft((current) => ({ ...current, viewAllLabel: event.target.value }))} />
                    </label>
                  </div>
                </div>

                <div className="cms-quickwins-preview-wrap">
                  <div className="media-slot-head">
                    <strong>Preview da faixa</strong>
                    <span>Visual da home com glow, spacing, badge de XP e CTA circular já aplicados.</span>
                  </div>
                  <QuickWinsSection
                    config={quickWinsConfigDraft}
                    items={filteredQuickWins.length ? filteredQuickWins.slice(0, 5) : defaultQuickWinsCatalog}
                    cinematicStyle="violet"
                    preview
                  />
                </div>
              </div>
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Quick Wins</h2>
                  <p className="admin-helper">Gerencie um sistema próprio de micro desafios com ícones contextuais, timer, progresso e preview em tempo real.</p>
                </div>
                <div className="cms-content-actions">
                  <button
                    type="button"
                    onClick={() =>
                      runAdminTask(
                        'Criando Quick Wins base...',
                        'Quick Wins base populados no Firestore.',
                        async () => {
                          await seedDefaultQuickWins()
                          await refreshQuickWins()
                        },
                      )
                    }
                  >
                    <Sparkles size={14} />
                    Popular base ({defaultQuickWinsCatalog.length})
                  </button>
                  <button className="admin-primary" type="button" onClick={() => openQuickWinEditor()}>
                    <Plus size={16} />
                    Novo quick win
                  </button>
                </div>
              </div>

              <div className="cms-filter-row cms-filter-row-scene-assets">
                <div className="cms-search">
                  <Search size={16} />
                  <input
                    value={quickWinSearch}
                    onChange={(event) => setQuickWinSearch(event.target.value)}
                    placeholder="Buscar por título, subtítulo, categoria ou ID"
                  />
                </div>
                <select value={quickWinCategoryFilter} onChange={(event) => setQuickWinCategoryFilter(event.target.value as QuickWinCategory | 'all')}>
                  <option value="all">Todas categorias</option>
                  {quickWinCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <select value={quickWinStatus} onChange={(event) => setQuickWinStatus(event.target.value as QuickWinStatusFilter)}>
                  <option value="all">Todos status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>

              {!filteredQuickWins.length && quickWinsLoaded ? (
                <div className="cms-empty-panel cms-empty-panel-inline">
                  <Zap size={24} />
                  <h2>Nenhum quick win ainda</h2>
                  <p>Popule a base do sistema ou crie manualmente cards com badge XP, timer e glow contextual.</p>
                </div>
              ) : (
                <div className="cms-quickwins-grid">
                  {filteredQuickWins.map((item) => (
                    <article key={item.id} className="cms-quickwins-card">
                      <div className="cms-quickwins-card-preview">
                        <QuickWinCard item={item} />
                      </div>
                      <div className="cms-quickwins-card-copy">
                        <div>
                          <strong>{item.title}</strong>
                          <span>{displayId(item.id, 'quick-win')} • {item.category} • ordem {item.order}</span>
                        </div>
                        <p>{item.subtitle}</p>
                        <div className="scene-asset-card-meta">
                          <span>{item.iconType}</span>
                          <span>{item.progressMode}</span>
                          <span>{item.cinematicStyle}</span>
                          <span>{item.active ? 'ativo' : 'inativo'}</span>
                        </div>
                      </div>
                      <div className="cms-content-actions">
                        <button type="button" onClick={() => openQuickWinEditor(item)}><Pencil size={14} />Editar</button>
                        <button type="button" className="danger" onClick={() => removeQuickWinItem(item)}><Trash2 size={14} />Excluir</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {activeSection === 'scene-assets' && (
          <section className="cms-panel-stack">
            <section className="cms-summary-grid">
              <article className="cms-stat-card">
                <span>Scene assets</span>
                <strong>{sceneAssets.length}</strong>
                <small>ativos no backend visual</small>
              </article>
              <article className="cms-stat-card">
                <span>Assets ativos</span>
                <strong>{sceneAssets.filter((asset) => asset.active).length}</strong>
                <small>prontos para render cinematográfico</small>
              </article>
              <article className="cms-stat-card">
                <span>Categorias</span>
                <strong>{sceneAssetCategories.length}</strong>
                <small>airport, coffee, park e geral</small>
              </article>
              <article className="cms-stat-card">
                <span>Preview mode</span>
                <strong>Safe area</strong>
                <small>texto e personagem preservados</small>
              </article>
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Scene Assets</h2>
                  <p className="admin-helper">Cadastre e ajuste fundos narrativos com focal point, overlay e áreas seguras para texto e personagem.</p>
                </div>
                <div className="cms-content-actions">
                  <button
                    type="button"
                    onClick={() =>
                      runAdminTask(
                        'Criando assets base...',
                        'Assets base populados no Firestore.',
                        async () => {
                          await seedDefaultSceneAssets()
                          await refreshSceneAssets()
                        },
                      )
                    }
                  >
                    <Sparkles size={14} />
                    Popular base ({defaultSceneAssetsCatalog.length})
                  </button>
                  <button className="admin-primary" type="button" onClick={() => openSceneAssetEditor()}>
                    <Plus size={16} />
                    Novo scene asset
                  </button>
                </div>
              </div>

              <div className="cms-filter-row cms-filter-row-scene-assets">
                <div className="cms-search">
                  <Search size={16} />
                  <input
                    value={sceneAssetSearch}
                    onChange={(event) => setSceneAssetSearch(event.target.value)}
                    placeholder="Buscar por título, slug, missão ou capítulo"
                  />
                </div>
                <select value={sceneAssetCategoryFilter} onChange={(event) => setSceneAssetCategoryFilter(event.target.value as SceneAssetCategory | 'all')}>
                  <option value="all">Todas categorias</option>
                  {sceneAssetCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <select value={sceneAssetStatus} onChange={(event) => setSceneAssetStatus(event.target.value as SceneAssetStatusFilter)}>
                  <option value="all">Todos status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>

              {!filteredSceneAssets.length && sceneAssetsLoaded ? (
                <div className="cms-empty-panel cms-empty-panel-inline">
                  <Image size={24} />
                  <h2>Nenhum scene asset ainda</h2>
                  <p>Comece populando os assets base do SparkLingo ou crie um asset cinematográfico manualmente por URL.</p>
                </div>
              ) : (
                <div className="scene-asset-grid">
                  {filteredSceneAssets.map((asset) => (
                    <article key={asset.id} className="scene-asset-card">
                      <SceneRenderer
                        asset={asset}
                        eyebrow={asset.chapter}
                        title={asset.title}
                        subtitle={asset.mission}
                        badge={asset.emotionalTone}
                        footer={`${displayId(asset.id, 'scene-asset')} • ${asset.recommendedAspectRatio}`}
                        className="scene-asset-card-renderer"
                      />
                      <div className="scene-asset-card-copy">
                        <div>
                          <strong>{asset.title}</strong>
                          <span>{displayId(asset.id, 'scene-asset')} • {asset.category} • ordem {asset.progressionOrder}</span>
                        </div>
                        <p>{asset.mission}</p>
                        <div className="scene-asset-card-meta">
                          <span>{Math.round(asset.focalPointX)}% / {Math.round(asset.focalPointY)}%</span>
                          <span>{asset.cinematicStyle}</span>
                          {asset.featuredHero && <span>featured</span>}
                          <span>{asset.active ? 'ativo' : 'inativo'}</span>
                        </div>
                      </div>
                      <div className="cms-content-actions">
                        <button type="button" onClick={() => openSceneAssetEditor(asset)}><Pencil size={14} />Editar</button>
                        <button type="button" className="danger" onClick={() => removeSceneAssetItem(asset)}><Trash2 size={14} />Excluir</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {activeSection === 'mission-runtime' && (
          <section className="cms-panel-stack">
            <section className="cms-summary-grid">
              <article className="cms-stat-card">
                <span>Cenas runtime</span>
                <strong>{missionRuntimeScenes.length}</strong>
                <small>cenas cinematográficas cadastradas</small>
              </article>
              <article className="cms-stat-card">
                <span>Cenas ativas</span>
                <strong>{missionRuntimeScenes.filter((scene) => scene.active).length}</strong>
                <small>visíveis ao abrir uma missão</small>
              </article>
              <article className="cms-stat-card">
                <span>Missões ligadas</span>
                <strong>{new Set(missionRuntimeScenes.map((scene) => scene.sceneAssetId).filter(Boolean)).size}</strong>
                <small>scene assets com runtime conectado</small>
              </article>
              <article className="cms-stat-card">
                <span>Respostas</span>
                <strong>{missionRuntimeScenes.reduce((total, scene) => total + scene.answers.length, 0)}</strong>
                <small>decisões narrativas configuradas</small>
              </article>
            </section>

            <section className="cms-panel">
              <div className="cms-panel-head">
                <div>
                  <h2>Mission Runtime</h2>
                  <p className="admin-helper">Cadastre cenas, diálogos, perguntas, respostas, feedback emocional e progressão que entram quando o usuário abre uma missão.</p>
                </div>
                <div className="cms-content-actions">
                  <button
                    type="button"
                    onClick={() =>
                      runAdminTask(
                        'Criando cenas runtime base...',
                        'Cenas base do Mission Runtime populadas no Firestore.',
                        async () => {
                          await seedDefaultMissionRuntimeScenes()
                          await refreshMissionRuntime()
                        },
                      )
                    }
                  >
                    <Sparkles size={14} />
                    Popular base ({defaultMissionRuntimeScenes.length})
                  </button>
                  <button className="admin-primary" type="button" onClick={() => openMissionRuntimeEditor()}>
                    <Plus size={16} />
                    Nova cena runtime
                  </button>
                </div>
              </div>

              <div className="cms-filter-row cms-filter-row-scene-assets">
                <div className="cms-search">
                  <Search size={16} />
                  <input
                    value={missionRuntimeSearch}
                    onChange={(event) => setMissionRuntimeSearch(event.target.value)}
                    placeholder="Buscar por título, personagem, missão ou ID"
                  />
                </div>
                <select value={missionRuntimeAssetFilter} onChange={(event) => setMissionRuntimeAssetFilter(event.target.value)}>
                  <option value="all">Todos os scene assets</option>
                  {missionRuntimeAssetOptions.map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.title}</option>
                  ))}
                </select>
                <select value={missionRuntimeStatus} onChange={(event) => setMissionRuntimeStatus(event.target.value as MissionRuntimeStatusFilter)}>
                  <option value="all">Todos status</option>
                  <option value="published">Publicadas</option>
                  <option value="draft">Drafts</option>
                  <option value="archived">Arquivadas</option>
                  <option value="active">Ativas</option>
                  <option value="inactive">Inativas</option>
                </select>
              </div>

              <div className="cms-view-toolbar">
                <span>{filteredMissionRuntimeScenes.length} cenas encontradas</span>
                <div className="cms-view-toggle" aria-label="Alternar visualização do Mission Runtime">
                  <button
                    type="button"
                    className={missionRuntimeViewMode === 'list' ? 'is-active' : ''}
                    onClick={() => setMissionRuntimeViewMode('list')}
                    aria-pressed={missionRuntimeViewMode === 'list'}
                  >
                    <List size={15} />
                    Lista
                  </button>
                  <button
                    type="button"
                    className={missionRuntimeViewMode === 'grid-2' ? 'is-active' : ''}
                    onClick={() => setMissionRuntimeViewMode('grid-2')}
                    aria-pressed={missionRuntimeViewMode === 'grid-2'}
                  >
                    <Columns2 size={15} />
                    2 colunas
                  </button>
                  <button
                    type="button"
                    className={missionRuntimeViewMode === 'grid-4' ? 'is-active' : ''}
                    onClick={() => setMissionRuntimeViewMode('grid-4')}
                    aria-pressed={missionRuntimeViewMode === 'grid-4'}
                  >
                    <Grid3X3 size={15} />
                    4 colunas
                  </button>
                </div>
              </div>

              {!filteredMissionRuntimeScenes.length && missionRuntimeLoaded ? (
                <div className="cms-empty-panel cms-empty-panel-inline">
                  <Clapperboard size={24} />
                  <h2>Nenhuma cena runtime ainda</h2>
                  <p>Popule a base do Mission Runtime ou crie manualmente a primeira cena cinematográfica com diálogos, respostas e recompensa.</p>
                </div>
              ) : (
                <div className={`mission-runtime-scene-grid is-${missionRuntimeViewMode}`}>
                  {filteredMissionRuntimeScenes.map((scene) => {
                    const previewAsset = sceneAssets.find((asset) => asset.id === scene.sceneAssetId)
                    const previewScene = {
                      ...scene,
                      backgroundImageUrl:
                        previewAsset?.imageUrlDesktop ||
                        previewAsset?.imageUrl ||
                        previewAsset?.heroBackgroundImageUrl ||
                        scene.backgroundImageUrl ||
                        '',
                      backgroundImageUrlMobile:
                        previewAsset?.imageUrlMobile ||
                        previewAsset?.imageUrlDesktop ||
                        previewAsset?.imageUrl ||
                        previewAsset?.heroBackgroundImageUrl ||
                        scene.backgroundImageUrlMobile ||
                        scene.backgroundImageUrl ||
                        '',
                    }

                    return (
                    <article key={scene.id} className="scene-asset-card mission-runtime-scene-card">
                      <div className="cms-quickwins-card-preview">
                        <MissionRuntimeScenePreviewCard scene={previewScene} missionTitle={scene.missionTitle} />
                      </div>
                      <div className="scene-asset-card-copy">
                        <div>
                          <strong>{scene.title}</strong>
                          <span>{displayId(scene.id, 'runtime-scene')} • {scene.chapter} • ordem {scene.order}</span>
                        </div>
                        <p>{scene.question}</p>
                        <div className="scene-asset-card-meta">
                          <span>{scene.character}</span>
                          <span>{scene.sceneNumber}/{computeMissionRuntimeSceneTotal(missionRuntimeScenes, scene)}</span>
                          <span>{scene.answers.length} respostas</span>
                          <span className={`runtime-publication-badge is-${scene.publicationStatus}`}>
                            {missionRuntimePublicationLabels[scene.publicationStatus]}
                          </span>
                          <span>{scene.active ? 'ativo' : 'inativo'}</span>
                        </div>
                      </div>
                      <div className="cms-content-actions">
                        {scene.publicationStatus !== 'published' && (
                          <button type="button" onClick={() => publishMissionRuntimeItem(scene)}><CheckCircle2 size={14} />Publish</button>
                        )}
                        {scene.publicationStatus !== 'archived' && (
                          <button type="button" onClick={() => archiveMissionRuntimeItem(scene)}><Archive size={14} />Archive</button>
                        )}
                        <button type="button" onClick={() => openMissionRuntimeEditor(scene)}><Pencil size={14} />Editar</button>
                        <button type="button" className="danger" onClick={() => removeMissionRuntimeItem(scene)}><Trash2 size={14} />Excluir</button>
                      </div>
                    </article>
                    )})}
                </div>
              )}
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
              <div className="media-slot-stack">
                <div className="media-slot-head">
                  <strong>Media Slot Architecture</strong>
                  <span>Use os mesmos guides nos drawers para manter crop, safe area e prioridade mobile consistentes.</span>
                </div>
                <div className="media-slot-grid media-slot-grid-guide">
                  {[...lessonMediaGuides.slice(0, 3), ...quizMediaGuides.slice(0, 2), ...questionMediaGuides.slice(0, 1)].map((guide) => (
                    <article key={guide.key} className="media-slot-card media-slot-card-guide">
                      <div className="media-slot-meta">
                        <strong>{guide.label}</strong>
                        <span>{guide.resolution} • {guide.ratio}</span>
                        <small>{guide.safeArea}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
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
                  <p className="admin-helper">Ajuste o runtime da home, o Hero Experience global e popule o catálogo base sem mexer no código.</p>
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
                  <div className="media-slot-head">
                    <strong>Hero Experience</strong>
                    <span>Esses campos controlam a camada emocional fixa da Hero. O carousel de missões altera apenas a atmosfera e os posters.</span>
                  </div>
                  <div className="drawer-form">
                    <label>Hero headline
                      <input value={platformDraft.heroHeadline} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroHeadline: event.target.value }))} />
                    </label>
                    <label>Hero subheadline
                      <textarea value={platformDraft.heroSubheadline} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroSubheadline: event.target.value }))} />
                    </label>
                    <div className="scene-asset-inline-grid">
                      <label>Headline color
                        <input value={platformDraft.heroHeadlineColor} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroHeadlineColor: event.target.value }))} placeholder="#ffffff" />
                      </label>
                      <label>Subheadline color
                        <input value={platformDraft.heroSubheadlineColor} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroSubheadlineColor: event.target.value }))} placeholder="rgba(240, 240, 255, 0.9)" />
                      </label>
                    </div>
                    <div className="scene-asset-inline-grid">
                      <label>Headline size
                        <input type="number" min="72" max="180" value={platformDraft.heroHeadlineSize} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroHeadlineSize: Number(event.target.value) || 72 }))} />
                      </label>
                      <label>Subheadline size
                        <input type="number" min="14" max="36" value={platformDraft.heroSubheadlineSize} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroSubheadlineSize: Number(event.target.value) || 14 }))} />
                      </label>
                    </div>
                    <label>Hero CTA
                      <input value={platformDraft.heroCTA} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroCTA: event.target.value }))} />
                    </label>
                    <label>Ambient background URL
                      <input value={platformDraft.heroAmbientBackgroundUrl} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroAmbientBackgroundUrl: event.target.value }))} placeholder="/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png" />
                    </label>
                    <label>Hero overlay strength ({platformDraft.heroOverlayStrength}%)
                      <input type="range" min="0" max="100" value={platformDraft.heroOverlayStrength} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroOverlayStrength: Number(event.target.value) || 0 }))} />
                    </label>
                    <label>Hero glow color
                      <input value={platformDraft.heroGlowColor} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroGlowColor: event.target.value }))} placeholder="#8f58ff" />
                    </label>
                    <div className="scene-asset-inline-grid">
                      <label>Transition duration (ms)
                        <input type="number" min="300" max="3000" step="50" value={platformDraft.heroTransitionDuration} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroTransitionDuration: Number(event.target.value) || 300 }))} />
                      </label>
                      <label>Autoplay delay (ms)
                        <input type="number" min="2500" max="20000" step="100" value={platformDraft.heroAutoplayDelay} onChange={(event) => setPlatformDraft((current) => ({ ...current, heroAutoplayDelay: Number(event.target.value) || 2500 }))} />
                      </label>
                    </div>
                    <label>Runtime answer timer (seconds)
                      <input type="number" min="8" max="90" step="1" value={platformDraft.runtimeQuestionTimeLimitSeconds} onChange={(event) => setPlatformDraft((current) => ({ ...current, runtimeQuestionTimeLimitSeconds: Number(event.target.value) || 22 }))} />
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

function MediaSlotEditor({
  title,
  description,
  slots,
  guides,
  assets,
  onChange,
  compact = false,
}: {
  title: string
  description: string
  slots?: MediaSlots
  guides: MediaSlotGuide[]
  assets: MediaAsset[]
  onChange: (key: MediaSlotKey, path: string) => void
  compact?: boolean
}) {
  return (
    <div className={`media-slot-stack${compact ? ' is-compact' : ''}`}>
      <div className="media-slot-head">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <div className="media-slot-grid">
        {guides.map((guide) => {
          const currentPath = slots?.[guide.key]?.path ?? ''

          return (
            <article key={guide.key} className="media-slot-card">
              <div className="media-slot-preview">
                {currentPath ? (
                  <img src={currentPath} alt={guide.label} />
                ) : (
                  <div className="media-slot-preview-empty">
                    <Image size={16} />
                    <span>Sem asset</span>
                  </div>
                )}
              </div>
              <div className="media-slot-meta">
                <strong>{guide.label}</strong>
                <span>{guide.resolution} • {guide.ratio}</span>
                <small>{guide.safeArea}</small>
              </div>
              <select value={currentPath} onChange={(event) => onChange(guide.key, event.target.value)}>
                <option value="">Selecionar asset</option>
                {assets.map((asset) => (
                  <option key={`${guide.key}-${asset.id}`} value={asset.path}>
                    {asset.label}
                  </option>
                ))}
              </select>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function SafeAreaFieldset({
  title,
  area,
  onChange,
}: {
  title: string
  area: SceneAssetSafeArea
  onChange: (field: keyof SceneAssetSafeArea, value: string) => void
}) {
  return (
    <article className="scene-safearea-card">
      <strong>{title}</strong>
      <div className="scene-safearea-inputs">
        <label>X
          <input type="number" min="0" max="100" value={area.x} onChange={(event) => onChange('x', event.target.value)} />
        </label>
        <label>Y
          <input type="number" min="0" max="100" value={area.y} onChange={(event) => onChange('y', event.target.value)} />
        </label>
        <label>W
          <input type="number" min="0" max="100" value={area.width} onChange={(event) => onChange('width', event.target.value)} />
        </label>
        <label>H
          <input type="number" min="0" max="100" value={area.height} onChange={(event) => onChange('height', event.target.value)} />
        </label>
      </div>
    </article>
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
