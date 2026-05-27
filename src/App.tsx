import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Medal,
  Shield,
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

const normalizeText = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const getFallbackChoices = (category?: string) => {
  const normalizedCategory = normalizeText(category)

  if (normalizedCategory.includes('vocab')) {
    return ['Go to the information desk', 'Call the airline', 'Recheck departures']
  }

  if (normalizedCategory.includes('listen')) {
    return ['Listen again carefully', 'Ask someone to repeat', 'Look for the gate update']
  }

  if (normalizedCategory.includes('gram')) {
    return ['Introduce yourself clearly', 'Explain your routine', 'Answer with a short sentence']
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
      .map((chunk) => chunk.trim())
      .filter(Boolean)
  }

  return getFallbackChoices(lesson?.category)
}

const resolveLessonForAsset = (asset: SceneAssetRecord | null, lessons: LessonCatalogItem[]) => {
  if (!asset || !lessons.length) return lessons[0] ?? null

  const missionToken = normalizeText(asset.mission)
  const chapterToken = normalizeText(asset.chapter)
  const categoryToken = normalizeText(asset.category)

  return (
    lessons.find((lesson) => {
      const lessonMission = normalizeText(lesson.missionTitle)
      const lessonTitle = normalizeText(lesson.title)
      return (
        (missionToken && (lessonMission.includes(missionToken) || missionToken.includes(lessonMission))) ||
        (missionToken && (lessonTitle.includes(missionToken) || missionToken.includes(lessonTitle))) ||
        (categoryToken === 'airport' && lessonTitle.includes('airport')) ||
        (categoryToken === 'coffeeshop' && lessonMission.includes('daily routine')) ||
        (categoryToken === 'park' && lesson.category.toLowerCase().includes('listening')) ||
        (chapterToken && lessonMission.includes(chapterToken))
      )
    }) ??
    lessons[Math.max(0, asset.progressionOrder - 1)] ??
    lessons[0] ??
    null
  )
}

const getAssetImage = (
  asset: SceneAssetRecord,
  mode: 'background-desktop' | 'background-mobile' | 'scene-desktop' | 'scene-mobile' | 'poster' | 'character',
) => {
  if (mode === 'background-desktop') {
    return asset.backgroundImageUrl || asset.imageUrlDesktop || asset.imageUrl || asset.mobileImageUrl || asset.imageUrlMobile
  }

  if (mode === 'background-mobile') {
    return asset.mobileImageUrl || asset.imageUrlMobile || asset.backgroundImageUrl || asset.imageUrlDesktop || asset.imageUrl
  }

  if (mode === 'scene-mobile') {
    return asset.mobileImageUrl || asset.imageUrlMobile || asset.imageUrl || asset.imageUrlDesktop || asset.backgroundImageUrl
  }

  if (mode === 'scene-desktop') {
    return asset.imageUrlDesktop || asset.imageUrl || asset.backgroundImageUrl || asset.mobileImageUrl || asset.imageUrlMobile
  }

  if (mode === 'character') {
    return asset.mobileImageUrl || asset.imageUrlMobile || asset.backgroundImageUrl || asset.imageUrlDesktop || asset.imageUrl
  }

  return asset.imageUrl || asset.imageUrlDesktop || asset.backgroundImageUrl || asset.mobileImageUrl || asset.imageUrlMobile
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
  const [activeSceneId, setActiveSceneId] = useState('')
  const [pauseCarousel, setPauseCarousel] = useState(false)
  const carouselRef = useRef<HTMLDivElement | null>(null)

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

  const activeSceneAssets = useMemo(
    () =>
      [...sceneAssetsCatalog]
        .filter((asset) => asset.active)
        .sort((a, b) => a.progressionOrder - b.progressionOrder || a.title.localeCompare(b.title)),
    [sceneAssetsCatalog],
  )

  const featuredHeroAsset = useMemo(
    () =>
      activeSceneAssets.find((asset) => asset.featuredHero) ??
      activeSceneAssets[0] ??
      defaultSceneAssetsCatalog[0],
    [activeSceneAssets],
  )

  useEffect(() => {
    if (!featuredHeroAsset) return
    setActiveSceneId((current) =>
      current && activeSceneAssets.some((asset) => asset.id === current) ? current : featuredHeroAsset.id,
    )
  }, [activeSceneAssets, featuredHeroAsset])

  const selectedSceneAsset = useMemo(
    () =>
      activeSceneAssets.find((asset) => asset.id === activeSceneId) ??
      featuredHeroAsset ??
      defaultSceneAssetsCatalog[0],
    [activeSceneAssets, activeSceneId, featuredHeroAsset],
  )

  const selectedMissionLesson = useMemo(
    () => resolveLessonForAsset(selectedSceneAsset, lessonsCatalog),
    [lessonsCatalog, selectedSceneAsset],
  )

  const selectedMissionQuizzes = useMemo(
    () =>
      selectedMissionLesson
        ? quizCatalog.filter((quiz) => quiz.lessonId === selectedMissionLesson.id)
        : quizCatalog,
    [quizCatalog, selectedMissionLesson],
  )

  const selectedMissionQuestion = useMemo(() => {
    const quizIds = new Set(selectedMissionQuizzes.map((quiz) => quiz.id))
    return (
      quizQuestionCatalog.find((question) => question.active && quizIds.has(question.quizId)) ??
      quizQuestionCatalog.find((question) => question.active) ??
      null
    )
  }, [quizQuestionCatalog, selectedMissionQuizzes])

  const sceneCount = Math.max(5, selectedMissionQuizzes.length || 0)
  const missionProgressPercent = clampPercent(
    selectedMissionLesson?.progress ??
      Math.round((Math.max(1, selectedMissionQuizzes.length) / Math.max(1, sceneCount)) * 100),
  )
  const scenePrompt =
    selectedMissionQuestion?.prompt ||
    selectedMissionLesson?.practicalGoal ||
    'What should you do first?'
  const choiceOptions = buildChoiceOptions(selectedMissionQuestion, selectedMissionLesson)
  const sceneReward = selectedMissionQuestion?.reward ?? 25
  const xpProgress = clampPercent((totalXp / 750) * 100)
  const heroBackgroundDesktop = getAssetImage(selectedSceneAsset, 'background-desktop')
  const heroBackgroundMobile = getAssetImage(selectedSceneAsset, 'background-mobile')
  const heroCharacterImage = getAssetImage(selectedSceneAsset, 'character')
  const scenePromptImageDesktop = getAssetImage(selectedSceneAsset, 'scene-desktop')
  const scenePromptImageMobile = getAssetImage(selectedSceneAsset, 'scene-mobile')
  const carouselMissionLabel =
    selectedMissionLesson?.missionTitle ||
    selectedMissionLesson?.title ||
    selectedSceneAsset.mission ||
    selectedSceneAsset.title
  const emotionalDescription =
    selectedMissionLesson?.emotionalContext ||
    'Every conversation moves you closer to fluency.'
  const missionGoalCopy =
    selectedMissionLesson?.emotionalGoal ||
    'Keep moving. Every choice rebuilds your confidence.'

  useEffect(() => {
    setSelectedChoice(null)
  }, [selectedMissionQuestion?.id, selectedSceneAsset.id])

  useEffect(() => {
    if (pauseCarousel || activeSceneAssets.length < 2) return

    const interval = window.setInterval(() => {
      setActiveSceneId((current) => {
        const currentIndex = activeSceneAssets.findIndex((asset) => asset.id === current)
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % activeSceneAssets.length
        return activeSceneAssets[nextIndex]?.id ?? current
      })
    }, 5200)

    return () => window.clearInterval(interval)
  }, [activeSceneAssets, pauseCarousel])

  useEffect(() => {
    const selectedCard = carouselRef.current?.querySelector<HTMLElement>(`[data-scene-id="${activeSceneId}"]`)
    selectedCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeSceneId])

  const cycleScene = useCallback(
    (direction: 'prev' | 'next') => {
      if (!activeSceneAssets.length) return
      setActiveSceneId((current) => {
        const currentIndex = activeSceneAssets.findIndex((asset) => asset.id === current)
        if (currentIndex === -1) return activeSceneAssets[0].id
        const nextIndex =
          direction === 'next'
            ? (currentIndex + 1) % activeSceneAssets.length
            : (currentIndex - 1 + activeSceneAssets.length) % activeSceneAssets.length
        return activeSceneAssets[nextIndex].id
      })
    },
    [activeSceneAssets],
  )

  const heroStageStyle = {
    '--hero-overlay-opacity': `${selectedSceneAsset.overlayOpacity / 100}`,
    '--hero-overlay-color': selectedSceneAsset.overlayColor,
    '--hero-blur-strength': `${selectedSceneAsset.blurIntensity}px`,
    '--hero-brightness': `${selectedSceneAsset.brightness / 100}`,
    '--hero-focal-x': `${selectedSceneAsset.focalPointX}%`,
    '--hero-focal-y': `${selectedSceneAsset.focalPointY}%`,
  } as React.CSSProperties

  const handleContinueMission = () => {
    if (choiceOptions.length && !selectedChoice) {
      setSelectedChoice(choiceOptions[0])
      return
    }
  }

  if (status === 'loading' || (user && catalogLoading && !selectedMissionLesson)) {
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
    <div className="spark-hero-app spark-hero-app-immersive">
      <main className="spark-story-hero" style={heroStageStyle}>
        <div className="spark-story-backdrop" aria-hidden="true">
          <picture>
            <source media="(max-width: 860px)" srcSet={heroBackgroundMobile} />
            <img src={heroBackgroundDesktop} alt={selectedSceneAsset.title} />
          </picture>
          <div className={`spark-story-backdrop-overlay spark-story-backdrop-overlay-${selectedSceneAsset.cinematicStyle}`} />
          <div className="spark-story-backdrop-vignette" />
        </div>

        <section className="spark-story-column">
          <header className="spark-story-topbar">
            <div className="spark-story-logo">
              <Zap size={18} />
              <strong>SparkLingo</strong>
            </div>

            <div className="spark-story-status">
              <div className="spark-story-pill">
                <Flame size={15} />
                <div>
                  <strong>{streakDays}</strong>
                  <span>day streak</span>
                </div>
              </div>
              <div className="spark-story-pill">
                <Medal size={15} />
                <div>
                  <strong>{totalXp}</strong>
                  <span>XP</span>
                </div>
              </div>
              {isAdmin && (
                <button
                  className="spark-story-avatar spark-story-admin-entry"
                  type="button"
                  title="Open admin"
                  onClick={() => setView('admin')}
                >
                  <Shield size={18} />
                </button>
              )}
              <button className="spark-story-avatar" type="button" title="Sign out" onClick={() => signOut()}>
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="avatar-image" />
                ) : (
                  <UserRound size={18} />
                )}
              </button>
            </div>
          </header>

          <div className="spark-story-copy">
            <p className="spark-story-greeting">{greeting}, {firstName}! 👋</p>
            <h1>
              <span>Continue</span>
              <span>your</span>
              <span>adventure</span>
            </h1>
            <p>{platformConfig?.heroSubtitle || emotionalDescription}</p>
          </div>

          <div className="spark-story-mascot" aria-hidden="true">
            <img src={heroCharacterImage} alt="" />
          </div>

          <section
            className="spark-story-carousel-block"
            onMouseEnter={() => setPauseCarousel(true)}
            onMouseLeave={() => setPauseCarousel(false)}
          >
            <div className="spark-story-carousel-head">
              <div>
                <span className="spark-story-kicker">Current mission</span>
                <strong>{carouselMissionLabel}</strong>
                <small>{missionProgressPercent}% complete • Scene 1 of {sceneCount}</small>
              </div>
              <div className="spark-story-carousel-nav">
                <button type="button" aria-label="Previous mission" onClick={() => cycleScene('prev')}>
                  <ArrowLeft size={16} />
                </button>
                <button type="button" aria-label="Next mission" onClick={() => cycleScene('next')}>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="spark-story-carousel" ref={carouselRef}>
              {activeSceneAssets.map((asset) => {
                const lesson = resolveLessonForAsset(asset, lessonsCatalog)
                const posterProgress = clampPercent(lesson?.progress ?? 0)
                const posterImage = getAssetImage(asset, 'poster')
                const isActive = asset.id === selectedSceneAsset.id

                return (
                  <button
                    key={asset.id}
                    type="button"
                    data-scene-id={asset.id}
                    className={`spark-story-poster${isActive ? ' is-active' : ''}`}
                    onClick={() => setActiveSceneId(asset.id)}
                  >
                    <div className="spark-story-poster-art">
                      <img src={posterImage} alt={asset.title} />
                    </div>
                    <div className="spark-story-poster-overlay" />
                    <div className="spark-story-poster-copy">
                      <span>{asset.chapter || 'Chapter 1'}</span>
                      <strong>{asset.mission || asset.title}</strong>
                      <p>{lesson?.emotionalContext || missionGoalCopy}</p>
                      <div className="spark-story-poster-footer">
                        <small>Scene 1 of {Math.max(5, quizzesCatalogLengthFor(lesson, quizCatalog))}</small>
                        <small>{posterProgress}% complete</small>
                      </div>
                      <div className="spark-story-poster-progress">
                        <span style={{ width: `${posterProgress}%` }} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <button className="spark-story-cta" type="button" onClick={handleContinueMission}>
            <span>{platformConfig?.playCta || 'Continue Mission'}</span>
            <ArrowRight size={18} />
          </button>
        </section>

        <section className="spark-story-scene">
          <article className="spark-story-scene-frame">
            <div className="spark-story-scene-shell">
              <CinematicImage
                asset={{
                  ...selectedSceneAsset,
                  imageUrl: scenePromptImageDesktop,
                  imageUrlDesktop: scenePromptImageDesktop,
                  mobileImageUrl: scenePromptImageMobile,
                  imageUrlMobile: scenePromptImageMobile,
                }}
                mode="auto"
              />
              <NarrativeOverlay asset={selectedSceneAsset} />

              <header className="spark-story-scene-head">
                <button type="button" className="spark-story-scene-back" aria-label="Back">
                  <ArrowLeft size={18} />
                </button>
                <div className="spark-story-scene-label">
                  <strong>{selectedSceneAsset.mission || selectedSceneAsset.title}</strong>
                  <span>Scene 1 of {sceneCount}</span>
                </div>
                <div className="spark-story-scene-heart">3</div>
              </header>

              <SafeAreaContainer area={selectedSceneAsset.textSafeArea} className="spark-story-safe-copy">
                <div className="spark-story-dialogue">
                  <div className="spark-story-bubble">
                    <span>Mission prompt</span>
                    <strong>{scenePrompt}</strong>
                    <button type="button" aria-label="Play audio">
                      <Volume2 size={14} />
                    </button>
                  </div>

                  <div className="spark-story-options">
                    {choiceOptions.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        className={`spark-story-option${selectedChoice === choice ? ' is-selected' : ''}`}
                        onClick={() => setSelectedChoice(choice)}
                      >
                        <span>{choice}</span>
                        {selectedChoice === choice && <Volume2 size={16} />}
                      </button>
                    ))}
                  </div>

                  <footer className="spark-story-xp-footer">
                    <strong>Level {level}</strong>
                    <div className="spark-story-xp-track">
                      <div className="spark-story-xp-meta">
                        <span>{totalXp} / 750 XP</span>
                        <small>+{sceneReward} XP</small>
                      </div>
                      <div className="spark-story-xp-bar">
                        <span style={{ width: `${xpProgress}%` }} />
                      </div>
                    </div>
                  </footer>
                </div>
              </SafeAreaContainer>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

const quizzesCatalogLengthFor = (lesson: LessonCatalogItem | null, quizzes: QuizCatalogItem[]) =>
  lesson ? quizzes.filter((quiz) => quiz.lessonId === lesson.id).length : 0

export default App
