import './AdminScreen.css'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronRight,
  Copy,
  Gamepad2,
  Gem,
  Image,
  LayoutDashboard,
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

const tagOptions: Exclude<FilterKey, 'Todos'>[] = ['Gramática', 'Vocabulário', 'Listening', 'Reading', 'Speaking']
const questionKinds: Array<QuizQuestionItem['kind']> = ['multiple-choice', 'drag-fill', 'ordering']

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

const formatQuestionKind = (kind: QuizQuestionItem['kind']) => {
  if (kind === 'multiple-choice') return 'Múltipla escolha'
  if (kind === 'drag-fill') return 'Drag & Drop'
  return 'Listening / Speaking'
}

const questionPrefixByKind: Record<QuizQuestionItem['kind'], string> = {
  'multiple-choice': 'QT-MC',
  'drag-fill': 'QT-DD',
  ordering: 'QT-OD',
}

const padNumber = (value: number) => String(value).padStart(3, '0')

const nextNumericId = (existingIds: string[], prefix: string) => {
  const matches = existingIds
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number(id.replace(`${prefix}-`, '')))
    .filter((value) => Number.isFinite(value))

  return `${prefix}-${padNumber((matches.length ? Math.max(...matches) : 0) + 1)}`
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
  dashboard: 'Acompanhe o catálogo, veja o volume de conteúdo e acesse ações rápidas sem abrir formulários gigantes.',
  lessons: 'Crie e organize as trilhas principais. Cada lição agrupa quizzes e define o tom visual da jornada.',
  quizzes: 'Estruture os blocos jogáveis dentro das lições e mantenha a progressão clara.',
  questions: 'Encontre, filtre e edite qualquer desafio em segundos com uma grade compacta e um drawer lateral.',
  achievements: 'Gerencie recompensas e marcos emocionais da experiência.',
  media: 'Escolha assets visuais de forma rápida, sem depender de caminhos manuais.',
  users: 'Área preparada para gestão de contas, turmas e suporte operacional.',
  analytics: 'Área preparada para retenção, sessões, streak, desempenho e consumo de conteúdo.',
  settings: 'Ajuste o runtime e os textos principais da plataforma.',
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
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<FilterKey | 'Todos'>('Todos')
  const [filterKind, setFilterKind] = useState<QuizQuestionItem['kind'] | 'all'>('all')
  const [filterQuizId, setFilterQuizId] = useState<string>('all')
  const [lessonDraft, setLessonDraft] = useState<LessonCatalogItem>(emptyLesson)
  const [quizDraft, setQuizDraft] = useState<QuizCatalogItem>(emptyQuiz)
  const [questionDraft, setQuestionDraft] = useState<QuizQuestionItem>(emptyQuestion)
  const [achievementDraft, setAchievementDraft] = useState<AchievementCatalogItem>(emptyAchievement)
  const [platformDraft, setPlatformDraft] = useState<PlatformConfig>(platformConfig ?? defaultPlatformConfig)

  useEffect(() => {
    setPlatformDraft(platformConfig ?? defaultPlatformConfig)
  }, [platformConfig])

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
    () => questionDraft.id || nextNumericId(questions.map((item) => item.id), questionPrefixByKind[questionDraft.kind]),
    [questionDraft.id, questionDraft.kind, questions],
  )

  const achievementIdPreview = useMemo(
    () => achievementDraft.id || nextNumericId(achievements.map((item) => item.id), 'AC'),
    [achievementDraft.id, achievements],
  )

  const sortedLessons = useMemo(() => lessons.slice().sort((a, b) => a.title.localeCompare(b.title)), [lessons])
  const sortedQuizzes = useMemo(() => quizzes.slice().sort((a, b) => a.title.localeCompare(b.title)), [quizzes])

  const filteredQuestions = useMemo(() => {
    return questions
      .filter((question) => filterTag === 'Todos' || question.tag === filterTag)
      .filter((question) => filterKind === 'all' || question.kind === filterKind)
      .filter((question) => filterQuizId === 'all' || question.quizId === filterQuizId)
      .filter((question) => {
        if (!search.trim()) return true
        const haystack = `${question.id} ${question.title} ${question.prompt} ${question.quizId} ${question.lessonId}`.toLowerCase()
        return haystack.includes(search.toLowerCase())
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  }, [filterKind, filterQuizId, filterTag, questions, search])

  const dashboardStats = [
    { label: 'Lições', value: lessons.length, helper: 'trilhas vivas' },
    { label: 'Quizzes', value: quizzes.length, helper: 'blocos jogáveis' },
    { label: 'Questões', value: questions.length, helper: 'itens no catálogo' },
    { label: 'Conquistas', value: achievements.length || defaultAchievementCatalog.length, helper: 'recompensas' },
  ]

  const currentQuestionQuiz = quizzes.find((quiz) => quiz.id === questionDraft.quizId)
  const currentQuestionLesson = lessons.find((lesson) => lesson.id === questionDraft.lessonId)

  const questionPreview = useMemo(() => {
    if (questionDraft.kind === 'drag-fill') {
      return `${questionDraft.sentenceBefore || 'I enjoy'} [ slot ] ${questionDraft.sentenceAfter || 'in the mountains.'}`
    }

    if (questionDraft.kind === 'ordering') {
      return (questionDraft.scrambled ?? []).join(' • ') || 'Where • are • you • from • ?'
    }

    return (questionDraft.options ?? []).filter(Boolean).join(' • ') || 'go • goes • going • gone'
  }, [questionDraft])

  const openDrawer = (kind: DrawerKind, mode: DrawerMode) => setDrawer({ open: true, kind, mode })
  const closeDrawer = () => setDrawer({ open: false })

  const runAdminTask = async (loadingMessage: string, successMessage: string, task: () => Promise<void>) => {
    setSaving(true)
    setStatus(loadingMessage)
    try {
      await task()
      await onRefresh()
      setStatus(successMessage)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível concluir a operação no Firestore.')
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
        options: questionDraft.kind === 'multiple-choice' || questionDraft.kind === 'drag-fill'
          ? (questionDraft.options ?? []).filter(Boolean)
          : undefined,
        scrambled: questionDraft.kind === 'ordering' ? (questionDraft.scrambled ?? []).filter(Boolean) : undefined,
        solution: questionDraft.kind === 'ordering' ? (questionDraft.solution ?? []).filter(Boolean) : undefined,
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
    openDrawer('lesson', lesson ? 'edit' : 'create')
  }

  const openQuizEditor = (quiz?: QuizCatalogItem) => {
    setQuizDraft(quiz ?? emptyQuiz)
    openDrawer('quiz', quiz ? 'edit' : 'create')
  }

  const openQuestionEditor = (question?: QuizQuestionItem) => {
    setQuestionDraft(question ?? emptyQuestion)
    openDrawer('question', question ? 'edit' : 'create')
  }

  const openAchievementEditor = (achievement?: AchievementCatalogItem) => {
    setAchievementDraft(achievement ?? emptyAchievement)
    openDrawer('achievement', achievement ? 'edit' : 'create')
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
        <>
          <div className="admin-drawer-head">
            <div>
              <span className="admin-drawer-kicker">{drawer.mode === 'create' ? 'Nova lição' : 'Editar lição'}</span>
              <h3>{lessonDraft.title || 'Defina a trilha principal'}</h3>
              <p>ID automático: <strong>{lessonIdPreview}</strong></p>
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
            <MediaPicker selected={lessonDraft.image} onPick={applyMediaAsset} />
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button className="admin-primary" type="button" disabled={saving || !lessonDraft.title} onClick={saveLesson}>
              <Save size={16} />
              Salvar lição
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
              <span className="admin-drawer-kicker">{drawer.mode === 'create' ? 'Novo quiz' : 'Editar quiz'}</span>
              <h3>{quizDraft.title || 'Estruture o bloco jogável'}</h3>
              <p>ID automático: <strong>{quizIdPreview}</strong></p>
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
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button className="admin-primary" type="button" disabled={saving || !quizDraft.lessonId || !quizDraft.title} onClick={saveQuiz}>
              <Save size={16} />
              Salvar quiz
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
              <span className="admin-drawer-kicker">{drawer.mode === 'create' ? 'Nova questão' : 'Editar questão'}</span>
              <h3>{questionDraft.title || 'Construa o desafio jogável'}</h3>
              <p>ID automático: <strong>{questionIdPreview}</strong></p>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}><X size={18} /></button>
          </div>

          <div className="admin-flow-strip">
            <span className={questionDraft.lessonId ? 'is-complete' : ''}>1. Lição</span>
            <ChevronRight size={14} />
            <span className={questionDraft.quizId ? 'is-complete' : ''}>2. Quiz</span>
            <ChevronRight size={14} />
            <span className={questionDraft.title ? 'is-complete' : ''}>3. Questão</span>
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
            </div>

            <div className="question-preview-card">
              <div className="question-preview-head">
                <span><Gem size={14} /> {questionDraft.tag}</span>
                <span><WandSparkles size={14} /> {formatQuestionKind(questionDraft.kind)}</span>
                {currentQuestionQuiz && <span><Gamepad2 size={14} /> {currentQuestionQuiz.title}</span>}
              </div>
              <strong>{questionDraft.title || 'Prévia do desafio'}</strong>
              <p>{questionDraft.prompt || 'Monte a questão visualmente e veja como ela vai aparecer na home.'}</p>
              <div className="question-preview-stage">{questionPreview}</div>
              <MediaPicker selected={questionDraft.art} onPick={applyMediaAsset} compact />
            </div>
          </div>

          <div className="admin-drawer-footer">
            <button className="admin-secondary" type="button" onClick={closeDrawer}>Cancelar</button>
            <button className="admin-primary" type="button" disabled={saving || !questionDraft.quizId || !questionDraft.title} onClick={saveQuestion}>
              <Save size={16} />
              Salvar questão
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="admin-drawer-head">
          <div>
            <span className="admin-drawer-kicker">{drawer.mode === 'create' ? 'Nova conquista' : 'Editar conquista'}</span>
            <h3>{achievementDraft.title || 'Defina uma recompensa'}</h3>
            <p>ID automático: <strong>{achievementIdPreview}</strong></p>
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
            Salvar conquista
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
                  <h2>Ações rápidas</h2>
                  <p className="admin-helper">Use o catálogo base, ajuste o hero e entre direto nas áreas de criação.</p>
                </div>
              </div>
              <div className="cms-quick-grid">
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
              <div className="cms-card-list">
                {sortedLessons.map((lesson) => (
                  <article key={lesson.id} className="cms-content-card">
                    <img src={lesson.image} alt={lesson.title} />
                    <div className="cms-content-copy">
                      <strong>{lesson.title}</strong>
                      <span>{lesson.id} • {lesson.category}</span>
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
                    {sortedQuizzes.map((quiz) => (
                      <tr key={quiz.id}>
                        <td>{quiz.id}</td>
                        <td>{lessons.find((lesson) => lesson.id === quiz.lessonId)?.title ?? quiz.lessonId}</td>
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
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por ID, título, quiz ou lição" />
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
                          <small>{question.quizId}</small>
                        </td>
                        <td>{question.reward}</td>
                        <td>{question.active ? 'Ativa' : 'Pausada'}</td>
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
              <div className="cms-card-list">
                {(achievements.length ? achievements : defaultAchievementCatalog).map((achievement) => (
                  <article key={achievement.id} className="cms-content-card cms-content-card-simple">
                    <div className="cms-content-copy">
                      <strong>{achievement.title}</strong>
                      <span>{achievement.id} • {achievement.xpReward} XP</span>
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
              </div>
              <MediaPicker selected={null} onPick={applyMediaAsset} />
            </section>
          </section>
        )}

        {(activeSection === 'users' || activeSection === 'analytics') && (
          <section className="cms-panel-stack">
            <section className="cms-panel cms-empty-panel">
              {activeSection === 'users' ? <Users size={28} /> : <BarChart3 size={28} />}
              <h2>{activeSection === 'users' ? 'Usuários' : 'Analytics'}</h2>
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
                  <button
                    className="admin-primary"
                    disabled={saving}
                    onClick={() => runAdminTask('Atualizando runtime...', 'Runtime da plataforma salvo.', () => savePlatformConfig(platformDraft))}
                    type="button"
                  >
                    <Save size={16} />
                    Salvar plataforma
                  </button>
                </article>
              </div>
            </section>
          </section>
        )}

        <p className="admin-status">{status}</p>
      </div>

      {drawer.open && (
        <div className="admin-drawer-backdrop" onClick={closeDrawer}>
          <aside className="admin-drawer" onClick={(event) => event.stopPropagation()}>
            {renderDrawerContent()}
          </aside>
        </div>
      )}
    </div>
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
    <div className={`media-picker${compact ? ' compact' : ''}`}>
      <div className="media-picker-head">
        <strong>Biblioteca visual</strong>
        <span>Selecione um asset pelo preview</span>
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
          </button>
        ))}
      </div>
    </div>
  )
}
