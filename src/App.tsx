import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  Medal,
  Shield,
  UserRound,
  Zap,
} from 'lucide-react'
import { AdminScreen } from './admin/AdminScreen'
import { AuthEntry } from './auth/AuthEntry'
import { useAuth } from './auth/AuthProvider'
import { OnboardingScreen } from './auth/OnboardingScreen'
import { QuickWinsSection } from './components/quickwins/QuickWinsSection'
import { MissionRuntime, type MissionRuntimeMission } from './components/runtime/MissionRuntime'
import { CinematicImage, NarrativeOverlay, SafeAreaContainer } from './components/scene/SceneRenderer'
import { buildLegacyMissionBundle, buildRuntimeSceneContracts } from './services/learning'
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
import { getLessonProgressMap, saveLessonProgressMap } from './services/lessonProgress'
import { defaultPlatformConfig } from './services/platform'
import { getUserProgress, saveUserProgress, type UserProgress } from './services/progress'
import {
  defaultQuickWinsConfig,
  getQuickWins,
  getQuickWinsConfig,
  type QuickWinItem,
  type QuickWinsConfig,
} from './services/quickWins'
import { getSceneAssets, type SceneAssetRecord } from './services/sceneAssets'
import {
  defaultMissionRuntimeScenes,
  getMissionRuntimeScenes,
  type MissionRuntimeSceneRecord,
} from './services/missionRuntime'

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)))
const missionAttemptStorageKey = 'sparklingo.runtime.missionAttempts'

const readMissionAttemptCounts = () => {
  if (typeof window === 'undefined') return {} as Record<string, number>
  try {
    const value = JSON.parse(window.localStorage.getItem(missionAttemptStorageKey) || '{}')
    return typeof value === 'object' && value ? value as Record<string, number> : {}
  } catch {
    return {}
  }
}

const writeMissionAttemptCounts = (counts: Record<string, number>) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(missionAttemptStorageKey, JSON.stringify(counts))
}

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
  heroBackgroundDesktop: string
  heroBackgroundMobile: string
  runtimeBackgroundDesktop: string
  runtimeBackgroundMobile: string
}

const buildMissionVisual = (
  lesson: LessonCatalogItem | null,
  quizzes: QuizCatalogItem[],
  asset: SceneAssetRecord,
  progressionOrder: number,
  savedProgress?: number,
): MissionVisual => {
  const lessonQuizzes = lesson ? quizzes.filter((quiz) => quiz.lessonId === lesson.id) : []
  const sceneCount = Math.max(lessonQuizzes.length || 0, 5)
  const progressPercent = clampPercent(savedProgress ?? lesson?.progress ?? 0)

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
    heroBackgroundDesktop: getAssetImage(asset, 'background-desktop'),
    heroBackgroundMobile: getAssetImage(asset, 'background-mobile'),
    runtimeBackgroundDesktop:
      asset.imageUrlDesktop ||
      asset.imageUrl ||
      asset.backgroundImageUrl ||
      asset.heroBackgroundImageUrl,
    runtimeBackgroundMobile:
      asset.imageUrlMobile ||
      asset.imageUrlDesktop ||
      asset.imageUrl ||
      asset.mobileImageUrl ||
      asset.backgroundImageUrl ||
      asset.heroBackgroundImageUrl,
  }
}

const mergeRuntimeSceneCatalog = (runtimeScenes: MissionRuntimeSceneRecord[]) => {
  const merged = new Map(defaultMissionRuntimeScenes.map((scene) => [scene.id, scene]))
  runtimeScenes.forEach((scene) => {
    merged.set(scene.id, scene)
  })

  return [...merged.values()].sort(
    (a, b) => a.order - b.order || a.sceneNumber - b.sceneNumber || a.id.localeCompare(b.id),
  )
}

function App() {
  const { status, user, profile, signOut, platformConfig, patchProfile } = useAuth()
  const [view, setView] = useState<'home' | 'admin' | 'runtime'>('home')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [progressSnapshot, setProgressSnapshot] = useState<UserProgress | null>(null)
  const [missionProgressMap, setMissionProgressMap] = useState<Record<string, number>>({})
  const [lessonsCatalog, setLessonsCatalog] = useState<LessonCatalogItem[]>([])
  const [quizCatalog, setQuizCatalog] = useState<QuizCatalogItem[]>([])
  const [achievementCatalog, setAchievementCatalog] = useState<AchievementCatalogItem[]>([])
  const [quizQuestionCatalog, setQuizQuestionCatalog] = useState<QuizQuestionItem[]>([])
  const [sceneAssetsCatalog, setSceneAssetsCatalog] = useState<SceneAssetRecord[]>([])
  const [missionRuntimeCatalog, setMissionRuntimeCatalog] = useState<MissionRuntimeSceneRecord[]>([])
  const [quickWinsCatalog, setQuickWinsCatalog] = useState<QuickWinItem[]>([])
  const [quickWinsConfig, setQuickWinsConfig] = useState<QuickWinsConfig>(defaultQuickWinsConfig)
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null)
  const [runtimeMissionId, setRuntimeMissionId] = useState<string | null>(null)
  const [previousMissionId, setPreviousMissionId] = useState<string | null>(null)
  const [pauseCarousel, setPauseCarousel] = useState(false)
  const [missionAttemptCounts, setMissionAttemptCounts] = useState<Record<string, number>>(readMissionAttemptCounts)

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
      nextMissionRuntimeScenes,
      nextQuickWinsCatalog,
      nextQuickWinsConfig,
    ] = await Promise.all([
      getLessonProgressMap(user.uid),
      getLessonsCatalogRaw(),
      getQuizCatalogRaw(),
      getAchievementCatalogRaw(),
      getQuizQuestionsRaw(),
      getSceneAssets(),
      getMissionRuntimeScenes(),
      getQuickWins(),
      getQuickWinsConfig(),
    ])

    setLessonsCatalog(
      nextLessonsCatalog.map((lesson) => ({
        ...lesson,
        progress: nextLessonProgress[lesson.id] ?? lesson.progress,
      })),
    )
    setMissionProgressMap(nextLessonProgress)
    setQuizCatalog(nextQuizCatalog)
    setAchievementCatalog(nextAchievementCatalog)
    setQuizQuestionCatalog(nextQuizQuestions)
    setSceneAssetsCatalog(nextSceneAssets)
    setMissionRuntimeCatalog(nextMissionRuntimeScenes)
    setQuickWinsCatalog(nextQuickWinsCatalog)
    setQuickWinsConfig(nextQuickWinsConfig)

    return {
      nextLessonProgress,
      nextLessonsCatalog,
      nextQuizCatalog,
      nextAchievementCatalog,
      nextQuizQuestions,
      nextSceneAssets,
      nextMissionRuntimeScenes,
      nextQuickWinsCatalog,
      nextQuickWinsConfig,
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

  const runtimeSceneSourceCatalog = useMemo(
    () => mergeRuntimeSceneCatalog(missionRuntimeCatalog),
    [missionRuntimeCatalog],
  )

  const missionVisuals = useMemo(() => {
    const visibleAssets = activeSceneAssets.filter((asset) => asset.showInHero)
    return visibleAssets.map((asset, index) =>
      buildMissionVisual(
        resolveLessonForAsset(asset, lessonsCatalog),
        quizCatalog,
        asset,
        index,
        missionProgressMap[asset.id],
      ),
    )
  }, [activeSceneAssets, lessonsCatalog, missionProgressMap, quizCatalog])

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

  const quickWins = useMemo(
    () =>
      [...quickWinsCatalog]
        .filter((item) => item.active)
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    [quickWinsCatalog],
  )

  const changeMission = useCallback((id: string) => {
    setActiveMissionId(id)
  }, [])

  const openMissionRuntime = useCallback((missionId: string) => {
    const mission = missionVisuals.find((item) => item.id === missionId)
    if (!mission || mission.progressPercent >= 100) return
    setActiveMissionId(missionId)
    setRuntimeMissionId(missionId)
    setMissionAttemptCounts((current) => {
      const next = { ...current, [missionId]: (current[missionId] ?? 0) + 1 }
      writeMissionAttemptCounts(next)
      return next
    })
    setView('runtime')
  }, [missionVisuals])

  const availableMission = missionVisuals.find((mission) => mission.progressPercent < 100) ?? null

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

  const runtimeMission =
    missionVisuals.find((mission) => mission.id === runtimeMissionId) ??
    activeMission ??
    null

  const handleRuntimeMissionComplete = useCallback(async (result: {
    earnedXp: number
    completedSceneIds: string[]
    correctAnswers: number
    totalScenes: number
    progressPercent: number
  }) => {
    if (!user || !runtimeMission?.lesson) return

    const currentProgress = progressSnapshot ?? await getUserProgress(user.uid)
    const completionId = `mission:${runtimeMission.id}`
    const nextTotalXp = currentProgress.totalXp + Math.max(0, result.earnedXp)
    const completedExerciseIds = result.progressPercent >= 100
      ? [...new Set([...currentProgress.completedExerciseIds, completionId])]
      : currentProgress.completedExerciseIds.filter((id) => id !== completionId)
    const nextProgress = await saveUserProgress(user.uid, {
      totalXp: nextTotalXp,
      completedExerciseIds,
      choiceAnswers: currentProgress.choiceAnswers,
      dragFillAnswers: currentProgress.dragFillAnswers,
      speakingCompletions: currentProgress.speakingCompletions,
      orderWordMap: currentProgress.orderWordMap,
      recentMissionTheme: runtimeMission.title,
      recentMissionContext: `${result.correctAnswers}/${result.totalScenes} respostas corretas`,
      emotional: currentProgress.emotional,
    })

    await saveLessonProgressMap(user.uid, { [runtimeMission.id]: result.progressPercent })
    setProgressSnapshot(nextProgress)
    setMissionProgressMap((current) => ({ ...current, [runtimeMission.id]: result.progressPercent }))
    await patchProfile({ xp: nextProgress.totalXp, level: nextProgress.level })
  }, [patchProfile, progressSnapshot, runtimeMission, user])

  const runtimeBundle = useMemo(() => {
    if (!runtimeMission?.lesson) return null

    return buildLegacyMissionBundle({
      lesson: runtimeMission.lesson,
      quizzes: quizCatalog,
      questions: quizQuestionCatalog,
      runtimeScenes: runtimeSceneSourceCatalog,
      sceneAssets: sceneAssetsCatalog,
    })
  }, [quizCatalog, quizQuestionCatalog, runtimeMission, runtimeSceneSourceCatalog, sceneAssetsCatalog])

  const runtimeContracts = useMemo(
    () => (runtimeBundle ? buildRuntimeSceneContracts(runtimeBundle) : []),
    [runtimeBundle],
  )

  const runtimeScenes = useMemo(() => {
    if (!runtimeMission) return [] as MissionRuntimeSceneRecord[]
    const directAssetScenes = runtimeSceneSourceCatalog.filter((scene) => scene.sceneAssetId === runtimeMission.asset.id)

    if (runtimeBundle?.scenes.length) {
      const sourceMap = new Map(runtimeSceneSourceCatalog.map((scene) => [scene.id, scene]))
      const bundledScenes = runtimeBundle.scenes
        .map((bundleScene) => {
          const legacyId =
            bundleScene.scene.legacyRuntimeSceneId ??
            bundleScene.experiences.find((experience) => experience.legacyRuntimeSceneId)?.legacyRuntimeSceneId

          return legacyId ? sourceMap.get(legacyId) ?? null : null
        })
        .filter((scene): scene is MissionRuntimeSceneRecord => Boolean(scene))

      const seenSceneIds = new Set(bundledScenes.map((scene) => scene.id))
      const nativeAssetScenes = directAssetScenes.filter((scene) => !seenSceneIds.has(scene.id))

      return [...bundledScenes, ...nativeAssetScenes].sort(
        (a, b) => a.order - b.order || a.sceneNumber - b.sceneNumber || a.id.localeCompare(b.id),
      )
    }

    return directAssetScenes
  }, [runtimeBundle, runtimeMission, runtimeSceneSourceCatalog])

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

  if (view === 'runtime' && runtimeMission) {
    const runtimeMissionCard: MissionRuntimeMission = {
      id: runtimeMission.id,
      title: runtimeMission.title,
      chapterLabel: runtimeMission.chapterLabel,
      sceneCount: runtimeMission.sceneCount,
      posterImage: runtimeMission.posterImage,
      backgroundDesktop: runtimeMission.runtimeBackgroundDesktop,
      backgroundMobile: runtimeMission.runtimeBackgroundMobile,
      asset: runtimeMission.asset,
    }

    return (
      <div className="runtime-app-shell">
        <MissionRuntime
          mission={runtimeMissionCard}
          scenes={runtimeScenes}
          sceneContracts={runtimeContracts}
          learnerLevel={profile?.level ?? null}
          questionTimeLimitSeconds={
            platformConfig?.runtimeQuestionTimeLimitSeconds ??
            defaultPlatformConfig.runtimeQuestionTimeLimitSeconds
          }
          streakDays={streakDays}
          totalXp={totalXp}
          avatarUrl={profile?.avatarUrl}
          randomizeScenes={(missionAttemptCounts[runtimeMission.id] ?? 0) > 1 && runtimeMission.progressPercent < 100}
          onMissionComplete={handleRuntimeMissionComplete}
          onBack={() => setView('home')}
          onOpenAdmin={isAdmin ? () => setView('admin') : undefined}
        />
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
    imageUrl: activeMission.asset.heroBackgroundImageUrl || activeMission.heroBackgroundDesktop,
    imageUrlDesktop: activeMission.asset.heroBackgroundImageUrl || activeMission.heroBackgroundDesktop,
    mobileImageUrl: activeMission.heroBackgroundMobile,
    imageUrlMobile: activeMission.heroBackgroundMobile,
  }

  const previousBackgroundAsset = previousMission
    ? {
        ...previousMission.asset,
        imageUrl: previousMission.asset.heroBackgroundImageUrl || previousMission.heroBackgroundDesktop,
        imageUrlDesktop: previousMission.asset.heroBackgroundImageUrl || previousMission.heroBackgroundDesktop,
        mobileImageUrl: previousMission.heroBackgroundMobile,
        imageUrlMobile: previousMission.heroBackgroundMobile,
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
            <button
              className="global-hero-cta"
              type="button"
              disabled={!availableMission}
              onClick={() => availableMission && openMissionRuntime(availableMission.id)}
            >
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
                aria-disabled={mission.progressPercent >= 100}
                className={`global-hero-mission-poster${mission.id === activeMission.id ? ' is-active' : ''}${mission.progressPercent >= 100 ? ' is-completed' : ''}`}
                onMouseEnter={() => changeMission(mission.id)}
                onFocus={() => {
                  setPauseCarousel(true)
                  changeMission(mission.id)
                }}
                onBlur={() => setPauseCarousel(false)}
                onClick={() => openMissionRuntime(mission.id)}
              >
                <div className="global-hero-mission-art">
                  <img src={mission.posterImage} alt={mission.title} />
                </div>
                <div className="global-hero-mission-overlay" />
                <div className="global-hero-mission-copy">
                  <span className="global-hero-mission-chip">
                    {mission.progressPercent >= 100 ? <><Medal size={14} /> Missão concluída</> : 'Current Mission'}
                  </span>
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
                    <span>{mission.progressPercent >= 100 ? 'Troféu conquistado' : 'Começar minha aventura'}</span>
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

      {quickWins.length > 0 && (
        <QuickWinsSection
          config={quickWinsConfig}
          items={quickWins}
          cinematicStyle={activeMission.asset.cinematicStyle}
        />
      )}
    </div>
  )
}

export default App
