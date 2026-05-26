import './App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Flame,
  Heart,
  Medal,
  UserRound,
  Volume2,
  Zap,
} from 'lucide-react'
import { AdminScreen } from './admin/AdminScreen'
import { AuthEntry } from './auth/AuthEntry'
import { useAuth } from './auth/AuthProvider'
import { OnboardingScreen } from './auth/OnboardingScreen'
import { CinematicImage, NarrativeOverlay, SafeAreaContainer } from './components/scene/SceneRenderer'
import {
  defaultLessonsCatalog,
  defaultQuizCatalog,
  defaultQuizQuestions,
  getAchievementCatalog,
  getLessonsCatalog,
  getQuizCatalog,
  getQuizQuestions,
  type AchievementCatalogItem,
  type LessonCatalogItem,
  type QuizCatalogItem,
  type QuizQuestionItem,
} from './services/catalog'
import { getLessonProgressMap } from './services/lessonProgress'
import { getUserProgress, type UserProgress } from './services/progress'
import { defaultSceneAssetsCatalog, getSceneAssets, type SceneAssetRecord } from './services/sceneAssets'

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const getFallbackChoices = (category?: string) => {
  const normalizedCategory = (category ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalizedCategory.includes('vocab')) {
    return ['Go to the information desk', 'Call the airline', 'Recheck departures']
  }

  if (normalizedCategory.includes('listening')) {
    return ['Listen again carefully', 'Ask someone to repeat', 'Look for the gate update']
  }

  return ['Take the next step', 'Ask for help', 'Find a calm checkpoint']
}

const buildChoiceOptions = (question: QuizQuestionItem | null, lesson: LessonCatalogItem | null) => {
  if (!question) return getFallbackChoices(lesson?.category)

  if (
    (question.kind === 'multiple-choice' ||
      question.kind === 'drag-fill' ||
      question.kind === 'listening') &&
    question.options?.filter(Boolean).length
  ) {
    return question.options.filter(Boolean).slice(0, 3)
  }

  if (question.kind === 'ordering' && question.solution?.length) {
    return question.solution
      .join(' ')
      .split(' ')
      .slice(0, 3)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  return getFallbackChoices(lesson?.category)
}

function App() {
  const { status, user, profile, signOut, platformConfig, patchProfile } = useAuth()
  const [view, setView] = useState<'home' | 'admin'>('home')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [progressSnapshot, setProgressSnapshot] = useState<UserProgress | null>(null)
  const [lessonsCatalog, setLessonsCatalog] = useState<LessonCatalogItem[]>(defaultLessonsCatalog)
  const [quizCatalog, setQuizCatalog] = useState<QuizCatalogItem[]>(defaultQuizCatalog)
  const [achievementCatalog, setAchievementCatalog] = useState<AchievementCatalogItem[]>([])
  const [quizQuestionCatalog, setQuizQuestionCatalog] = useState<QuizQuestionItem[]>(defaultQuizQuestions)
  const [sceneAssetsCatalog, setSceneAssetsCatalog] = useState<SceneAssetRecord[]>(defaultSceneAssetsCatalog)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)

  const isAdmin = profile?.role === 'admin'
  const firstName = profile?.displayName?.split(' ')[0] ?? user?.displayName?.split(' ')[0] ?? 'Learner'
  const greeting = useMemo(() => getGreeting(), [])
  const streakDays = progressSnapshot?.streakDays ?? profile?.streak ?? 0
  const totalXp = progressSnapshot?.totalXp ?? profile?.xp ?? 480
  const level = Math.max(1, Math.ceil(totalXp / 75))

  const refreshBackendCatalog = useCallback(async () => {
    if (!user) return null

    const [
      nextLessonProgress,
      nextLessonsCatalog,
      nextQuizCatalog,
      nextAchievementCatalog,
      nextQuizQuestions,
      nextSceneAssets,
    ] = await Promise.all([
      getLessonProgressMap(user.uid),
      getLessonsCatalog(),
      getQuizCatalog(),
      getAchievementCatalog(),
      getQuizQuestions(),
      getSceneAssets(),
    ])

    setLessonsCatalog(
      (nextLessonsCatalog.length ? nextLessonsCatalog : defaultLessonsCatalog).map((lesson) => ({
        ...lesson,
        progress: nextLessonProgress[lesson.id] ?? lesson.progress,
      })),
    )
    setQuizCatalog(nextQuizCatalog.length ? nextQuizCatalog : defaultQuizCatalog)
    setAchievementCatalog(nextAchievementCatalog)
    setQuizQuestionCatalog(nextQuizQuestions.length ? nextQuizQuestions : defaultQuizQuestions)
    setSceneAssetsCatalog(nextSceneAssets.length ? nextSceneAssets : defaultSceneAssetsCatalog)

    return {
      nextLessonProgress,
      nextLessonsCatalog,
      nextQuizCatalog,
      nextAchievementCatalog,
      nextQuizQuestions,
      nextSceneAssets,
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setCatalogLoading(true)

    Promise.all([refreshBackendCatalog(), getUserProgress(user.uid).catch(() => null)])
      .then(([, progress]) => {
        if (cancelled) return
        setProgressSnapshot(progress)
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshBackendCatalog, user])

  const currentMissionLesson = useMemo(() => {
    if (!lessonsCatalog.length) return null

    const unfinished = lessonsCatalog
      .filter((lesson) => lesson.progress < 100)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))

    return unfinished[0] ?? lessonsCatalog[0]
  }, [lessonsCatalog])

  const currentMissionQuizzes = useMemo(
    () =>
      currentMissionLesson
        ? quizCatalog.filter((quiz) => quiz.lessonId === currentMissionLesson.id)
        : quizCatalog,
    [currentMissionLesson, quizCatalog],
  )

  const currentMissionQuestion = useMemo(() => {
    const currentQuizIds = new Set(currentMissionQuizzes.map((quiz) => quiz.id))
    return (
      quizQuestionCatalog.find((question) => question.active && currentQuizIds.has(question.quizId)) ??
      quizQuestionCatalog.find((question) => question.active) ??
      null
    )
  }, [currentMissionQuizzes, quizQuestionCatalog])

  const featuredHeroAsset = useMemo(
    () =>
      sceneAssetsCatalog.find((asset) => asset.active && asset.featuredHero) ??
      sceneAssetsCatalog.find((asset) => asset.active) ??
      defaultSceneAssetsCatalog[0],
    [sceneAssetsCatalog],
  )

  const heroSceneDesktopImage =
    featuredHeroAsset.imageUrlDesktop ||
    featuredHeroAsset.imageUrl ||
    featuredHeroAsset.mobileImageUrl ||
    featuredHeroAsset.imageUrlMobile
  const heroSceneMobileImage =
    featuredHeroAsset.imageUrlMobile ||
    featuredHeroAsset.mobileImageUrl ||
    featuredHeroAsset.imageUrlDesktop ||
    featuredHeroAsset.imageUrl

  const missionSceneCount = Math.max(5, currentMissionQuizzes.length || 0)
  const missionProgressPercent = clampPercent(
    currentMissionLesson?.progress ??
      Math.round((Math.max(1, currentMissionQuizzes.length) / missionSceneCount) * 100),
  )
  const missionTitle =
    featuredHeroAsset.mission ||
    currentMissionLesson?.missionTitle ||
    currentMissionLesson?.title ||
    'Airport Arrival'
  const missionChapter = featuredHeroAsset.chapter || 'Chapter 1'
  const missionContext =
    currentMissionLesson?.emotionalContext ||
    'You missed your flight and need to recover the journey with calm, clear English.'
  const missionEmotionalGoal =
    currentMissionLesson?.emotionalGoal || 'Keep going. Every choice rebuilds your confidence.'
  const scenePrompt =
    currentMissionQuestion?.prompt || currentMissionLesson?.practicalGoal || 'What should you do first?'
  const sceneBadge = currentMissionLesson?.tensionLabel || featuredHeroAsset.emotionalTone || 'hopeful urgency'
  const choiceOptions = buildChoiceOptions(currentMissionQuestion, currentMissionLesson)
  const sceneReward = currentMissionQuestion?.reward ?? 25
  const xpProgress = clampPercent((totalXp / 750) * 100)

  useEffect(() => {
    setSelectedChoice(null)
  }, [currentMissionQuestion?.id, featuredHeroAsset.id])

  const handleContinueMission = () => {
    if (choiceOptions.length && !selectedChoice) {
      setSelectedChoice(choiceOptions[0])
    }
  }

  if (status === 'loading' || (user && catalogLoading && !currentMissionLesson)) {
    return (
      <div className="spark-app-shell spark-app-shell-loading">
        <main className="spark-loading-panel">
          <p className="spark-loading-kicker">SparkLingo</p>
          <h1>Connecting your journey...</h1>
          <p>Your mission, progress and cinematic scene are getting ready.</p>
          <div className="spark-loading-pulse" />
        </main>
      </div>
    )
  }

  if (!user) {
    return <AuthEntry />
  }

  if (profile && platformConfig?.onboardingEnabled && !profile.onboardingCompleted) {
    return (
      <OnboardingScreen
        profile={profile}
        onComplete={async (payload) => {
          await patchProfile(payload)
        }}
      />
    )
  }

  if (isAdmin && view === 'admin') {
    return (
      <div className="app-shell app-shell-admin">
        <main className="main-panel">
          <AdminScreen
            lessons={lessonsCatalog}
            quizzes={quizCatalog}
            questions={quizQuestionCatalog}
            achievements={achievementCatalog}
            platformConfig={platformConfig}
            onBack={() => setView('home')}
            onRefresh={refreshBackendCatalog}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="spark-hero-app">
      {isAdmin && (
        <button className="spark-admin-pill" type="button" onClick={() => setView('admin')}>
          <span>Admin</span>
        </button>
      )}

      <main className="spark-cinematic-hero">
        <section className="spark-cinematic-left">
          <header className="spark-cinematic-topbar">
            <div className="spark-cinematic-logo">
              <Zap size={18} />
              <strong>SparkLingo</strong>
            </div>

            <div className="spark-cinematic-status">
              <div className="spark-cinematic-badge">
                <Flame size={15} />
                <div>
                  <strong>{streakDays}</strong>
                  <span>day streak</span>
                </div>
              </div>
              <div className="spark-cinematic-badge">
                <Medal size={15} />
                <div>
                  <strong>{totalXp}</strong>
                  <span>XP</span>
                </div>
              </div>
              <button className="spark-cinematic-avatar" type="button" title="Sign out" onClick={() => signOut()}>
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="avatar-image" />
                ) : (
                  <UserRound size={18} />
                )}
              </button>
            </div>
          </header>

          <div className="spark-cinematic-copy">
            <p className="spark-cinematic-greeting">{greeting}, {firstName}!</p>
            <h1>
              <span>Continue</span>
              <span>your</span>
              <span>adventure</span>
            </h1>
            <p>Every conversation moves you closer to fluency.</p>
          </div>

          <div className="spark-cinematic-fox">
            <img src={heroSceneMobileImage} alt={missionTitle} />
          </div>

          <article className="spark-cinematic-mission-card">
            <div className="spark-cinematic-mission-media">
              <img src={heroSceneDesktopImage} alt={missionTitle} />
            </div>

            <div className="spark-cinematic-mission-copy">
              <span className="spark-cinematic-chip">Current mission</span>
              <h2>{missionTitle}</h2>
              <p>{missionContext}</p>

              <div className="spark-cinematic-mission-meta">
                <span>{missionChapter}</span>
                <span>Scene 1 of {missionSceneCount}</span>
                <strong>{missionProgressPercent}% completed</strong>
              </div>

              <div className="spark-cinematic-progress">
                <span style={{ width: `${missionProgressPercent}%` }} />
              </div>
            </div>
          </article>

          <button className="spark-cinematic-cta" type="button" onClick={handleContinueMission}>
            <span>Continue Mission</span>
            <ArrowRight size={18} />
          </button>

          <div className="spark-cinematic-note">
            <Heart size={18} />
            <div>
              <strong>You're doing amazing!</strong>
              <span>{missionEmotionalGoal}</span>
            </div>
          </div>
        </section>

        <section className="spark-cinematic-right">
          <article className="spark-cinematic-scene">
            <CinematicImage asset={featuredHeroAsset} mode="desktop" />
            <NarrativeOverlay asset={featuredHeroAsset} />

            <header className="spark-cinematic-scene-head">
              <div className="spark-cinematic-scene-label">
                <strong>{missionTitle}</strong>
                <span>Scene 1 of {missionSceneCount}</span>
              </div>
              <div className="spark-cinematic-scene-chip">{missionTitle}</div>
            </header>

            <SafeAreaContainer area={featuredHeroAsset.textSafeArea} className="spark-cinematic-safe-copy">
              <div className="spark-cinematic-dialogue">
                <span>{sceneBadge}</span>
                <strong>{scenePrompt}</strong>
                <p>Choose the next move and keep the mission alive.</p>
              </div>

              <div className="spark-cinematic-choices">
                {choiceOptions.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={`spark-cinematic-choice${selectedChoice === choice ? ' is-selected' : ''}`}
                    onClick={() => setSelectedChoice(choice)}
                  >
                    <span>{choice}</span>
                    {selectedChoice === choice && <Volume2 size={16} />}
                  </button>
                ))}
              </div>

              <footer className="spark-cinematic-scene-footer">
                <div className="spark-cinematic-level-pill">
                  <span>Level {level}</span>
                </div>

                <div className="spark-cinematic-xp-bar">
                  <strong>{totalXp} / 750 XP</strong>
                  <div className="spark-cinematic-xp-track">
                    <span style={{ width: `${xpProgress}%` }} />
                  </div>
                </div>

                <strong className="spark-cinematic-reward">+{sceneReward} XP</strong>
              </footer>
            </SafeAreaContainer>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
