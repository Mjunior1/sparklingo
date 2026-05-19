import './AdminScreen.css'
import { useMemo, useState } from 'react'
import { ArrowLeft, Database, Grip, Layers3, Save, Shield, Sparkles, WandSparkles } from 'lucide-react'
import {
  defaultAchievementCatalog,
  defaultLessonsCatalog,
  defaultQuizCatalog,
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
  onBack: () => void
  onRefresh: () => Promise<void>
  platformConfig: PlatformConfig | null
}

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

const tagOptions: Exclude<FilterKey, 'Todos'>[] = ['Gramática', 'Vocabulário', 'Listening', 'Reading', 'Speaking']

export function AdminScreen({ lessons, quizzes, questions, onBack, onRefresh, platformConfig }: AdminScreenProps) {
  const [status, setStatus] = useState('Pronto para operar o catálogo.')
  const [saving, setSaving] = useState(false)
  const [lessonDraft, setLessonDraft] = useState<LessonCatalogItem>(emptyLesson)
  const [quizDraft, setQuizDraft] = useState<QuizCatalogItem>(emptyQuiz)
  const [questionDraft, setQuestionDraft] = useState<QuizQuestionItem>(emptyQuestion)
  const [achievementDraft, setAchievementDraft] = useState<AchievementCatalogItem>(emptyAchievement)
  const [platformDraft, setPlatformDraft] = useState<PlatformConfig>(platformConfig ?? defaultPlatformConfig)

  const lessonCount = useMemo(() => lessons.length || defaultLessonsCatalog.length, [lessons.length])
  const quizCount = useMemo(() => quizzes.length || defaultQuizCatalog.length, [quizzes.length])

  const runAdminTask = async (message: string, task: () => Promise<void>) => {
    setSaving(true)
    setStatus(message)
    try {
      await task()
      await onRefresh()
      setStatus('Alterações salvas no Firestore.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível salvar no Firestore.')
    } finally {
      setSaving(false)
    }
  }

  const challengePreview = useMemo(() => {
    if (questionDraft.kind === 'drag-fill') {
      return `${questionDraft.sentenceBefore || 'I enjoy'} [ slot ] ${questionDraft.sentenceAfter || 'in the mountains.'}`
    }

    if (questionDraft.kind === 'ordering') {
      return (questionDraft.scrambled ?? []).join(' • ') || 'Where • are • you • from • ?'
    }

    return (questionDraft.options ?? []).filter(Boolean).join(' • ') || 'go • goes • going • gone'
  }, [questionDraft])

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
          <p className="admin-kicker">Conteúdo + plataforma</p>
          <h1>Operar o SparkLingo sem deploy</h1>
          <p className="admin-copy">
            Cadastre lições, atualize quizzes, monte desafios visuais e ajuste a plataforma em tempo real.
          </p>
        </div>
        <div className="admin-summary-grid">
          <article>
            <span>Lições</span>
            <strong>{lessonCount}</strong>
          </article>
          <article>
            <span>Quizzes</span>
            <strong>{quizCount}</strong>
          </article>
          <article>
            <span>Questões</span>
            <strong>{questions.length}</strong>
          </article>
        </div>
      </section>

      <section className="admin-grid">
        <article className="admin-card admin-card-wide">
          <div className="admin-card-head">
            <h2>Seed inicial e runtime</h2>
            <Database size={18} />
          </div>
          <div className="admin-actions-row">
            <button
              className="admin-primary"
              disabled={saving}
              onClick={() => runAdminTask('Semeando catálogo...', () => seedDefaultCatalog())}
              type="button"
            >
              <Sparkles size={16} />
              Semear Firestore
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
            onClick={() => runAdminTask('Atualizando runtime...', () => savePlatformConfig(platformDraft))}
            type="button"
          >
            <Save size={16} />
            Salvar plataforma
          </button>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <h2>Nova lição</h2>
            <span>{lessons.length} ativas</span>
          </div>
          <div className="admin-form">
            <label>ID<input value={lessonDraft.id} onChange={(event) => setLessonDraft((current) => ({ ...current, id: event.target.value }))} /></label>
            <label>Categoria<input value={lessonDraft.category} onChange={(event) => setLessonDraft((current) => ({ ...current, category: event.target.value }))} /></label>
            <label>Título<input value={lessonDraft.title} onChange={(event) => setLessonDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>Blurb<textarea value={lessonDraft.blurb} onChange={(event) => setLessonDraft((current) => ({ ...current, blurb: event.target.value }))} /></label>
            <label>Imagem<input value={lessonDraft.image} onChange={(event) => setLessonDraft((current) => ({ ...current, image: event.target.value }))} /></label>
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
            disabled={saving || !lessonDraft.id || !lessonDraft.title}
            onClick={() => runAdminTask('Salvando lição...', async () => {
              await upsertLesson(lessonDraft)
              setLessonDraft(emptyLesson)
            })}
            type="button"
          >
            Salvar lição
          </button>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <h2>Novo quiz</h2>
            <span>{quizzes.length} ativos</span>
          </div>
          <div className="admin-form">
            <label>ID<input value={quizDraft.id} onChange={(event) => setQuizDraft((current) => ({ ...current, id: event.target.value }))} /></label>
            <label>Lesson ID<input value={quizDraft.lessonId} onChange={(event) => setQuizDraft((current) => ({ ...current, lessonId: event.target.value }))} /></label>
            <label>Título<input value={quizDraft.title} onChange={(event) => setQuizDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>
              Tag
              <select value={quizDraft.tag} onChange={(event) => setQuizDraft((current) => ({ ...current, tag: event.target.value as QuizCatalogItem['tag'] }))}>
                {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </label>
            <label>
              Reward
              <input type="number" value={quizDraft.reward} onChange={(event) => setQuizDraft((current) => ({ ...current, reward: Number(event.target.value) || 0 }))} />
            </label>
          </div>
          <button
            className="admin-primary"
            disabled={saving || !quizDraft.id || !quizDraft.lessonId || !quizDraft.title}
            onClick={() => runAdminTask('Salvando quiz...', async () => {
              await upsertQuiz(quizDraft)
              setQuizDraft(emptyQuiz)
            })}
            type="button"
          >
            Salvar quiz
          </button>
        </article>

        <article className="admin-card admin-card-wide">
          <div className="admin-card-head">
            <h2>Builder visual de questão</h2>
            <span>{questions.length} questões</span>
          </div>
          <div className="question-builder-shell">
            <div className="admin-form">
              <label>ID<input value={questionDraft.id} onChange={(event) => setQuestionDraft((current) => ({ ...current, id: event.target.value }))} /></label>
              <label>Quiz ID<input value={questionDraft.quizId} onChange={(event) => setQuestionDraft((current) => ({ ...current, quizId: event.target.value }))} /></label>
              <label>Lesson ID<input value={questionDraft.lessonId} onChange={(event) => setQuestionDraft((current) => ({ ...current, lessonId: event.target.value }))} /></label>
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
              <label>Título<input value={questionDraft.title} onChange={(event) => setQuestionDraft((current) => ({ ...current, title: event.target.value }))} /></label>
              <label>Prompt<textarea value={questionDraft.prompt} onChange={(event) => setQuestionDraft((current) => ({ ...current, prompt: event.target.value }))} /></label>
              <label>Imagem<input value={questionDraft.art} onChange={(event) => setQuestionDraft((current) => ({ ...current, art: event.target.value }))} /></label>
              <label>Explicação<textarea value={questionDraft.explanation} onChange={(event) => setQuestionDraft((current) => ({ ...current, explanation: event.target.value }))} /></label>
              {questionDraft.kind === 'multiple-choice' && (
                <>
                  <label>Opções (uma por linha)
                    <textarea
                      value={(questionDraft.options ?? []).join('\n')}
                      onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))}
                    />
                  </label>
                  <label>Resposta correta<input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} /></label>
                </>
              )}
              {questionDraft.kind === 'drag-fill' && (
                <>
                  <label>Texto antes<input value={questionDraft.sentenceBefore ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, sentenceBefore: event.target.value }))} /></label>
                  <label>Texto depois<input value={questionDraft.sentenceAfter ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, sentenceAfter: event.target.value }))} /></label>
                  <label>Opções (uma por linha)
                    <textarea
                      value={(questionDraft.options ?? []).join('\n')}
                      onChange={(event) => setQuestionDraft((current) => ({ ...current, options: event.target.value.split('\n') }))}
                    />
                  </label>
                  <label>Resposta correta<input value={questionDraft.correct ?? ''} onChange={(event) => setQuestionDraft((current) => ({ ...current, correct: event.target.value }))} /></label>
                </>
              )}
              {questionDraft.kind === 'ordering' && (
                <>
                  <label>Palavras embaralhadas (uma por linha)
                    <textarea
                      value={(questionDraft.scrambled ?? []).join('\n')}
                      onChange={(event) => setQuestionDraft((current) => ({ ...current, scrambled: event.target.value.split('\n').filter(Boolean) }))}
                    />
                  </label>
                  <label>Solução (uma por linha)
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
                <span><Grip size={14} /> {questionDraft.kind}</span>
              </div>
              <strong>{questionDraft.title || 'Prévia do desafio'}</strong>
              <p>{questionDraft.prompt || 'Monte a questão visualmente e veja a categoria, o tipo e o comportamento antes de salvar.'}</p>
              <div className="question-preview-stage">
                {challengePreview}
              </div>
              <button
                className="admin-primary"
                disabled={saving || !questionDraft.id || !questionDraft.quizId || !questionDraft.lessonId || !questionDraft.title}
                onClick={() => runAdminTask('Salvando questão...', async () => {
                  await upsertQuizQuestion(questionDraft)
                  setQuestionDraft(emptyQuestion)
                })}
                type="button"
              >
                <WandSparkles size={16} />
                Salvar questão
              </button>
            </div>
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <h2>Nova conquista</h2>
            <span>{defaultAchievementCatalog.length} base</span>
          </div>
          <div className="admin-form">
            <label>ID<input value={achievementDraft.id} onChange={(event) => setAchievementDraft((current) => ({ ...current, id: event.target.value }))} /></label>
            <label>Título<input value={achievementDraft.title} onChange={(event) => setAchievementDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>Descrição<textarea value={achievementDraft.description} onChange={(event) => setAchievementDraft((current) => ({ ...current, description: event.target.value }))} /></label>
            <label>XP reward<input type="number" value={achievementDraft.xpReward} onChange={(event) => setAchievementDraft((current) => ({ ...current, xpReward: Number(event.target.value) || 0 }))} /></label>
          </div>
          <button
            className="admin-primary"
            disabled={saving || !achievementDraft.id || !achievementDraft.title}
            onClick={() => runAdminTask('Salvando conquista...', async () => {
              await upsertAchievement(achievementDraft)
              setAchievementDraft(emptyAchievement)
            })}
            type="button"
          >
            Salvar conquista
          </button>
        </article>
      </section>

      <p className="admin-status">{status}</p>
    </div>
  )
}
