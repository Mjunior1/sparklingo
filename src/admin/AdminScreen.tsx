import './AdminScreen.css'
import { useMemo, useState } from 'react'
import { ArrowLeft, Database, Save, Shield, Sparkles } from 'lucide-react'
import {
  defaultAchievementCatalog,
  defaultLessonsCatalog,
  defaultQuizCatalog,
  seedDefaultCatalog,
  upsertAchievement,
  upsertLesson,
  upsertQuiz,
  type AchievementCatalogItem,
  type LessonCatalogItem,
  type LessonTone,
  type QuizCatalogItem,
} from '../services/catalog'
import { defaultPlatformConfig, savePlatformConfig, type PlatformConfig } from '../services/platform'

type AdminScreenProps = {
  lessons: LessonCatalogItem[]
  quizzes: QuizCatalogItem[]
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

const emptyAchievement: AchievementCatalogItem = {
  id: '',
  title: '',
  icon: 'star',
  description: '',
  xpReward: 20,
}

export function AdminScreen({ lessons, quizzes, onBack, onRefresh, platformConfig }: AdminScreenProps) {
  const [status, setStatus] = useState('Pronto para operar o catálogo.')
  const [saving, setSaving] = useState(false)
  const [lessonDraft, setLessonDraft] = useState<LessonCatalogItem>(emptyLesson)
  const [quizDraft, setQuizDraft] = useState<QuizCatalogItem>(emptyQuiz)
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
        <div>
          <p className="admin-kicker">Conteúdo + plataforma</p>
          <h1>Operar o SparkLingo sem deploy</h1>
          <p className="admin-copy">
            Cadastre lições, atualize quizzes, ajuste a plataforma e semeie o catálogo inicial direto no Firestore.
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
            <span>Status</span>
            <strong>{saving ? 'salvando' : 'ativo'}</strong>
          </article>
        </div>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <div className="admin-card-head">
            <h2>Seed inicial</h2>
            <Database size={18} />
          </div>
          <p>Popula `lessons`, `quizzes`, `quizQuestions` e `achievements` com o catálogo base do produto.</p>
          <button
            className="admin-primary"
            disabled={saving}
            onClick={() => runAdminTask('Semeando catálogo...', () => seedDefaultCatalog())}
            type="button"
          >
            <Sparkles size={16} />
            Semear Firestore
          </button>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <h2>Runtime da plataforma</h2>
            <Save size={18} />
          </div>
          <div className="admin-form">
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
            Salvar plataforma
          </button>
        </article>

        <article className="admin-card admin-card-form">
          <div className="admin-card-head">
            <h2>Nova lição</h2>
            <span>{lessons.length} ativas</span>
          </div>
          <div className="admin-form">
            <label>
              ID
              <input value={lessonDraft.id} onChange={(event) => setLessonDraft((current) => ({ ...current, id: event.target.value }))} />
            </label>
            <label>
              Categoria
              <input value={lessonDraft.category} onChange={(event) => setLessonDraft((current) => ({ ...current, category: event.target.value }))} />
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

        <article className="admin-card admin-card-form">
          <div className="admin-card-head">
            <h2>Novo quiz</h2>
            <span>{quizzes.length} ativos</span>
          </div>
          <div className="admin-form">
            <label>
              ID
              <input value={quizDraft.id} onChange={(event) => setQuizDraft((current) => ({ ...current, id: event.target.value }))} />
            </label>
            <label>
              Lesson ID
              <input value={quizDraft.lessonId} onChange={(event) => setQuizDraft((current) => ({ ...current, lessonId: event.target.value }))} />
            </label>
            <label>
              Título
              <input value={quizDraft.title} onChange={(event) => setQuizDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              Tag
              <select value={quizDraft.tag} onChange={(event) => setQuizDraft((current) => ({ ...current, tag: event.target.value as QuizCatalogItem['tag'] }))}>
                <option value="Gramática">Gramática</option>
                <option value="Vocabulário">Vocabulário</option>
                <option value="Listening">Listening</option>
                <option value="Reading">Reading</option>
                <option value="Speaking">Speaking</option>
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

        <article className="admin-card admin-card-form">
          <div className="admin-card-head">
            <h2>Nova conquista</h2>
            <span>{defaultAchievementCatalog.length} base</span>
          </div>
          <div className="admin-form">
            <label>
              ID
              <input value={achievementDraft.id} onChange={(event) => setAchievementDraft((current) => ({ ...current, id: event.target.value }))} />
            </label>
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
