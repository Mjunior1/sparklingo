import './AdminScreen.css'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Grip,
  Layers3,
  Pencil,
  Save,
  Shield,
  Sparkles,
  Trash2,
  WandSparkles,
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

const tagOptions: Exclude<FilterKey, 'Todos'>[] = ['Gramática', 'Vocabulário', 'Listening', 'Reading', 'Speaking']

const emptyLesson: LessonCatalogItem = {
  id: '',
  category: 'Vocabulário',
  title: '',
  blurb: '',
  image: '/pollinations/airport-card.png',
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
  art: '/pollinations/airport-card.png',
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

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildUniqueId = (base: string, existingIds: string[], fallbackPrefix: string) => {
  const normalizedBase = slugify(base) || `${fallbackPrefix}-${existingIds.length + 1}`
  const root = normalizedBase.startsWith(fallbackPrefix) ? normalizedBase : `${fallbackPrefix}-${normalizedBase}`
  if (!existingIds.includes(root)) return root

  let suffix = 2
  while (existingIds.includes(`${root}-${suffix}`)) suffix += 1
  return `${root}-${suffix}`
}

const compactQuestionKind = (kind: QuizQuestionItem['kind']) => {
  if (kind === 'multiple-choice') return 'Múltipla escolha'
  if (kind === 'drag-fill') return 'Drag and drop'
  return 'Ordenação'
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
  const [status, setStatus] = useState('Catálogo conectado ao Firestore. Você pode criar, editar e excluir conteúdo real.')
  const [saving, setSaving] = useState(false)
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
    }))
  }, [questionDraft.quizId, quizzes])

  const generatedLessonId = useMemo(() => {
    if (lessonDraft.id) return lessonDraft.id
    return buildUniqueId(lessonDraft.title, lessons.map((item) => item.id), 'lesson')
  }, [lessonDraft.id, lessonDraft.title, lessons])

  const generatedQuizId = useMemo(() => {
    if (quizDraft.id) return quizDraft.id
    return buildUniqueId(quizDraft.title, quizzes.map((item) => item.id), 'quiz')
  }, [quizDraft.id, quizDraft.title, quizzes])

  const generatedQuestionId = useMemo(() => {
    if (questionDraft.id) return questionDraft.id
    return buildUniqueId(questionDraft.title, questions.map((item) => item.id), 'question')
  }, [questionDraft.id, questionDraft.title, questions])

  const generatedAchievementId = useMemo(() => {
    if (achievementDraft.id) return achievementDraft.id
    return buildUniqueId(achievementDraft.title, achievements.map((item) => item.id), 'achievement')
  }, [achievementDraft.id, achievementDraft.title, achievements])

  const lessonOptions = useMemo(() => lessons.slice().sort((a, b) => a.title.localeCompare(b.title)), [lessons])
  const quizOptions = useMemo(() => quizzes.slice().sort((a, b) => a.title.localeCompare(b.title)), [quizzes])

  const challengePreview = useMemo(() => {
    if (questionDraft.kind === 'drag-fill') {
      return `${questionDraft.sentenceBefore || 'I enjoy'} [ slot ] ${questionDraft.sentenceAfter || 'in the mountains.'}`
    }

    if (questionDraft.kind === 'ordering') {
      return (questionDraft.scrambled ?? []).join(' • ') || 'Where • are • you • from • ?'
    }

    return (questionDraft.options ?? []).filter(Boolean).join(' • ') || 'go • goes • going • gone'
  }, [questionDraft])

  const summaryCards = [
    {
      label: 'Lições ativas',
      value: lessons.length,
      help: 'Estrutura principal da trilha',
    },
    {
      label: 'Quizzes publicados',
      value: quizzes.length,
      help: 'Agrupadores de desafios',
    },
    {
      label: 'Questões vivas',
      value: questions.length,
      help: 'Itens que podem aparecer na home',
    },
    {
      label: 'Conquistas',
      value: achievements.length || defaultAchievementCatalog.length,
      help: 'Recompensas visíveis para o aluno',
    },
  ]

  const runAdminTask = async (message: string, task: () => Promise<void>, successMessage: string) => {
    setSaving(true)
    setStatus(message)
    try {
      await task()
      await onRefresh()
      setStatus(successMessage)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível salvar no Firestore.')
    } finally {
      setSaving(false)
    }
  }

  const saveLesson = () => runAdminTask(
    'Salvando lição no Firestore...',
    async () => {
      await upsertLesson({ ...lessonDraft, id: generatedLessonId })
      setLessonDraft(emptyLesson)
    },
    `Lição "${lessonDraft.title}" salva com ID ${generatedLessonId}.`,
  )

  const saveQuiz = () => runAdminTask(
    'Salvando quiz no Firestore...',
    async () => {
      await upsertQuiz({ ...quizDraft, id: generatedQuizId })
      setQuizDraft(emptyQuiz)
    },
    `Quiz "${quizDraft.title}" salvo com ID ${generatedQuizId}.`,
  )

  const saveQuestion = () => runAdminTask(
    'Salvando questão no Firestore...',
    async () => {
      await upsertQuizQuestion({
        ...questionDraft,
        id: generatedQuestionId,
        options: questionDraft.kind === 'multiple-choice' || questionDraft.kind === 'drag-fill'
          ? (questionDraft.options ?? []).filter(Boolean)
          : undefined,
        scrambled: questionDraft.kind === 'ordering' ? (questionDraft.scrambled ?? []).filter(Boolean) : undefined,
        solution: questionDraft.kind === 'ordering' ? (questionDraft.solution ?? []).filter(Boolean) : undefined,
      })
      setQuestionDraft(emptyQuestion)
    },
    `Questão "${questionDraft.title}" salva com ID ${generatedQuestionId} e pronta para alimentar a home.`,
  )

  const saveAchievementItem = () => runAdminTask(
    'Salvando conquista...',
    async () => {
      await upsertAchievement({ ...achievementDraft, id: generatedAchievementId })
      setAchievementDraft(emptyAchievement)
    },
    `Conquista "${achievementDraft.title}" salva com ID ${generatedAchievementId}.`,
  )

  const removeCatalogItem = async (label: string, task: () => Promise<void>) => {
    if (!window.confirm(`Excluir "${label}" do catálogo?`)) return
    await runAdminTask(
      `Excluindo "${label}"...`,
      task,
      `"${label}" removido do Firestore.`,
    )
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <button className="admin-back" onClick={onBack} type="button">
          <ArrowLeft size={18} />
          Voltar para a jornada
        </button>
        <div className="admin-pill">
          <Shield size={16} />
          Painel admin protegido
        </div>
      </div>

      <section className="admin-hero">
        <div className="admin-hero-copy">
          <p className="admin-kicker">Operação do produto</p>
          <h1>Catálogo, home e runtime em um fluxo claro.</h1>
          <p className="admin-copy">
            Aqui você monta a jornada em três camadas: a lição organiza a trilha, o quiz agrupa o desafio e a questão é o item jogável que aparece para o aluno.
          </p>
        </div>
        <div className="admin-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.help}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-grid">
        <article className="admin-card admin-card-wide">
          <div className="admin-card-head">
            <div>
              <h2>Configuração da plataforma</h2>
              <p className="admin-helper">
                “Popular catálogo base” cria os registros iniciais no Firestore para você começar a operar sem depender de código.
              </p>
            </div>
            <Database size={18} />
          </div>

          <div className="admin-actions-row">
            <button
              className="admin-primary"
              disabled={saving}
              onClick={() => runAdminTask(
                'Criando catálogo base...',
                () => seedDefaultCatalog(),
                'Catálogo base populado no Firestore.',
              )}
              type="button"
            >
              <Sparkles size={16} />
              Popular catálogo base
            </button>
          </div>

          <div className="admin-form admin-form-wide">
            <label>
              Headline do hero
              <input
                value={platformDraft.heroHeadline}
                onChange={(event) => setPlatformDraft((current) => ({ ...current, heroHeadline: event.target.value }))}
              />
            </label>
            <label>
              Subtítulo
              <textarea
                value={platformDraft.heroSubtitle}
                onChange={(event) => setPlatformDraft((current) => ({ ...current, heroSubtitle: event.target.value }))}
              />
            </label>
            <label>
              CTA principal
              <input
                value={platformDraft.playCta}
                onChange={(event) => setPlatformDraft((current) => ({ ...current, playCta: event.target.value }))}
              />
            </label>
          </div>

          <button
            className="admin-primary"
            disabled={saving}
            onClick={() => runAdminTask(
              'Atualizando runtime...',
              () => savePlatformConfig(platformDraft),
              'Configuração da plataforma atualizada no Firestore.',
            )}
            type="button"
          >
            <Save size={16} />
            Salvar plataforma
          </button>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Nova lição</h2>
              <p className="admin-helper">A lição é a trilha visual principal. O ID é gerado automaticamente.</p>
            </div>
            <span>{lessons.length} ativas</span>
          </div>

          <div className="admin-generated-id">
            <span>ID da lição</span>
            <strong>{generatedLessonId}</strong>
          </div>

          <div className="admin-form">
            <label>
              Categoria
              <select
                value={lessonDraft.category}
                onChange={(event) => setLessonDraft((current) => ({ ...current, category: event.target.value }))}
              >
                {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </label>
            <label>
              Título
              <input value={lessonDraft.title} onChange={(event) => setLessonDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              Blurb
              <textarea value={lessonDraft.blurb} onChange={(event) => setLessonDraft((current) => ({ ...current, blurb: event.target.value }))} />
            </label>
            <label>
              Imagem
              <input value={lessonDraft.image} onChange={(event) => setLessonDraft((current) => ({ ...current, image: event.target.value }))} />
            </label>
            <label>
              Tom
              <select value={lessonDraft.tone} onChange={(event) => setLessonDraft((current) => ({ ...current, tone: event.target.value as LessonTone }))}>
                <option value="sky">sky</option>
                <option value="violet">violet</option>
                <option value="mint">mint</option>
              </select>
            </label>
          </div>

          <button
            className="admin-primary"
            disabled={saving || !lessonDraft.title}
            onClick={saveLesson}
            type="button"
          >
            Salvar lição
          </button>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Novo quiz</h2>
              <p className="admin-helper">O quiz pertence a uma lição e organiza um conjunto de desafios.</p>
            </div>
            <span>{quizzes.length} ativos</span>
          </div>

          <div className="admin-generated-id">
            <span>ID do quiz</span>
            <strong>{generatedQuizId}</strong>
          </div>

          <div className="admin-form">
            <label>
              Lição vinculada
              <select
                value={quizDraft.lessonId}
                onChange={(event) => setQuizDraft((current) => ({ ...current, lessonId: event.target.value }))}
              >
                <option value="">Selecione uma lição</option>
                {lessonOptions.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
              </select>
            </label>
            <label>
              Título
              <input value={quizDraft.title} onChange={(event) => setQuizDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              Categoria
              <select value={quizDraft.tag} onChange={(event) => setQuizDraft((current) => ({ ...current, tag: event.target.value as QuizCatalogItem['tag'] }))}>
                {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </label>
            <label>
              Tipo principal
              <select value={quizDraft.kind} onChange={(event) => setQuizDraft((current) => ({ ...current, kind: event.target.value as QuizCatalogItem['kind'] }))}>
                <option value="multiple-choice">Múltipla escolha</option>
                <option value="drag-fill">Drag and drop</option>
                <option value="ordering">Ordenação</option>
              </select>
            </label>
            <label>
              Reward
              <input type="number" value={quizDraft.reward} onChange={(event) => setQuizDraft((current) => ({ ...current, reward: Number(event.target.value) || 0 }))} />
            </label>
          </div>

          <button
            className="admin-primary"
            disabled={saving || !quizDraft.lessonId || !quizDraft.title}
            onClick={saveQuiz}
            type="button"
          >
            Salvar quiz
          </button>
        </article>

        <article className="admin-card admin-card-wide">
          <div className="admin-card-head">
            <div>
              <h2>Builder visual de questão</h2>
              <p className="admin-helper">A questão é o item jogável da home. Escolha um quiz e monte o comportamento visual.</p>
            </div>
            <span>{questions.length} questões</span>
          </div>

          <div className="question-builder-shell">
            <div className="admin-form">
              <div className="admin-generated-id">
                <span>ID da questão</span>
                <strong>{generatedQuestionId}</strong>
              </div>

              <label>
                Quiz vinculado
                <select
                  value={questionDraft.quizId}
                  onChange={(event) => setQuestionDraft((current) => ({ ...current, quizId: event.target.value }))}
                >
                  <option value="">Selecione um quiz</option>
                  {quizOptions.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
                </select>
              </label>

              <label>
                Lição vinculada
                <input value={questionDraft.lessonId} readOnly placeholder="Será preenchida ao escolher o quiz" />
              </label>

              <label>
                Categoria
                <select value={questionDraft.tag} onChange={(event) => setQuestionDraft((current) => ({ ...current, tag: event.target.value as Exclude<FilterKey, 'Todos'> }))}>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </label>

              <label>
                Tipo
                <select value={questionDraft.kind} onChange={(event) => setQuestionDraft((current) => ({ ...current, kind: event.target.value as QuizQuestionItem['kind'] }))}>
                  <option value="multiple-choice">Múltipla escolha</option>
                  <option value="drag-fill">Drag and drop</option>
                  <option value="ordering">Ordenação</option>
                </select>
              </label>

              <label>
                Título
                <input value={questionDraft.title} onChange={(event) => setQuestionDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>

              <label>
                Prompt
                <textarea value={questionDraft.prompt} onChange={(event) => setQuestionDraft((current) => ({ ...current, prompt: event.target.value }))} />
              </label>

              <label>
                Imagem
                <input value={questionDraft.art} onChange={(event) => setQuestionDraft((current) => ({ ...current, art: event.target.value }))} />
              </label>

              <label>
                Explicação
                <textarea value={questionDraft.explanation} onChange={(event) => setQuestionDraft((current) => ({ ...current, explanation: event.target.value }))} />
              </label>

              {questionDraft.kind === 'multiple-choice' && (
                <>
                  <label>
                    Opções (uma por linha)
                    <textarea
                      value={(questionDraft.options ?? []).join('\n')}
                      onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))}
                    />
                  </label>
                  <label>
                    Resposta correta
                    <input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} />
                  </label>
                </>
              )}

              {questionDraft.kind === 'drag-fill' && (
                <>
                  <label>
                    Texto antes
                    <input value={questionDraft.sentenceBefore ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, sentenceBefore: event.target.value }))} />
                  </label>
                  <label>
                    Texto depois
                    <input value={questionDraft.sentenceAfter ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, sentenceAfter: event.target.value }))} />
                  </label>
                  <label>
                    Opções (uma por linha)
                    <textarea
                      value={(questionDraft.options ?? []).join('\n')}
                      onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))}
                    />
                  </label>
                  <label>
                    Resposta correta
                    <input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} />
                  </label>
                </>
              )}

              {questionDraft.kind === 'ordering' && (
                <>
                  <label>
                    Palavras embaralhadas (uma por linha)
                    <textarea
                      value={(questionDraft.scrambled ?? []).join('\n')}
                      onChange={(event) => setQuestionDraft((current) => ({ ...current, scrambled: event.target.value.split('\n').filter(Boolean) }))}
                    />
                  </label>
                  <label>
                    Solução (uma por linha)
                    <textarea
                      value={(questionDraft.solution ?? []).join('\n')}
                      onChange={(event) => setQuestionDraft((current) => ({ ...current, solution: event.target.value.split('\n').filter(Boolean) }))}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="question-preview-card">
              <div className="question-preview-head">
                <span><Layers3 size={14} /> {questionDraft.tag}</span>
                <span><Grip size={14} /> {compactQuestionKind(questionDraft.kind)}</span>
              </div>
              <strong>{questionDraft.title || 'Prévia do desafio'}</strong>
              <p>{questionDraft.prompt || 'Monte a questão visualmente e veja como ela vai entrar na home antes de salvar.'}</p>
              <div className="question-preview-stage">{challengePreview}</div>
              <button
                className="admin-primary"
                disabled={saving || !questionDraft.quizId || !questionDraft.lessonId || !questionDraft.title}
                onClick={saveQuestion}
                type="button"
              >
                <WandSparkles size={16} />
                Salvar questão e publicar na home
              </button>
            </div>
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Nova conquista</h2>
              <p className="admin-helper">Recompensas que podem aparecer na home e no histórico do aluno.</p>
            </div>
            <span>{achievements.length || defaultAchievementCatalog.length} base</span>
          </div>

          <div className="admin-generated-id">
            <span>ID da conquista</span>
            <strong>{generatedAchievementId}</strong>
          </div>

          <div className="admin-form">
            <label>
              Título
              <input value={achievementDraft.title} onChange={(event) => setAchievementDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              Descrição
              <textarea value={achievementDraft.description} onChange={(event) => setAchievementDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              XP reward
              <input type="number" value={achievementDraft.xpReward} onChange={(event) => setAchievementDraft((current) => ({ ...current, xpReward: Number(event.target.value) || 0 }))} />
            </label>
          </div>

          <button
            className="admin-primary"
            disabled={saving || !achievementDraft.title}
            onClick={saveAchievementItem}
            type="button"
          >
            Salvar conquista
          </button>
        </article>

        <article className="admin-card admin-card-wide">
          <div className="admin-card-head">
            <div>
              <h2>Conteúdo existente</h2>
              <p className="admin-helper">Edite, recategorize ou exclua registros reais do banco. Tudo que está aqui vem do Firestore.</p>
            </div>
            <CheckCircle2 size={18} />
          </div>

          <div className="catalog-grid">
            <section className="catalog-panel">
              <div className="catalog-panel-head">
                <h3>Lições</h3>
                <span>{lessons.length}</span>
              </div>
              <div className="catalog-list">
                {lessons.map((lesson) => (
                  <article key={lesson.id} className="catalog-item">
                    <div>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.id} • {lesson.category}</small>
                    </div>
                    <div className="catalog-actions">
                      <button
                        type="button"
                        onClick={() => setLessonDraft(lesson)}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeCatalogItem(lesson.title, () => deleteLesson(lesson.id))}
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="catalog-panel">
              <div className="catalog-panel-head">
                <h3>Quizzes</h3>
                <span>{quizzes.length}</span>
              </div>
              <div className="catalog-list">
                {quizzes.map((quiz) => (
                  <article key={quiz.id} className="catalog-item">
                    <div>
                      <strong>{quiz.title}</strong>
                      <small>{quiz.id} • {quiz.lessonId} • {quiz.tag}</small>
                    </div>
                    <div className="catalog-actions">
                      <button type="button" onClick={() => setQuizDraft(quiz)}>
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeCatalogItem(quiz.title, () => deleteQuiz(quiz.id))}
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="catalog-panel catalog-panel-wide">
              <div className="catalog-panel-head">
                <h3>Questões</h3>
                <span>{questions.length}</span>
              </div>
              <div className="catalog-list">
                {questions.map((question) => (
                  <article key={question.id} className="catalog-item">
                    <div>
                      <strong>{question.title}</strong>
                      <small>{question.id} • {compactQuestionKind(question.kind)} • {question.tag} • quiz {question.quizId}</small>
                    </div>
                    <div className="catalog-actions">
                      <button type="button" onClick={() => setQuestionDraft(question)}>
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeCatalogItem(question.title, () => deleteQuizQuestion(question.id))}
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="catalog-panel">
              <div className="catalog-panel-head">
                <h3>Conquistas</h3>
                <span>{achievements.length || defaultAchievementCatalog.length}</span>
              </div>
              <div className="catalog-list">
                {(achievements.length ? achievements : defaultAchievementCatalog).map((achievement) => (
                  <article key={achievement.id} className="catalog-item">
                    <div>
                      <strong>{achievement.title}</strong>
                      <small>{achievement.id} • {achievement.xpReward} XP</small>
                    </div>
                    <div className="catalog-actions">
                      <button type="button" onClick={() => setAchievementDraft(achievement)}>
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeCatalogItem(achievement.title, () => deleteAchievement(achievement.id))}
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </article>
      </section>

      <p className="admin-status">{status}</p>
    </div>
  )
}
