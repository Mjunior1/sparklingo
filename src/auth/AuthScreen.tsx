import { useMemo, useState } from 'react'
import { AlertCircle, Flame, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useAuth } from './AuthProvider'
import './AuthScreen.css'

const firebaseEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.1 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.9-.9 6.5-2.5l-3.1-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2l-3.2 2.5C4.8 19.6 8.1 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.4 13.8c-.2-.6-.4-1.2-.4-1.8s.1-1.3.4-1.8L3.2 7.7C2.4 9.1 2 10.5 2 12s.4 2.9 1.2 4.3l3.2-2.5z"
      />
      <path
        fill="#FBBC05"
        d="M12 6c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.8 3.1 14.6 2 12 2 8.1 2 4.8 4.4 3.2 7.7l3.2 2.5C7.2 7.8 9.4 6 12 6z"
      />
    </svg>
  )
}

const prettifyAuthError = (message: string) => {
  if (message.includes('auth/invalid-credential')) return 'Credenciais inválidas. Verifique o e-mail e a senha.'
  if (message.includes('auth/popup-closed-by-user')) return 'O login com Google foi fechado antes de concluir.'
  if (message.includes('auth/email-already-in-use')) return 'Esse e-mail já está em uso.'
  if (message.includes('auth/weak-password')) return 'Use uma senha mais forte, com pelo menos 6 caracteres.'
  return 'Não foi possível autenticar agora. Tente novamente.'
}

export function AuthScreen() {
  const {
    authMode,
    firebaseReady,
    platformConfig,
    setAuthMode,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const title = authMode === 'login' ? 'Volte para sua jornada' : 'Crie sua aventura'
  const subtitle = authMode === 'login'
    ? 'Entre para continuar sua streak, seus combos e sua evolução.'
    : 'Comece sua conta, salve progresso e conecte o produto a uma base real.'

  const benefits = useMemo(() => ([
    {
      label: 'Progresso',
      title: 'XP salvo na nuvem',
      copy: 'Seu ritmo, streak e evolução ficam sincronizados com o backend.',
    },
    {
      label: 'Sessão',
      title: 'Run contínua',
      copy: 'A experiência deixa de ser estática e passa a responder à sua jornada real.',
    },
    {
      label: 'Conta',
      title: 'Base de produto',
      copy: 'Autenticação, perfil, preferências e configuração de plataforma em Firestore.',
    },
  ]), [])

  const handleGoogle = async () => {
    try {
      setSubmitting(true)
      setError('')
      await signInWithGoogle()
    } catch (nextError) {
      setError(prettifyAuthError(String(nextError)))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')
      if (authMode === 'login') {
        await signInWithPassword(email, password)
      } else {
        await signUpWithPassword(name, email, password)
      }
    } catch (nextError) {
      setError(prettifyAuthError(String(nextError)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <section className="auth-story">
          <span className="auth-story-label">SparkLingo access</span>
          <h1>{platformConfig?.heroHeadline ?? 'Uma sessão curta pode virar um hábito forte.'}</h1>
          <p>{platformConfig?.heroSubtitle ?? 'Entre, continue sua jornada e deixe o Spark manter o ritmo da sua aventura.'}</p>

          <div className="auth-benefits">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="auth-benefit">
                <span>{benefit.label}</span>
                <strong>{benefit.title}</strong>
                <small>{benefit.copy}</small>
              </article>
            ))}
          </div>

          <div className="auth-mascot-stage">
            <div className="auth-mascot-scene">
              <img src="/pollinations/hero-scene.png" alt="Cena premium do SparkLingo com mascote em palco lilás" />
            </div>
            <div className="auth-floating-card top-right">
              <strong>Modo vivo</strong>
              <span>auth + progresso + backend real</span>
            </div>
            <div className="auth-floating-card bottom-left">
              <strong>{platformConfig?.playCta ?? 'Começar minha aventura'}</strong>
              <span>5 min podem virar 30+</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <span className="auth-form-label">Acesso</span>
          <div className="auth-card-head">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <div className="auth-mode-switch">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')} type="button">
              Entrar
            </button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')} type="button">
              Criar conta
            </button>
          </div>

          {!firebaseReady && (
            <div className="auth-setup-box">
              <div className="auth-setup-head">
                <AlertCircle size={18} />
                <strong>Firebase não configurado nesta execução</strong>
              </div>
              <p>
                Localmente, use <code>.env.local</code>. No Railway, cadastre as variáveis de ambiente do front.
              </p>
              <code>{firebaseEnvVars.join(', ')}</code>
            </div>
          )}

          {platformConfig?.allowGoogleAuth !== false && (
            <button className="auth-social-button" disabled={!firebaseReady || submitting} onClick={handleGoogle} type="button">
              <GoogleMark />
              Continuar com Google
            </button>
          )}

          <div className="auth-divider">ou siga com e-mail</div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {authMode === 'signup' && (
              <div className="auth-field">
                <label htmlFor="name">Nome</label>
                <input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Como o Spark deve te chamar?" />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit-button" disabled={!firebaseReady || submitting} type="submit">
              {authMode === 'login' ? <Play size={18} /> : <Sparkles size={18} />}
              {submitting ? 'Conectando...' : authMode === 'login' ? 'Entrar e continuar' : 'Criar conta e começar'}
            </button>
          </form>

          <button className="auth-secondary-note" type="button">
            <ShieldCheck size={16} /> Firestore guarda perfis, streak, progresso e configuração da plataforma.
          </button>
          <button className="auth-secondary-note" type="button">
            <Zap size={16} /> Próximo passo natural: progresso real por lição, ranking persistente e painel admin.
          </button>
          <button className="auth-secondary-note" type="button">
            <Flame size={16} /> A base já fica pronta para Google, e-mail/senha e onboarding.
          </button>
        </section>
      </div>
    </div>
  )
}
