import './App.css'
import { useMemo, useState } from 'react'

type FilterKey = 'Todos' | 'Gramatica' | 'Vocabulario' | 'Listening' | 'Reading' | 'Pronuncia'

type Exercise = {
  id: number
  tag: FilterKey
  level: 'Facil' | 'Medio'
  type: string
  title: string
  prompt: string
  mascot: string
  accent: string
  options: string[]
  correct: string
  detail: string
}

const navItems = [
  { label: 'Inicio', icon: '🏠', active: true },
  { label: 'Missoes', icon: '🎯' },
  { label: 'Aulas', icon: '📚' },
  { label: 'Quizzes', icon: '🧩' },
  { label: 'Desafios', icon: '🔥' },
  { label: 'Ranking', icon: '🏆' },
  { label: 'Colecao', icon: '✨' },
  { label: 'Perfil', icon: '👤' },
]

const dailyMissions = [
  { icon: '🎧', title: 'Ouça 3 audios', progress: '2/3', xp: 30 },
  { icon: '📝', title: 'Acerte 5 perguntas', progress: '3/5', xp: 40 },
  { icon: '⚡', title: 'Estude por 15 minutos', progress: '10/15', xp: 20 },
  { icon: '🚀', title: 'Complete 1 quiz', progress: '0/1', xp: 50 },
]

const lessonCards = [
  { category: 'Vocabulario', title: 'At the Airport', progress: 60, art: '✈️' },
  { category: 'Gramatica', title: 'Present Simple', progress: 40, art: '✏️' },
  { category: 'Listening', title: 'Daily Routines', progress: 20, art: '🎧' },
]

const filters: FilterKey[] = ['Todos', 'Gramatica', 'Vocabulario', 'Listening', 'Reading', 'Pronuncia']

const exercises: Exercise[] = [
  {
    id: 1,
    tag: 'Gramatica',
    level: 'Facil',
    type: 'Multipla escolha',
    title: 'Forma correta',
    prompt: 'She _____ to school every day.',
    mascot: '🧒',
    accent: 'sunrise',
    options: ['go', 'goes', 'going', 'gone'],
    correct: 'goes',
    detail: 'Dica: com he, she e it usamos o verbo com "s".',
  },
  {
    id: 2,
    tag: 'Vocabulario',
    level: 'Medio',
    type: 'Arraste e solte',
    title: 'Complete a frase',
    prompt: 'I enjoy _____ in the mountains.',
    mascot: '🏔️',
    accent: 'mint',
    options: ['swim', 'to swim', 'swimming', 'swam'],
    correct: 'swimming',
    detail: 'Depois de "enjoy", o verbo costuma vir com "ing".',
  },
  {
    id: 3,
    tag: 'Listening',
    level: 'Facil',
    type: 'Ouça e escolha',
    title: 'Audio rapido',
    prompt: 'Listen to the audio and choose the correct answer.',
    mascot: '🐶',
    accent: 'sky',
    options: ["It's a cat.", "It's a dog.", "It's a bird."],
    correct: "It's a dog.",
    detail: 'Aqui entraria o player real de audio com TTS ou arquivos gravados.',
  },
  {
    id: 4,
    tag: 'Reading',
    level: 'Medio',
    type: 'Preencha a lacuna',
    title: 'Palavra correta',
    prompt: 'If it rains tomorrow, we _____ at home and watch movies.',
    mascot: '🌧️',
    accent: 'lilac',
    options: ['will stay', 'stay', 'stayed', 'stays'],
    correct: 'will stay',
    detail: 'Frases com "if" no futuro costumam usar "will" na oracao principal.',
  },
  {
    id: 5,
    tag: 'Reading',
    level: 'Medio',
    type: 'Ordene as palavras',
    title: 'Monte a frase',
    prompt: 'Where / are / you / from / ?',
    mascot: '🗺️',
    accent: 'sunrise',
    options: ['Where', 'are', 'you', 'from', '?'],
    correct: 'Where',
    detail: 'Numa versao completa, essas pecas seriam drag and drop.',
  },
  {
    id: 6,
    tag: 'Vocabulario',
    level: 'Facil',
    type: 'Encontre o par',
    title: 'Match de palavras',
    prompt: 'Match the words with their meanings.',
    mascot: '🔗',
    accent: 'mint',
    options: ['Happy = Feliz', 'Big = Grande', 'Fast = Rapido', 'Beautiful = Bonito'],
    correct: 'Happy = Feliz',
    detail: 'Esse card demonstra outro formato de interacao reutilizando a mesma base visual.',
  },
]

const leaderboard = [
  { name: 'Kate', xp: '1250 XP' },
  { name: 'You', xp: '980 XP', highlight: true },
  { name: 'Mark', xp: '870 XP' },
  { name: 'Sam', xp: '690 XP' },
]

function App() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('Todos')
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({
    1: 'goes',
    2: 'swimming',
    3: "It's a dog.",
    4: 'will stay',
  })

  const visibleExercises = useMemo(() => {
    if (activeFilter === 'Todos') {
      return exercises
    }

    return exercises.filter((exercise) => exercise.tag === activeFilter)
  }, [activeFilter])

  const completedExercises = Object.keys(selectedAnswers).length

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">✨</span>
          <div>
            <strong>SparkLingo</strong>
            <span>play to learn</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button key={item.label} className={`nav-pill${item.active ? ' active' : ''}`}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="streak-card purple-panel">
          <p>🔥 Sequencia</p>
          <strong>12 dias!</strong>
          <div className="streak-mascot">👾</div>
          <button>Keep going!</button>
        </div>
      </aside>

      <main className="main-content">
        <section className="hero-panel glass-panel">
          <div className="hero-copy">
            <div className="topbar">
              <div>
                <p className="eyebrow">Hey, Learner! 👋</p>
                <h1>Vamos turbinar seu ingles hoje?</h1>
              </div>

              <div className="status-pills">
                <div className="status-pill">⚡ 25</div>
                <div className="status-pill">💎 340</div>
                <div className="status-pill">🔔 1</div>
                <div className="avatar-pill">🧑</div>
              </div>
            </div>

            <div className="xp-row">
              <div className="level-badge">
                <span>Nivel</span>
                <strong>7</strong>
              </div>
              <div className="xp-progress">
                <div className="xp-labels">
                  <span>XP</span>
                  <span>350 / 650</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: '54%' }} />
                </div>
              </div>
              <div className="gift-badge">🎁</div>
            </div>
          </div>

          <div className="hero-art">
            <div className="speech-bubble">Let&apos;s learn!</div>
            <div className="mascot-circle">
              <span className="spark spark-one">✦</span>
              <span className="spark spark-two">✦</span>
              <div className="mascot">😺</div>
              <div className="pencil">✏️</div>
            </div>
          </div>
        </section>

        <section className="mission-row">
          {dailyMissions.map((mission) => (
            <article key={mission.title} className="glass-panel mission-card">
              <div className="mission-icon">{mission.icon}</div>
              <div>
                <h3>{mission.title}</h3>
                <p>{mission.progress}</p>
              </div>
              <div className="mission-footer">
                <div className="micro-track">
                  <span style={{ width: mission.progress === '0/1' ? '8%' : mission.progress === '2/3' ? '66%' : mission.progress === '3/5' ? '60%' : '70%' }} />
                </div>
                <strong>{mission.xp} XP</strong>
              </div>
            </article>
          ))}
        </section>

        <section className="journey-row">
          <div className="journey-header">
            <div>
              <p className="eyebrow">Continue sua jornada</p>
              <h2>Escolha seu quiz</h2>
            </div>

            <div className="filter-row">
              {filters.map((filter) => (
                <button
                  key={filter}
                  className={`filter-chip${filter === activeFilter ? ' active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="content-grid">
            <div className="lesson-strip">
              {lessonCards.map((lesson) => (
                <article key={lesson.title} className="glass-panel lesson-card">
                  <div className="lesson-meta">
                    <span>{lesson.category}</span>
                    <strong>{lesson.title}</strong>
                  </div>
                  <div className="lesson-art">{lesson.art}</div>
                  <div className="progress-track">
                    <div className="progress-fill green" style={{ width: `${lesson.progress}%` }} />
                  </div>
                  <small>{lesson.progress}% concluido</small>
                </article>
              ))}
            </div>

            <aside className="stats-column">
              <article className="glass-panel ring-card">
                <h3>Seu progresso</h3>
                <div className="progress-ring">
                  <div className="ring-center">
                    <strong>65%</strong>
                    <span>do nivel 7</span>
                  </div>
                </div>
                <p>Faltam 300 XP para o proximo nivel</p>
                <button>Ver progresso</button>
              </article>

              <article className="purple-panel side-highlight">
                <p>Desafio especial</p>
                <strong>Complete 5 quizzes esta semana</strong>
                <div className="challenge-icons">🏆 💎 🛡️</div>
                <div className="progress-track soft">
                  <div className="progress-fill gold" style={{ width: '60%' }} />
                </div>
                <button>Quero ganhar!</button>
              </article>
            </aside>
          </div>
        </section>

        <section className="exercise-section">
          <div className="section-heading">
            <p className="eyebrow">Tipos de exercicios</p>
            <h2>Uma plataforma divertida e dinamica de verdade</h2>
          </div>

          <div className="exercise-grid">
            {visibleExercises.map((exercise) => {
              const selected = selectedAnswers[exercise.id]

              return (
                <article key={exercise.id} className={`exercise-card accent-${exercise.accent}`}>
                  <div className="exercise-top">
                    <div>
                      <span className="exercise-tag">{exercise.id}. {exercise.type}</span>
                      <h3>{exercise.title}</h3>
                    </div>
                    <span className={`level-pill ${exercise.level === 'Facil' ? 'easy' : 'medium'}`}>{exercise.level}</span>
                  </div>

                  <p className="exercise-prompt">{exercise.prompt}</p>

                  {exercise.tag === 'Listening' && (
                    <div className="audio-bar">
                      <button>▶</button>
                      <div className="waveform" />
                      <span>0:00 / 0:05</span>
                    </div>
                  )}

                  {exercise.id === 5 ? (
                    <div className="word-bank">
                      {exercise.options.map((word) => (
                        <span key={word} className="word-chip">
                          {word}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="options-list">
                      {exercise.options.map((option) => {
                        const isSelected = selected === option
                        const isCorrect = option === exercise.correct

                        return (
                          <button
                            key={option}
                            className={`option-button${isSelected ? ' selected' : ''}${isSelected && isCorrect ? ' correct' : ''}`}
                            onClick={() =>
                              setSelectedAnswers((current) => ({
                                ...current,
                                [exercise.id]: option,
                              }))
                            }
                          >
                            <span>{option}</span>
                            {isSelected && isCorrect && <span>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="exercise-bottom">
                    <p>{exercise.detail}</p>
                    <div className="exercise-mascot">{exercise.mascot}</div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="footer-widgets">
          <article className="glass-panel mini-stat">
            <p>Streak</p>
            <strong>7 dias</strong>
            <div className="week-dots">
              <span className="filled" />
              <span className="filled" />
              <span className="filled" />
              <span className="filled" />
              <span className="filled" />
              <span />
              <span />
            </div>
          </article>

          <article className="glass-panel mini-stat">
            <p>Weekly goal</p>
            <strong>70 / 100 estrelas</strong>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: '70%' }} />
            </div>
          </article>

          <article className="glass-panel mini-stat">
            <p>Ranking semanal</p>
            <ul className="ranking-list">
              {leaderboard.map((player) => (
                <li key={player.name} className={player.highlight ? 'highlight' : ''}>
                  <span>{player.name}</span>
                  <strong>{player.xp}</strong>
                </li>
              ))}
            </ul>
          </article>

          <article className="glass-panel mini-stat">
            <p>Badges recentes</p>
            <div className="badges-row">
              <span>🎧</span>
              <span>⭐</span>
              <span>🎯</span>
            </div>
            <small>{completedExercises} exercicios respondidos nesta sessao</small>
          </article>
        </section>

        <footer className="bottom-nav">
          <button>🗺️ Mapa</button>
          <button>🔎 Review</button>
          <button className="play-button">🎮 Play</button>
          <button>🛍️ Store</button>
          <button>📅 Eventos</button>
        </footer>
      </main>
    </div>
  )
}

export default App
