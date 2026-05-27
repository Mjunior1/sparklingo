import { useMemo, useState } from 'react'
import { Play, Sparkles, WandSparkles } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { AuthScreen } from './AuthScreen'
import './AuthEntry.css'

export function AuthEntry() {
  const { setAuthMode, platformConfig, firebaseReady } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  const metrics = useMemo(
    () => [
      {
        label: 'Run ativa',
        value: '5 min',
        copy: 'Uma sessão curta pode virar meia hora quando a jornada responde ao usuário.',
      },
      {
        label: 'Progressão',
        value: 'XP real',
        copy: 'Conta, streak, progresso por aula e recompensas persistidas no backend.',
      },
      {
        label: 'Companheiro',
        value: 'Spark vivo',
        copy: 'O mascote deixa de ser decorativo e passa a reagir à aventura do aluno.',
      },
    ],
    [],
  )

  const features = useMemo(
    () => [
      {
        label: 'Aventura',
        title: 'Mini jornadas com ritmo',
        copy: 'Warm-up, combo, streak e recompensas contínuas em vez de uma tela fria de exercícios.',
      },
      {
        label: 'Retenção',
        title: 'Feedback que puxa a próxima ação',
        copy: 'O usuário sente progresso imediato e entende sempre o próximo passo da jornada.',
      },
      {
        label: 'Produto',
        title: 'Base pronta para backend real',
        copy: 'Firebase Auth, Firestore, perfil, configuração global e espaço para painel de administração.',
      },
    ],
    [],
  )

  if (showAuth) {
    return <AuthScreen />
  }

  return (
    <div className="auth-entry-shell">
      <div className="auth-entry-card">
        <section className="auth-entry-copy">
          <div className="auth-entry-brand">
            <div className="auth-entry-brand-mark">
              <WandSparkles size={20} strokeWidth={2.2} />
            </div>
            <span>SparkLingo</span>
          </div>

          <div>
            <p className="micro-label">Hey, learner!</p>
            <h1>{platformConfig?.heroHeadline ?? 'Uma plataforma de inglês que parece aventura.'}</h1>
          </div>

          <p className="auth-entry-subtitle">
            {platformConfig?.heroSubheadline ??
              'Aprenda com ritmo, recompensa e feedback vivo. Entre para salvar progresso, desbloquear streak e transformar o front em produto real.'}
          </p>

          <div className="auth-entry-actions">
            <button
              className="auth-entry-primary"
              type="button"
              onClick={() => {
                setAuthMode('signup')
                setShowAuth(true)
              }}
            >
              <Play size={18} fill="currentColor" />
              Começar minha aventura
            </button>
            <button
              className="auth-entry-secondary"
              type="button"
              onClick={() => {
                setAuthMode('login')
                setShowAuth(true)
              }}
            >
              <Sparkles size={18} />
              Já tenho conta
            </button>
          </div>

          <div className="auth-entry-metrics">
            {metrics.map((metric) => (
              <article key={metric.label} className="auth-entry-metric">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.copy}</small>
              </article>
            ))}
          </div>

          <div className="auth-entry-features">
            {features.map((feature) => (
              <article key={feature.title} className="auth-entry-feature">
                <span>{feature.label}</span>
                <strong>{feature.title}</strong>
                <small>{feature.copy}</small>
              </article>
            ))}
          </div>

          <div className="auth-entry-footer">
            <div className="auth-entry-note">
              <span>Autenticação</span>
              <p>
                {firebaseReady
                  ? 'Google e e-mail/senha estão prontos para conectar o usuário à plataforma.'
                  : 'Configure o Firebase e a experiência completa de autenticação entra em ação.'}
              </p>
            </div>
            <div className="auth-entry-note">
              <span>Próximo passo</span>
              <p>Persistir progresso por lição, ranking real, painel de configuração e jornada personalizada.</p>
            </div>
          </div>
        </section>

        <section className="auth-entry-scene">
          <span className="auth-entry-scene-label">Adventure mode</span>
          <div className="auth-entry-scene-stage">
            <img src="/pollinations/hero-scene.png" alt="Cena principal do SparkLingo com mascote em palco lilás" />
            <div className="auth-entry-float top-right">
              <strong>+120 XP</strong>
              <small>Semana passada</small>
            </div>
            <div className="auth-entry-float bottom-left">
              <strong>{platformConfig?.heroCTA ?? 'A aventura começa aqui'}</strong>
              <small>Entre para continuar streak, combos e progresso salvo.</small>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
