import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Medal, Shield, UserRound, Zap } from 'lucide-react'
import { AdminScreen } from './admin/AdminScreen'
import { AuthEntry } from './auth/AuthEntry'
import { useAuth } from './auth/AuthProvider'
import { OnboardingScreen } from './auth/OnboardingScreen'
import { CinematicImage, NarrativeOverlay, SafeAreaContainer } from './components/scene/SceneRenderer'
import {
  defaultAchievementCatalog,
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
import { defaultPlatformConfig } from './services/platform'
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
        (categoryToken === 'park' && lessonMission.includes('park')) ||
        (chapterToken && lessonMission.includes(chapterToken))
      )
    }) ??
    lessons[Math.max(0, asset.progressionOrder - 1)] ??
    lessons[0] ??
    null
  )
}

const resolveSceneAssetForLesson = (lesson: LessonCatalogItem, sceneAssets: SceneAssetRecord[]) => {
  const lessonMission = normalizeText(lesson.missionTitle || lesson.title)
  const lessonTitle = normalizeText(lesson.title)

  return (
    sceneAssets.find((asset) => {
      const assetMission = normalizeText(asset.mission)
      const assetTitle = normalizeText(asset.title)

      return (
        (lessonMission && assetMission && (lessonMission.includes(assetMission) || assetMission.includes(lessonMission))) ||
        (lessonMission && assetTitle && (lessonMission.includes(assetTitle) || assetTitle.includes(lessonMission))) ||
        (lessonTitle && assetMission && (lessonTitle.includes(assetMission) || assetMission.includes(lessonTitle))) ||
        (lessonTitle && assetTitle && (lessonTitle.includes(assetTitle) || assetTitle.includes(lessonTitle)))
      )
    }) ?? null
  )
}

const toneToOverlayStyle = (tone: LessonCatalogItem['tone']): SceneAssetRecord['cinematicStyle'] => {
  if (tone === 'mint') return 'aurora-soft'
  if (tone === 'sky') return 'cinematic-violet'
  return 'ember-glow'
}

const lessonCategoryToSceneCategory = (lesson: LessonCatalogItem): SceneAssetRecord['category'] => {
  const lessonTitle = normalizeText(lesson.title)
  const missionTitle = normalizeText(lesson.missionTitle)

  if (lessonTitle.includes('airport') || missionTitle.includes('airport')) return 'Airport'
  if (lessonTitle.includes('coffee') || missionTitle.includes('coffee')) return 'CoffeeShop'
  if (lessonTitle.includes('park') || missionTitle.includes('park')) return 'Park'
  return 'General'
}

const buildFallbackSceneAssetForLesson = (lesson: LessonCatalogItem, progressionOrder: number): SceneAssetRecord => {
  const heroDesktop =
    lesson.mediaSlots?.heroImageDesktop?.path ||
    lesson.mediaSlots?.emotionalBackground?.path ||
    lesson.mediaSlots?.thumbnail?.path ||
    lesson.image
  const heroMobile =
    lesson.mediaSlots?.heroImageMobile?.path ||
    lesson.mediaSlots?.heroImageDesktop?.path ||
    lesson.mediaSlots?.emotionalBackground?.path ||
    lesson.image
  const poster =
    lesson.mediaSlots?.thumbnail?.path ||
    lesson.mediaSlots?.heroImageDesktop?.path ||
    lesson.mediaSlots?.heroImageMobile?.path ||
    lesson.image

  return {
    ...defaultSceneAssetsCatalog[0],
    id: `lesson-${lesson.id}`,
    title: lesson.missionTitle || lesson.title,
    slug: normalizeText(lesson.missionTitle || lesson.title).replace(/\s+/g, '-'),
    category: lessonCategoryToSceneCategory(lesson),
    chapter: `Chapter ${progressionOrder + 1}`,
    mission: lesson.missionTitle || lesson.title,
    emotionalTone: lesson.emotionalGoal || lesson.emotionalContext || lesson.blurb,
    missionCardDescription: lesson.practicalGoal || lesson.blurb,
    heroBackgroundImageUrl: heroDesktop,
    backgroundImageUrl: heroDesktop,
    imageUrl: poster,
    mobileImageUrl: heroMobile,
    imageUrlDesktop: poster,
    imageUrlMobile: heroMobile,
    focalPoint: 'center',
    focalPointX: 50,
    focalPointY: 50,
    overlayOpacity: 54,
    overlayColor: '#090d24',
    overlayIntensity: 54,
    brightness: 100,
    blurIntensity: 8,
    textSafeArea: defaultSceneAssetsCatalog[0].textSafeArea,
    characterSafeArea: defaultSceneAssetsCatalog[0].characterSafeArea,
    cinematicStyle: toneToOverlayStyle(lesson.tone),
    uiOverlayStyle: toneToOverlayStyle(lesson.tone),
    progressionOrder: progressionOrder + 1,
    featuredHero: false,
    showInHero: true,
    active: true,
  }
}

const getAssetImage = (
  asset: SceneAssetRecord,
  mode: 'background-desktop' | 'background-mobile' | 'poster',
) => {
  if (mode === 'background-desktop') {
    return (
      asset.heroBackgroundImageUrl ||
      asset.backgroundImageUrl ||
      asset.imageUrlDesktop ||
      asset.imageUrl ||
      asset.mobileImageUrl ||
      asset.imageUrlMobile
    )
  }

  if (mode === 'background-mobile') {
    return (
      asset.mobileImageUrl ||
      asset.imageUrlMobile ||
      asset.heroBackgroundImageUrl ||
      asset.backgroundImageUrl ||
      asset.imageUrlDesktop ||
      asset.imageUrl
    )
  }

  return asset.imageUrl || asset.imageUrlDesktop || asset.mobileImageUrl || asset.imageUrlMobile || asset.heroBackgroundImageUrl
}

type MissionVisual = {
  id: string
  asset: SceneAssetRecord
  lesson: LessonCatalogItem | null
  title: string
  description: string
  chapterLabel: string
  sceneCount: number
  sceneLabel: string
  progressPercent: number
  progressLabel: string
  statusLabel: string
  posterImage: string
  backgroundDesktop: string
  backgroundMobile: string
}

const buildMissionVisual = (
  lesson: LessonCatalogItem | null,
  quizzes: QuizCatalogItem[],
  asset: SceneAssetRecord,
  progressionOrder: number,
): MissionVisual => {
  const lessonQuizzes = lesson ? quizzes.filter((quiz) => quiz.lessonId === lesson.id) : []
  const sceneCount = Math.max(lessonQuizzes.length || 0, 5)
  const progressPercent = clampPercent(lesson?.progress ?? 0)

  return {
    id: lesson?.id || asset.id,
    asset,
    lesson,
    title: lesson?.missionTitle || lesson?.title || asset.mission || asset.title,
    description:
      asset.missionCardDescription ||
      lesson?.practicalGoal ||
      lesson?.blurb ||
      'Siga a próxima cena e continue avançando na jornada.',
    chapterLabel: asset.chapter || `Chapter ${progressionOrder + 1}`,
    sceneCount,
    sceneLabel: `Scene 1 of ${sceneCount}`,
    progressPercent,
    progressLabel: `${progressPercent}% completed`,
    statusLabel: progressPercent >= 100 ? 'Completed' : progressPercent > 0 ? 'In progress' : 'Ready',
    posterImage: getAssetImage(asset, 'poster'),
    backgroundDesktop: getAssetImage(asset, 'background-desktop'),
    backgroundMobile: getAssetImage(asset, 'background-mobile'),
  }
}

function App() {
  const { status, user, profile, signOut, platformConfig, patchProfile } = useAuth()
  const [view, setView] = useState<'home' | 'admin'>('home')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [progressSnapshot, setProgressSnapshot] = useState<UserProgress | null>(null)
  const [lessonsCatalog, setLessonsCatalog] = useState<LessonCatalogItem[]>(defaultLessonsCatalog)
  const [quizCatalog, setQuizCatalog] = useState<QuizCatalogItem[]>(defaultQuizCatalog)
  const [achievementCatalog, setAchievementCatalog] = useState<AchievementCatalogItem[]>(defaultAchievementCatalog)
  const [quizQuestionCatalog, setQuizQuestionCatalog] = useState<QuizQuestionItem[]>(defaultQuizQuestions)
  const [sceneAssetsCatalog, setSceneAssetsCatalog] = useState<SceneAssetRecord[]>(defaultSceneAssetsCatalog)
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null)
  const [previousMissionId, setPreviousMissionId] = useState<string | null>(null)
  const [pauseCarousel, setPauseCarousel] = useState(false)

  const missionCardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const activeMissionRef = useRef<string | null>(null)

  const greeting = useMemo(() => getGreeting(), [])
  const isAdmin = profile?.role === 'admin'
  const firstName = profile?.displayName?.split(' ')[0] ?? user?.displayName?.split(' ')[0] ?? 'Learner'
  const streakDays = progressSnapshot?.streakDays ?? profile?.streak ?? 0
  const totalXp = progressSnapshot?.totalXp ?? profile?.xp ?? 480

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
    setAchievementCatalog(nextAchievementCatalog.length ? nextAchievementCatalog : defaultAchievementCatalog)
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
        if (!cancelled) setProgressSnapshot(progress)
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

  const missionVisuals = useMemo(() => {
    if (lessonsCatalog.length) {
      const lessonsFromBackend = lessonsCatalog
        .map((lesson, index) => {
          const matchingAsset = resolveSceneAssetForLesson(lesson, activeSceneAssets)
          const asset = matchingAsset ?? buildFallbackSceneAssetForLesson(lesson, index)
          const shouldShow = matchingAsset ? matchingAsset.showInHero : true
          return shouldShow ? buildMissionVisual(lesson, quizCatalog, asset, index) : null
        })
        .filter((mission): mission is MissionVisual => mission !== null)

      if (lessonsFromBackend.length) return lessonsFromBackend
    }

    const visibleAssets = activeSceneAssets.filter((asset) => asset.showInHero)
    return visibleAssets.map((asset, index) =>
      buildMissionVisual(resolveLessonForAsset(asset, lessonsCatalog), quizCatalog, asset, index),
    )
  }, [activeSceneAssets, lessonsCatalog, quizCatalog])

  const featuredMission = useMemo(() => {
    const featuredAsset = activeSceneAssets.find((asset) => asset.featuredHero) ?? null
    if (featuredAsset) {
      const matchingMission =
        missionVisuals.find((mission) => mission.asset.id === featuredAsset.id) ||
        missionVisuals.find(
          (mission) => mission.lesson && resolveSceneAssetForLesson(mission.lesson, activeSceneAssets)?.id === featuredAsset.id,
        )

      if (matchingMission) return matchingMission
    }

    return missionVisuals[0] ?? null
  }, [activeSceneAssets, missionVisuals])

  useEffect(() => {
    if (!missionVisuals.length) return

    if (!activeMissionId || !missionVisuals.some((mission) => mission.id === activeMissionId)) {
      setActiveMissionId(featuredMission?.id ?? missionVisuals[0]?.id ?? null)
    }
  }, [activeMissionId, featuredMission, missionVisuals])

  const activeMission =
    missionVisuals.find((mission) => mission.id === activeMissionId) ??
    featuredMission ??
    missionVisuals[0] ??
    null

  useEffect(() => {
    if (!activeMissionId) return

    const previousId = activeMissionRef.current
    if (previousId && previousId !== activeMissionId) {
      setPreviousMissionId(previousId)
      const timeout = window.setTimeout(
        () => setPreviousMissionId(null),
        (platformConfig?.heroTransitionDuration ?? defaultPlatformConfig.heroTransitionDuration) + 180,
      )
      activeMissionRef.current = activeMissionId
      return () => window.clearTimeout(timeout)
    }

    activeMissionRef.current = activeMissionId
    return undefined
  }, [activeMissionId, platformConfig?.heroTransitionDuration])

  const previousMission = missionVisuals.find((mission) => mission.id === previousMissionId) ?? null
  const heroReferenceMission = featuredMission ?? activeMission

  useEffect(() => {
    if (!activeMission?.id) return
    missionCardRefs.current[activeMission.id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeMission?.id])

  useEffect(() => {
    if (pauseCarousel || missionVisuals.length < 2 || !activeMission) return

    const interval = window.setInterval(() => {
      const currentIndex = missionVisuals.findIndex((mission) => mission.id === activeMission.id)
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % missionVisuals.length : 0
      setActiveMissionId(missionVisuals[nextIndex]?.id ?? null)
    }, platformConfig?.heroAutoplayDelay ?? defaultPlatformConfig.heroAutoplayDelay)

    return () => window.clearInterval(interval)
  }, [activeMission, missionVisuals, pauseCarousel, platformConfig?.heroAutoplayDelay])

  const heroHeadlineLines = useMemo(
    () =>
      (platformConfig?.heroHeadline || defaultPlatformConfig.heroHeadline)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    [platformConfig?.heroHeadline],
  )

  const heroSubheadline = platformConfig?.heroSubheadline || defaultPlatformConfig.heroSubheadline
  const heroCTA = platformConfig?.heroCTA || defaultPlatformConfig.heroCTA
  const heroHeadlineColor = platformConfig?.heroHeadlineColor || defaultPlatformConfig.heroHeadlineColor
  const heroSubheadlineColor = platformConfig?.heroSubheadlineColor || defaultPlatformConfig.heroSubheadlineColor
  const heroHeadlineSize = platformConfig?.heroHeadlineSize ?? defaultPlatformConfig.heroHeadlineSize
  const heroSubheadlineSize = platformConfig?.heroSubheadlineSize ?? defaultPlatformConfig.heroSubheadlineSize
  const heroAmbientBackgroundUrl =
    platformConfig?.heroAmbientBackgroundUrl ||
    heroReferenceMission?.asset.heroBackgroundImageUrl ||
    activeMission?.asset.heroBackgroundImageUrl ||
    defaultPlatformConfig.heroAmbientBackgroundUrl
  const heroOverlayStrength = (platformConfig?.heroOverlayStrength ?? defaultPlatformConfig.heroOverlayStrength) / 100
  const heroGlowColor = platformConfig?.heroGlowColor || defaultPlatformConfig.heroGlowColor
  const heroTransitionDuration = platformConfig?.heroTransitionDuration ?? defaultPlatformConfig.heroTransitionDuration

  const heroStyle = useMemo(
    () =>
      ({
        '--hero-global-overlay-strength': `${heroOverlayStrength}`,
        '--hero-glow-color': heroGlowColor,
        '--hero-headline-color': heroHeadlineColor,
        '--hero-subheadline-color': heroSubheadlineColor,
        '--hero-headline-size': `${heroHeadlineSize}`,
        '--hero-subheadline-size': `${heroSubheadlineSize}`,
        '--hero-transition-duration': `${heroTransitionDuration}ms`,
        '--hero-focal-x': `${activeMission?.asset.focalPointX ?? 50}%`,
        '--hero-focal-y': `${activeMission?.asset.focalPointY ?? 50}%`,
      }) as CSSProperties,
    [
      activeMission?.asset.focalPointX,
      activeMission?.asset.focalPointY,
      heroGlowColor,
      heroHeadlineColor,
      heroHeadlineSize,
      heroOverlayStrength,
      heroSubheadlineColor,
      heroSubheadlineSize,
      heroTransitionDuration,
    ],
  )

  const changeMission = useCallback((id: string) => {
    setActiveMissionId(id)
  }, [])

  const goToAdjacentMission = useCallback(
    (direction: -1 | 1) => {
      if (!missionVisuals.length || !activeMission) return
      const currentIndex = missionVisuals.findIndex((mission) => mission.id === activeMission.id)
      const nextIndex =
        currentIndex < 0
          ? 0
          : (currentIndex + direction + missionVisuals.length) % missionVisuals.length
      setActiveMissionId(missionVisuals[nextIndex]?.id ?? null)
    },
    [activeMission, missionVisuals],
  )

  if (status === 'loading' || (user && catalogLoading && !activeSceneAssets.length)) {
    return (
      <div className="global-hero-app">
        <main className="global-hero-shell global-hero-shell-loading">
          <p className="global-hero-kicker">SparkLingo</p>
          <h1>Connecting your journey...</h1>
          <p>Your cinematic hero is loading.</p>
          <div className="global-hero-pulse" />
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

  if (!activeMission) {
    return (
      <div className="global-hero-app">
        <main className="global-hero-shell global-hero-shell-loading">
          <p className="global-hero-kicker">SparkLingo</p>
          <h1>No scene assets found.</h1>
          <p>Ative pelo menos uma missão em Scene Assets para renderizar a Hero.</p>
        </main>
      </div>
    )
  }

  const ambientAsset: SceneAssetRecord = {
    ...activeMission.asset,
    imageUrl: heroAmbientBackgroundUrl,
    imageUrlDesktop: heroAmbientBackgroundUrl,
    mobileImageUrl: heroAmbientBackgroundUrl,
    imageUrlMobile: heroAmbientBackgroundUrl,
  }

  const backgroundAsset: SceneAssetRecord = {
    ...activeMission.asset,
    imageUrl: activeMission.asset.heroBackgroundImageUrl || activeMission.backgroundDesktop,
    imageUrlDesktop: activeMission.asset.heroBackgroundImageUrl || activeMission.backgroundDesktop,
    mobileImageUrl: activeMission.backgroundMobile,
    imageUrlMobile: activeMission.backgroundMobile,
  }

  const previousBackgroundAsset = previousMission
    ? {
        ...previousMission.asset,
        imageUrl: previousMission.asset.heroBackgroundImageUrl || previousMission.backgroundDesktop,
        imageUrlDesktop: previousMission.asset.heroBackgroundImageUrl || previousMission.backgroundDesktop,
        mobileImageUrl: previousMission.backgroundMobile,
        imageUrlMobile: previousMission.backgroundMobile,
      }
    : null

  return (
    <div className="global-hero-app">
      <main className="global-hero-shell" style={heroStyle}>
        <div className="global-hero-background" aria-hidden="true">
          <div className="global-hero-background-layer global-hero-background-layer-ambient">
            <CinematicImage asset={ambientAsset} mode="auto" />
          </div>
          {previousBackgroundAsset && (
            <div className="global-hero-background-layer global-hero-background-layer-previous">
              <CinematicImage asset={previousBackgroundAsset} mode="auto" />
            </div>
          )}
          <div className="global-hero-background-layer global-hero-background-layer-current" key={activeMission.id}>
            <CinematicImage asset={backgroundAsset} mode="auto" />
          </div>
          <div className="global-hero-global-overlay" />
          <NarrativeOverlay asset={activeMission.asset} />
          <div className={`global-hero-atmosphere global-hero-atmosphere-${activeMission.asset.cinematicStyle}`} />
          <div className="global-hero-vignette" />
        </div>

        <header className="global-hero-header">
          <div className="global-hero-brand">
            <Zap size={18} />
            <strong>SparkLingo</strong>
          </div>

          <div className="global-hero-status">
            <div className="global-hero-pill">
              <Flame size={15} />
              <div>
                <strong>{streakDays}</strong>
                <span>day streak</span>
              </div>
            </div>
            <div className="global-hero-pill">
              <Medal size={15} />
              <div>
                <strong>{totalXp}</strong>
                <span>XP</span>
              </div>
            </div>
            {isAdmin && (
              <button
                className="global-hero-avatar global-hero-admin-entry"
                type="button"
                title="Open admin"
                onClick={() => setView('admin')}
              >
                <Shield size={18} />
              </button>
            )}
            <button className="global-hero-avatar" type="button" title="Sign out" onClick={() => signOut()}>
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} className="avatar-image" />
              ) : (
                <UserRound size={18} />
              )}
            </button>
          </div>
        </header>

        <SafeAreaContainer
          area={heroReferenceMission?.asset.textSafeArea ?? activeMission.asset.textSafeArea}
          className="global-hero-copy-safe"
        >
          <section className="global-hero-copy">
            <p className="global-hero-greeting">
              {greeting}, {firstName}! 👋
            </p>
            <h1>
              {heroHeadlineLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p>{heroSubheadline}</p>
            <button className="global-hero-cta" type="button">
              <span>{heroCTA}</span>
              <ArrowRight size={18} />
            </button>
          </section>
        </SafeAreaContainer>

        <section
          className="global-hero-carousel-shell"
          onMouseEnter={() => setPauseCarousel(true)}
          onMouseLeave={() => setPauseCarousel(false)}
        >
          <button
            className="global-hero-carousel-arrow is-left"
            type="button"
            aria-label="Previous mission"
            onClick={() => goToAdjacentMission(-1)}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="global-hero-carousel-track" role="list" aria-label="Mission carousel">
            {missionVisuals.map((mission) => (
              <button
                key={mission.id}
                ref={(element) => {
                  missionCardRefs.current[mission.id] = element
                }}
                type="button"
                role="listitem"
                className={`global-hero-mission-poster${mission.id === activeMission.id ? ' is-active' : ''}`}
                onMouseEnter={() => changeMission(mission.id)}
                onFocus={() => {
                  setPauseCarousel(true)
                  changeMission(mission.id)
                }}
                onBlur={() => setPauseCarousel(false)}
                onClick={() => changeMission(mission.id)}
              >
                <div className="global-hero-mission-art">
                  <img src={mission.posterImage} alt={mission.title} />
                </div>
                <div className="global-hero-mission-overlay" />
                <div className="global-hero-mission-copy">
                  <span className="global-hero-mission-chip">Current Mission</span>
                  <strong>{mission.title}</strong>
                  <p>{mission.description}</p>
                  <div className="global-hero-mission-meta">
                    <small>
                      {mission.chapterLabel} • {mission.sceneLabel}
                    </small>
                    <small>{mission.statusLabel}</small>
                  </div>
                  <div className="global-hero-mission-progress">
                    <span style={{ width: `${mission.progressPercent}%` }} />
                  </div>
                  <div className="global-hero-mission-footer">
                    <small>{mission.progressLabel}</small>
                    <span>{mission.progressPercent >= 100 ? 'Replay' : 'Começar minha aventura'}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            className="global-hero-carousel-arrow is-right"
            type="button"
            aria-label="Next mission"
            onClick={() => goToAdjacentMission(1)}
          >
            <ChevronRight size={18} />
          </button>
        </section>
      </main>
    </div>
  )
}

export default App
