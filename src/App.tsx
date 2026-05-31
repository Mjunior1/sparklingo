import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowRight,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Medal,
  Mic,
  Shield,
  Sparkles,
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
  getAchievementCatalogRaw,
  getLessonsCatalogRaw,
  getQuizCatalogRaw,
  getQuizQuestionsRaw,
  type AchievementCatalogItem,
  type LessonCatalogItem,
  type QuizCatalogItem,
  type QuizQuestionItem,
} from './services/catalog'
import { getLessonProgressMap } from './services/lessonProgress'
import { defaultPlatformConfig } from './services/platform'
import { getUserProgress, type UserProgress } from './services/progress'
import { getSceneAssets, type SceneAssetRecord } from './services/sceneAssets'

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

type QuickWinVisual = {
  id: string
  kind: QuizQuestionItem['kind']
  title: string
  description: string
  reward: number
  progressPercent: number
  progressLabel: string
  timerLabel: string | null
  ctaLabel: string
  toneClass: string
}

const shortenText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3).trimEnd()}...`
}

const quickWinToneByKind: Record<QuizQuestionItem['kind'], string> = {
  'multiple-choice': 'violet',
  'drag-fill': 'emerald',
  ordering: 'amber',
  listening: 'azure',
  speaking: 'fuchsia',
}

const quickWinIconByKind = {
  'multiple-choice': Brain,
  'drag-fill': Sparkles,
  ordering: Clock3,
  listening: Volume2,
  speaking: Mic,
} satisfies Record<QuizQuestionItem['kind'], typeof Brain>

const getQuickWinTimerLabel = (kind: QuizQuestionItem['kind']) => {
  if (kind === 'drag-fill') return '00:08'
  if (kind === 'ordering') return '00:10'
  if (kind === 'speaking') return '00:15'
  return null
}

const getQuickWinProgress = (question: QuizQuestionItem, progress: UserProgress | null) => {
  if (!progress) {
    return { progressPercent: 0, progressLabel: '0/1' }
  }

  const completed = progress.completedExerciseIds.includes(question.id)
  if (completed) {
    return { progressPercent: 100, progressLabel: '1/1' }
  }

  const touched =
    Boolean(progress.choiceAnswers[question.id]) ||
    Boolean(progress.dragFillAnswers[question.id]) ||
    Boolean(progress.speakingCompletions[question.id]) ||
    Boolean(progress.orderWordMap[question.id]?.length)

  return {
    progressPercent: touched ? 52 : 0,
    progressLabel: touched ? 'Em andamento' : '0/1',
  }
}

const buildQuickWinVisual = (
  question: QuizQuestionItem,
  quiz: QuizCatalogItem | undefined,
  lesson: LessonCatalogItem | undefined,
  progress: UserProgress | null,
): QuickWinVisual => {
  const { progressPercent, progressLabel } = getQuickWinProgress(question, progress)

  return {
    id: question.id,
    kind: question.kind,
    title: question.title || quiz?.title || 'Micro desafio',
    description: shortenText(
      question.prompt || question.contextCue || quiz?.objective || lesson?.practicalGoal || question.explanation,
      62,
    ),
    reward: question.reward || quiz?.reward || 10,
    progressPercent,
    progressLabel,
    timerLabel: getQuickWinTimerLabel(question.kind),
    ctaLabel: progressPercent >= 100 ? 'Replay' : 'Entrar',
    toneClass: quickWinToneByKind[question.kind],
  }
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
    id: asset.id,
    asset,
    lesson,
    title: asset.mission || asset.title || lesson?.missionTitle || lesson?.title || 'Untitled mission',
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
  const [lessonsCatalog, setLessonsCatalog] = useState<LessonCatalogItem[]>([])
  const [quizCatalog, setQuizCatalog] = useState<QuizCatalogItem[]>([])
  const [achievementCatalog, setAchievementCatalog] = useState<AchievementCatalogItem[]>([])
  const [quizQuestionCatalog, setQuizQuestionCatalog] = useState<QuizQuestionItem[]>([])
  const [sceneAssetsCatalog, setSceneAssetsCatalog] = useState<SceneAssetRecord[]>([])
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null)
  const [previousMissionId, setPreviousMissionId] = useState<string | null>(null)
  const [pauseCarousel, setPauseCarousel] = useState(false)

  const missionCardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const missionTrackRef = useRef<HTMLDivElement | null>(null)
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
      getLessonsCatalogRaw(),
      getQuizCatalogRaw(),
      getAchievementCatalogRaw(),
      getQuizQuestionsRaw(),
      getSceneAssets(),
    ])

    setLessonsCatalog(
      nextLessonsCatalog.map((lesson) => ({
        ...lesson,
        progress: nextLessonProgress[lesson.id] ?? lesson.progress,
      })),
    )
    setQuizCatalog(nextQuizCatalog)
    setAchievementCatalog(nextAchievementCatalog)
    setQuizQuestionCatalog(nextQuizQuestions)
    setSceneAssetsCatalog(nextSceneAssets)

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
    const visibleAssets = activeSceneAssets.filter((asset) => asset.showInHero)
    return visibleAssets.map((asset, index) =>
      buildMissionVisual(resolveLessonForAsset(asset, lessonsCatalog), quizCatalog, asset, index),
    )
  }, [activeSceneAssets, lessonsCatalog, quizCatalog])

  const featuredMission = useMemo(() => {
    const featuredAsset = activeSceneAssets.find((asset) => asset.featuredHero) ?? null
    if (featuredAsset) {
      const matchingMission =
        missionVisuals.find((mission) => mission.asset.id === featuredAsset.id)

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

    const track = missionTrackRef.current
    const card = missionCardRefs.current[activeMission.id]
    if (!track || !card) return

    const trackRect = track.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const edgePadding = window.matchMedia('(min-width: 861px)').matches ? 18 : 12

    let delta = 0

    if (cardRect.left < trackRect.left + edgePadding) {
      delta = cardRect.left - (trackRect.left + edgePadding)
    } else if (cardRect.right > trackRect.right - edgePadding) {
      delta = cardRect.right - (trackRect.right - edgePadding)
    }

    if (Math.abs(delta) > 2) {
      track.scrollBy({
        left: delta,
        behavior: 'smooth',
      })
    }
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

  const quickWins = useMemo(() => {
    const activeQuizzes = quizCatalog
      .filter((quiz) => quiz.active)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    const quizById = new Map(activeQuizzes.map((quiz) => [quiz.id, quiz]))
    const lessonById = new Map(lessonsCatalog.map((lesson) => [lesson.id, lesson]))
    const orderedQuestions = quizQuestionCatalog
      .filter((question) => question.active && quizById.has(question.quizId))
      .sort((a, b) => {
        const quizOrderDiff = (quizById.get(a.quizId)?.order ?? 999) - (quizById.get(b.quizId)?.order ?? 999)
        if (quizOrderDiff !== 0) return quizOrderDiff
        return a.title.localeCompare(b.title)
      })

    const activeLessonId = activeMission?.lesson?.id ?? null
    const primaryQuestions = activeLessonId
      ? orderedQuestions.filter((question) => question.lessonId === activeLessonId)
      : orderedQuestions
    const secondaryQuestions = activeLessonId
      ? orderedQuestions.filter((question) => question.lessonId !== activeLessonId)
      : []

    const selection: QuizQuestionItem[] = []
    const usedIds = new Set<string>()
    const usedKinds = new Set<QuizQuestionItem['kind']>()

    const pushQuestions = (bucket: QuizQuestionItem[], uniqueKindsOnly: boolean) => {
      for (const question of bucket) {
        if (selection.length >= 5 || usedIds.has(question.id)) continue
        if (uniqueKindsOnly && usedKinds.has(question.kind)) continue

        selection.push(question)
        usedIds.add(question.id)
        usedKinds.add(question.kind)
      }
    }

    pushQuestions(primaryQuestions, true)
    pushQuestions(secondaryQuestions, true)
    pushQuestions(primaryQuestions, false)
    pushQuestions(secondaryQuestions, false)

    return selection.slice(0, 5).map((question) =>
      buildQuickWinVisual(question, quizById.get(question.quizId), lessonById.get(question.lessonId), progressSnapshot),
    )
  }, [activeMission?.lesson?.id, lessonsCatalog, progressSnapshot, quizCatalog, quizQuestionCatalog])

  const momentumQuickWins = useMemo(() => quickWins.slice(0, 4), [quickWins])

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

          <div
            ref={missionTrackRef}
            className="global-hero-carousel-track"
            role="list"
            aria-label="Mission carousel"
          >
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

        {momentumQuickWins.length > 0 && (
          <section
            className={`hero-momentum-layer hero-momentum-layer-${activeMission.asset.cinematicStyle}`}
            aria-label="Quick wins momentum"
          >
            <div className="hero-momentum-cloud" role="list" aria-label="Momentum prompts">
              {momentumQuickWins.map((quickWin, index) => {
                const Icon = quickWinIconByKind[quickWin.kind]
                const variant = ['is-spark', 'is-focus', 'is-reward', 'is-timer'][index % 4]

                return (
                  <button
                    key={quickWin.id}
                    type="button"
                    role="listitem"
                    className={`hero-momentum-node hero-momentum-node-${quickWin.toneClass} ${variant}`}
                    style={{ '--momentum-delay': `${index * 160}ms` } as CSSProperties}
                  >
                    <span className="hero-momentum-node-glow" aria-hidden="true" />
                    <span className="hero-momentum-node-icon" aria-hidden="true">
                      <Icon size={variant === 'is-spark' ? 16 : 18} />
                    </span>
                    <span className="hero-momentum-node-copy">
                      <strong>{quickWin.title}</strong>
                      <small>
                        {variant === 'is-timer' && quickWin.timerLabel
                          ? quickWin.timerLabel
                          : variant === 'is-reward'
                            ? quickWin.progressLabel
                            : `+${quickWin.reward} XP`}
                      </small>
                    </span>
                    {(variant === 'is-focus' || variant === 'is-reward') && (
                      <span className="hero-momentum-node-pill">{quickWin.ctaLabel}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {false && quickWins.length > 0 && (
        <section
          className={`quick-wins-engine quick-wins-engine-${activeMission.asset.cinematicStyle}`}
          aria-labelledby="quick-wins-title"
        >
          <div className="quick-wins-background" aria-hidden="true" />

          <header className="quick-wins-header">
            <div className="quick-wins-copy">
              <p className="quick-wins-kicker">
                <Zap size={16} />
                Momentum loop
              </p>
              <h2 id="quick-wins-title">Quick Wins</h2>
              <p>Desafios rápidos para ganhar XP e manter o ritmo.</p>
            </div>
          </header>

          <div className="quick-wins-track" role="list" aria-label="Quick wins">
            {quickWins.map((quickWin, index) => {
              const Icon = quickWinIconByKind[quickWin.kind]

              return (
                <article
                  key={quickWin.id}
                  role="listitem"
                  tabIndex={0}
                  className={`quick-wins-card quick-wins-card-${quickWin.toneClass}`}
                  style={{ '--quick-win-delay': `${index * 140}ms` } as CSSProperties}
                >
                  <div className="quick-wins-card-bloom" aria-hidden="true" />

                  <div className="quick-wins-card-top">
                    <span className="quick-wins-card-icon" aria-hidden="true">
                      <Icon size={24} />
                    </span>
                    <span className="quick-wins-card-reward">+{quickWin.reward} XP</span>
                  </div>

                  <div className="quick-wins-card-copy">
                    <strong>{quickWin.title}</strong>
                    <p>{quickWin.description}</p>
                  </div>

                  <div className="quick-wins-card-meta">
                    <small>{quickWin.progressLabel}</small>
                    {quickWin.timerLabel ? (
                      <small className="quick-wins-card-timer">
                        <Clock3 size={12} />
                        {quickWin.timerLabel}
                      </small>
                    ) : (
                      <small>{quickWin.ctaLabel}</small>
                    )}
                  </div>

                  <div className="quick-wins-card-progress" aria-hidden="true">
                    <span style={{ width: `${quickWin.progressPercent}%` }} />
                  </div>

                  <span className="quick-wins-card-cta" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

export default App
