import { useState } from 'react'
import { Play, Sparkles } from 'lucide-react'
import type { UserProfile } from '../services/profiles'
import './OnboardingScreen.css'

const goals = [
  {
    value: 'Speaking with confidence',
    title: 'Speaking fluency',
    copy: 'Quero falar com mais segurança em situações reais.',
  },
  {
    value: 'Listening immersion',
    title: 'Listening power',
    copy: 'Quero entender áudio mais rápido e com menos esforço.',
  },
  {
    value: 'Grammar consistency',
    title: 'Grammar control',
    copy: 'Quero reduzir erros e ganhar consistência.',
  },
  {
    value: 'Travel confidence',
    title: 'Travel mode',
    copy: 'Quero usar inglês de forma prática em viagens e rotina.',
  },
]

const focusSkills = [
  {
    value: 'Listening',
    title: 'Listening',
    copy: 'Áudios, ritmo e repetição inteligente.',
  },
  {
    value: 'Speaking',
    title: 'Speaking',
    copy: 'Frases, velocidade e confiança.',
  },
  {
    value: 'Gramática',
    title: 'Grammar',
    copy: 'Base, clareza e precisão.',
  },
  {
    value: 'Vocabulário',
    title: 'Vocabulary',
    copy: 'Palavras úteis e contexto visual.',
  },
]

const minuteOptions = [5, 10, 15, 20]

type OnboardingScreenProps = {
  profile: UserProfile
  onComplete: (payload: {
    onboardingCompleted: boolean
    learningGoal: string
    focusSkill: string
    dailyMinutes: number
  }) => Promise<void>
}

export function OnboardingScreen({ profile, onComplete }: OnboardingScreenProps) {
  const [goal, setGoal] = useState(profile.learningGoal || goals[0].value)
  const [focusSkill, setFocusSkill] = useState(profile.focusSkill || focusSkills[0].value)
  const [dailyMinutes, setDailyMinutes] = useState(profile.dailyMinutes || 10)
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <section className="onboarding-story">
          <span className="auth-form-label">Spark setup</span>
          <h1>Vamos calibrar sua jornada antes da primeira run.</h1>
          <p>
            Isso deixa o produto mais vivo: foco certo, ritmo certo e uma trilha que parece feita para você.
          </p>

          <div className="onboarding-note-grid">
            <article className="onboarding-note">
              <span>Objetivo</span>
              <strong>Mais retenção</strong>
            </article>
            <article className="onboarding-note">
              <span>Produto</span>
              <strong>Mais pessoal</strong>
            </article>
          </div>

          <img src="/pollinations/hero-scene.png" alt="Cena principal do SparkLingo em modo onboarding" />
        </section>

        <section className="onboarding-form">
          <div className="onboarding-head">
            <span className="auth-form-label">Onboarding</span>
            <h2>Defina seu foco inicial</h2>
            <p>{profile.displayName}, o Spark vai usar isso para personalizar a entrada da experiência.</p>
          </div>

          <div className="onboarding-field">
            <label>Qual é sua meta principal?</label>
            <div className="onboarding-choice-grid">
              {goals.map((item) => (
                <button
                  key={item.value}
                  className={`onboarding-choice${goal === item.value ? ' active' : ''}`}
                  onClick={() => setGoal(item.value)}
                  type="button"
                >
                  <strong>{item.title}</strong>
                  <small>{item.copy}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="onboarding-field">
            <label>Em qual skill você quer começar mais forte?</label>
            <div className="onboarding-choice-grid">
              {focusSkills.map((item) => (
                <button
                  key={item.value}
                  className={`onboarding-choice${focusSkill === item.value ? ' active' : ''}`}
                  onClick={() => setFocusSkill(item.value)}
                  type="button"
                >
                  <strong>{item.title}</strong>
                  <small>{item.copy}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="onboarding-field">
            <label>Quanto tempo por sessão faz sentido agora?</label>
            <div className="onboarding-minute-grid">
              {minuteOptions.map((minutes) => (
                <button
                  key={minutes}
                  className={`onboarding-minute${dailyMinutes === minutes ? ' active' : ''}`}
                  onClick={() => setDailyMinutes(minutes)}
                  type="button"
                >
                  <strong>{minutes} min</strong>
                  <small>{minutes <= 10 ? 'Ritmo leve' : minutes <= 15 ? 'Bom para consistência' : 'Sprint focada'}</small>
                </button>
              ))}
            </div>
          </div>

          <button
            className="onboarding-submit"
            disabled={submitting}
            type="button"
            onClick={async () => {
              try {
                setSubmitting(true)
                await onComplete({
                  onboardingCompleted: true,
                  learningGoal: goal,
                  focusSkill,
                  dailyMinutes,
                })
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? <Sparkles size={18} /> : <Play size={18} fill="currentColor" />}
            {submitting ? 'Preparando sua trilha...' : 'Salvar e começar'}
          </button>
        </section>
      </div>
    </div>
  )
}
