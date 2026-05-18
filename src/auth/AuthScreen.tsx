import { useMemo, useState } from 'react'
import { Flame, Globe2, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react'
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
              Configure o Firebase no front criando um arquivo <code>.env.local</code> com:
              <br />
              <code>{firebaseEnvVars.join(', ')}</code>
            </div>
          )}

          {platformConfig?.allowGoogleAuth !== false && (
            <button className="auth-social-button" disabled={!firebaseReady || submitting} onClick={handleGoogle} type="button">
              <Globe2 size={18} />
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
