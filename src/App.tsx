import './App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Flame, Medal, Shield, UserRound, Zap } from 'lucide-react'
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
  mode: 'background-desktop' | 'background-mobile' | 'mission-card',
) => {
  if (mode === 'background-desktop') {
    return asset.backgroundImageUrl || asset.imageUrlDesktop || asset.imageUrl || asset.mobileImageUrl || asset.imageUrlMobile
  }

  if (mode === 'background-mobile') {
    return asset.mobileImageUrl || asset.imageUrlMobile || asset.backgroundImageUrl || asset.imageUrlDesktop || asset.imageUrl
  }

  return asset.imageUrl || asset.imageUrlDesktop || asset.mobileImageUrl || asset.imageUrlMobile || asset.backgroundImageUrl
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

  const isAdmin = profile?.role === 'admin'
  const firstName = profile?.displayName?.split(' ')[0] ?? user?.displayName?.split(' ')[0] ?? 'Learner'
  const greeting = useMemo(() => getGreeting(), [])
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

  const selectedMissionLesson = useMemo(
    () => resolveLessonForAsset(featuredHeroAsset, lessonsCatalog),
    [featuredHeroAsset, lessonsCatalog],
  )

  const selectedMissionQuizzes = useMemo(
    () => (selectedMissionLesson ? quizCatalog.filter((quiz) => quiz.lessonId === selectedMissionLesson.id) : []),
    [quizCatalog, selectedMissionLesson],
  )

  const missionProgressPercent = clampPercent(selectedMissionLesson?.progress ?? 25)
  const sceneCount = Math.max(5, selectedMissionQuizzes.length || 0)
  const heroBackgroundDesktop = getAssetImage(featuredHeroAsset, 'background-desktop')
  const heroBackgroundMobile = getAssetImage(featuredHeroAsset, 'background-mobile')
  const missionCardImage = getAssetImage(featuredHeroAsset, 'mission-card')
  const heroHeadlineLines = (
    featuredHeroAsset.heroHeadline ||
    platformConfig?.heroHeadline ||
    'Continue\nyour\nadventure'
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const heroSubtitle =
    featuredHeroAsset.heroSubtitle ||
    platformConfig?.heroSubtitle ||
    selectedMissionLesson?.emotionalContext ||
    'Every conversation moves you closer to fluency.'
  const missionTitle =
    selectedMissionLesson?.missionTitle ||
    selectedMissionLesson?.title ||
    featuredHeroAsset.mission ||
    featuredHeroAsset.title
  const missionNarrative =
    featuredHeroAsset.missionCardDescription ||
    selectedMissionLesson?.practicalGoal ||
    selectedMissionLesson?.blurb ||
    'Follow the next scene and keep moving through your journey.'
  const missionChapter = featuredHeroAsset.chapter || 'Chapter 1'
  const missionStatus = missionProgressPercent >= 100 ? 'Completed' : 'In Progress'

  const heroStageStyle = {
    '--mission-overlay-opacity': `${featuredHeroAsset.overlayOpacity / 100}`,
    '--mission-overlay-color': featuredHeroAsset.overlayColor,
    '--mission-blur-strength': `${featuredHeroAsset.blurIntensity}px`,
    '--mission-brightness': `${featuredHeroAsset.brightness / 100}`,
    '--mission-focal-x': `${featuredHeroAsset.focalPointX}%`,
    '--mission-focal-y': `${featuredHeroAsset.focalPointY}%`,
  } as React.CSSProperties

  if (status === 'loading' || (user && catalogLoading && !featuredHeroAsset)) {
    return (
      <div className="mission-block-app">
        <main className="mission-block-shell mission-block-shell-loading">
          <p className="mission-block-kicker">SparkLingo</p>
          <h1>Connecting your journey...</h1>
          <p>Your current mission is loading.</p>
          <div className="mission-block-pulse" />
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
    <div className="mission-block-app">
      <main className="mission-block-shell" style={heroStageStyle}>
        <div className="mission-block-background" aria-hidden="true">
          <CinematicImage
            asset={{
              ...featuredHeroAsset,
              imageUrl: heroBackgroundDesktop,
              imageUrlDesktop: heroBackgroundDesktop,
              mobileImageUrl: heroBackgroundMobile,
              imageUrlMobile: heroBackgroundMobile,
            }}
            mode="auto"
          />
          <NarrativeOverlay asset={featuredHeroAsset} />
          <div className={`mission-block-atmosphere mission-block-atmosphere-${featuredHeroAsset.cinematicStyle}`} />
          <div className="mission-block-vignette" />
        </div>

        <header className="mission-block-header">
          <div className="mission-block-brand">
            <Zap size={18} />
            <strong>SparkLingo</strong>
          </div>

          <div className="mission-block-status">
            <div className="mission-block-pill">
              <Flame size={15} />
              <div>
                <strong>{streakDays}</strong>
                <span>day streak</span>
              </div>
            </div>
            <div className="mission-block-pill">
              <Medal size={15} />
              <div>
                <strong>{totalXp}</strong>
                <span>XP</span>
              </div>
            </div>
            {isAdmin && (
              <button
                className="mission-block-avatar mission-block-admin-entry"
                type="button"
                title="Open admin"
                onClick={() => setView('admin')}
              >
                <Shield size={18} />
              </button>
            )}
            <button className="mission-block-avatar" type="button" title="Sign out" onClick={() => signOut()}>
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} className="avatar-image" />
              ) : (
                <UserRound size={18} />
              )}
            </button>
          </div>
        </header>

        <SafeAreaContainer area={featuredHeroAsset.textSafeArea} className="mission-block-safe">
          <div className="mission-block-copy">
            <p className="mission-block-greeting">
              {greeting}, {firstName}! 👋
            </p>
            <h1>
              {heroHeadlineLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p>{heroSubtitle}</p>

            <article className="mission-block-card">
              <div className="mission-block-card-media">
                <img src={missionCardImage} alt={missionTitle} />
              </div>
              <div className="mission-block-card-overlay" />
              <div className="mission-block-card-copy">
                <span className="mission-block-card-kicker">Current Mission</span>
                <strong>{missionTitle}</strong>
                <p>{missionNarrative}</p>
                <div className="mission-block-card-meta">
                  <span>
                    {missionChapter} • Scene 1 of {sceneCount}
                  </span>
                  <span>{missionStatus}</span>
                </div>
                <div className="mission-block-card-progress">
                  <span style={{ width: `${missionProgressPercent}%` }} />
                </div>
              </div>
            </article>

            <button className="mission-block-cta" type="button">
              <span>{platformConfig?.playCta || 'Continue Mission'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </SafeAreaContainer>
      </main>
    </div>
  )
}

export default App
