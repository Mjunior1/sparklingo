import './MissionRuntime.css'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  Flame,
  Gift,
  Medal,
  Mic,
  Play,
  Shield,
  Sparkles,
  Star,
  UserRound,
  Volume2,
} from 'lucide-react'
import type {
  ListeningExperiencePayload,
  MultipleChoiceExperiencePayload,
  RuntimeAnswerOption,
  RuntimeExperienceContract,
  RuntimeSceneContract,
  SpeakingExperiencePayload,
} from '../../services/learning'
import type { SceneAssetRecord } from '../../services/sceneAssets'
import type { MissionRuntimeAnswerRecord, MissionRuntimeSceneRecord } from '../../services/missionRuntime'

export type MissionRuntimeMission = {
  id: string
  title: string
  chapterLabel: string
  sceneCount: number
  posterImage: string
  backgroundDesktop: string
  backgroundMobile: string
  asset: SceneAssetRecord
}

type MissionRuntimeProps = {
  mission: MissionRuntimeMission
  scenes: MissionRuntimeSceneRecord[]
  sceneContracts?: RuntimeSceneContract[]
  streakDays: number
  totalXp: number
  avatarUrl?: string | null
  onBack: () => void
  onOpenAdmin?: () => void
}

type RuntimePhase = 'intro' | 'scene' | 'complete'
type RuntimeSceneStep = 'listening' | 'speaking' | 'feedback'
type RuntimeFeedbackRevealStage = 'idle' | 'feedback' | 'reward' | 'ready'

type RuntimeAnswerViewModel = {
  id: string
  text: string
  translation: string
  audioUrl: string
  isCorrect: boolean
  feedbackTitle: string
  feedbackBody: string
  xpReward: number
}

type RuntimeSceneFlow = {
  scene: MissionRuntimeSceneRecord
  contract: RuntimeSceneContract | null
  interactiveExperience: RuntimeExperienceContract<'multiple_choice'> | RuntimeExperienceContract<'listening'> | null
  listeningExperience: RuntimeExperienceContract<'listening'> | null
  speakingExperience: RuntimeExperienceContract<'speaking'> | null
  feedbackExperience: RuntimeExperienceContract<'emotional_feedback'> | null
}

type RuntimePromptViewModel = {
  type: 'multiple_choice' | 'listening' | 'speaking'
  npc: string
  question: string
  translation: string
  answers: RuntimeAnswerViewModel[]
  audioUrl: string
  helperLabel: string
  helperActionLabel: string
}

const waveformBars = Array.from({ length: 24 }, (_, index) => 20 + ((index * 17) % 65))

const buildRuntimeAsset = (mission: MissionRuntimeMission, scene: MissionRuntimeSceneRecord): SceneAssetRecord => ({
  ...mission.asset,
  title: scene.title || mission.title,
  imageUrl:
    scene.backgroundImageUrl ||
    scene.backgroundImageUrlMobile ||
    mission.backgroundDesktop ||
    mission.backgroundMobile ||
    mission.asset.imageUrlDesktop ||
    mission.asset.imageUrlMobile ||
    mission.asset.imageUrl ||
    mission.asset.heroBackgroundImageUrl,
  imageUrlDesktop:
    scene.backgroundImageUrl ||
    scene.backgroundImageUrlMobile ||
    mission.backgroundDesktop ||
    mission.backgroundMobile ||
    mission.asset.imageUrlDesktop ||
    mission.asset.imageUrlMobile ||
    mission.asset.imageUrl ||
    mission.asset.heroBackgroundImageUrl,
  mobileImageUrl:
    scene.backgroundImageUrlMobile ||
    scene.backgroundImageUrl ||
    mission.backgroundMobile ||
    mission.backgroundDesktop ||
    mission.asset.imageUrlMobile ||
    mission.asset.mobileImageUrl ||
    mission.asset.imageUrlDesktop ||
    mission.asset.imageUrl ||
    mission.asset.heroBackgroundImageUrl,
  imageUrlMobile:
    scene.backgroundImageUrlMobile ||
    scene.backgroundImageUrl ||
    mission.backgroundMobile ||
    mission.backgroundDesktop ||
    mission.asset.imageUrlMobile ||
    mission.asset.mobileImageUrl ||
    mission.asset.imageUrlDesktop ||
    mission.asset.imageUrl ||
    mission.asset.heroBackgroundImageUrl,
  heroBackgroundImageUrl:
    scene.backgroundImageUrl ||
    scene.backgroundImageUrlMobile ||
    mission.backgroundDesktop ||
    mission.backgroundMobile ||
    mission.asset.imageUrlDesktop ||
    mission.asset.imageUrlMobile ||
    mission.asset.imageUrl ||
    mission.asset.heroBackgroundImageUrl,
  focalPointX: scene.backgroundFocalX,
  focalPointY: scene.backgroundFocalY,
})

const pickRuntimeBackgroundSource = (
  scene: MissionRuntimeSceneRecord | null,
  mission: MissionRuntimeMission,
  isMobileViewport: boolean,
) => {
  if (!scene) return ''

  if (isMobileViewport) {
    return (
      scene.backgroundImageUrlMobile ||
      scene.backgroundImageUrl ||
      mission.backgroundMobile ||
      mission.backgroundDesktop ||
      mission.asset.imageUrlMobile ||
      mission.asset.mobileImageUrl ||
      mission.asset.imageUrlDesktop ||
      mission.asset.imageUrl ||
      mission.asset.heroBackgroundImageUrl
    )
  }

  return (
    scene.backgroundImageUrl ||
    scene.backgroundImageUrlMobile ||
    mission.backgroundDesktop ||
    mission.backgroundMobile ||
    mission.asset.imageUrlDesktop ||
    mission.asset.imageUrlMobile ||
    mission.asset.imageUrl ||
    mission.asset.heroBackgroundImageUrl
  )
}

const buildRuntimeBackgroundCandidates = (
  scene: MissionRuntimeSceneRecord | null,
  mission: MissionRuntimeMission,
  asset: SceneAssetRecord,
  isMobileViewport: boolean,
) => {
  const rawCandidates = isMobileViewport
    ? [
        scene?.backgroundImageUrlMobile,
        scene?.backgroundImageUrl,
        mission.backgroundMobile,
        mission.backgroundDesktop,
        asset.imageUrlMobile,
        asset.mobileImageUrl,
        asset.imageUrlDesktop,
        asset.imageUrl,
        asset.heroBackgroundImageUrl,
      ]
    : [
        scene?.backgroundImageUrl,
        scene?.backgroundImageUrlMobile,
        mission.backgroundDesktop,
        mission.backgroundMobile,
        asset.imageUrlDesktop,
        asset.imageUrl,
        asset.imageUrlMobile,
        asset.mobileImageUrl,
        asset.heroBackgroundImageUrl,
      ]

  return Array.from(new Set(rawCandidates.map((candidate) => (candidate || '').trim()).filter(Boolean)))
}

const buildRuntimeBackgroundImageStyle = (
  scene: MissionRuntimeSceneRecord | null,
): CSSProperties | undefined => {
  if (!scene) return undefined

  return {
    objectPosition: `${scene.backgroundFocalX}% ${scene.backgroundFocalY}%`,
    transform: `translate3d(${scene.backgroundOffsetX}%, ${scene.backgroundOffsetY}%, 0) scale(${scene.backgroundScale / 100})`,
  } as CSSProperties
}

const buildRuntimeBackgroundLayerStyle = (
  source: string,
  scene: MissionRuntimeSceneRecord | null,
): CSSProperties | undefined => {
  if (!source || !scene) return undefined

  const escapedSource = source.replace(/"/g, '\\"')

  return {
    backgroundImage: `url("${escapedSource}")`,
    backgroundPosition: `${scene.backgroundFocalX + scene.backgroundOffsetX}% ${scene.backgroundFocalY + scene.backgroundOffsetY}%`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${scene.backgroundScale}%`,
  } as CSSProperties
}

function RuntimeIcon({
  iconUrl,
  alt,
  className = '',
  children,
}: {
  iconUrl?: string
  alt: string
  className?: string
  children: ReactNode
}) {
  if (iconUrl) {
    return <img className={`mission-runtime-icon-image${className ? ` ${className}` : ''}`} src={iconUrl} alt={alt} />
  }

  return <>{children}</>
}

const playSpeech = (text: string, audioUrl?: string) => {
  if (audioUrl) {
    const audio = new Audio(audioUrl)
    void audio.play().catch(() => undefined)
    return
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.94
  utterance.pitch = 1
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

const buildFeedback = (
  scene: MissionRuntimeSceneRecord,
  selectedAnswer: RuntimeAnswerViewModel | null,
  feedbackExperience: RuntimeExperienceContract<'emotional_feedback'> | null,
) => ({
  title:
    selectedAnswer?.feedbackTitle ||
    feedbackExperience?.payload.title ||
    scene.emotionalFeedbackTitle,
  body:
    selectedAnswer?.feedbackBody ||
    feedbackExperience?.payload.body ||
    scene.emotionalFeedbackBody,
  xp:
    selectedAnswer?.xpReward ??
    feedbackExperience?.payload.xpReward ??
    scene.xpReward,
  tone:
    feedbackExperience?.payload.tone ||
    scene.emotionalFeedbackTone,
})

const getLegacySceneIdFromContract = (contract: RuntimeSceneContract) =>
  contract.experiences.find((experience) => experience.meta?.legacyRuntimeSceneId)?.meta?.legacyRuntimeSceneId ||
  contract.scene.id.replace(/^scene-/, '')

const buildRuntimeAnswerViewModel = (
  answer: RuntimeAnswerOption | MissionRuntimeAnswerRecord,
): RuntimeAnswerViewModel => ({
  id: answer.id,
  text: answer.text,
  translation: 'translation' in answer ? answer.translation || '' : '',
  audioUrl: 'audioUrl' in answer ? answer.audioUrl || '' : '',
  isCorrect: Boolean('isCorrect' in answer ? answer.isCorrect : false),
  feedbackTitle: 'feedbackTitle' in answer ? answer.feedbackTitle || '' : '',
  feedbackBody: 'feedbackBody' in answer ? answer.feedbackBody || '' : '',
  xpReward: 'xpReward' in answer && typeof answer.xpReward === 'number' ? answer.xpReward : 0,
})

const buildInteractivePrompt = (
  scene: MissionRuntimeSceneRecord,
  interactiveExperience: RuntimeSceneFlow['interactiveExperience'],
): RuntimePromptViewModel => {
  if (!interactiveExperience) {
    return {
      type: 'multiple_choice' as const,
      npc: scene.character || scene.dialogue,
      question: scene.question,
      translation: scene.questionTranslation,
      answers: scene.answers.map(buildRuntimeAnswerViewModel),
      audioUrl: scene.audioUrl,
      helperLabel: 'Dialogue choice',
      helperActionLabel: 'Ouça a cena',
    }
  }

  if (interactiveExperience.type === 'listening') {
    const payload = interactiveExperience.payload as ListeningExperiencePayload

    return {
      type: 'listening' as const,
      npc: payload.npc,
      question: payload.prompt,
      translation: payload.translation || '',
      answers: payload.answers.map(buildRuntimeAnswerViewModel),
      audioUrl: payload.audio.url,
      helperLabel: 'Officer question',
      helperActionLabel: 'Ouça com atenção',
    }
  }

  const payload = interactiveExperience.payload as MultipleChoiceExperiencePayload

  return {
    type: 'multiple_choice' as const,
    npc: payload.npc,
    question: payload.question,
    translation: payload.translation || '',
    answers: payload.answers.map(buildRuntimeAnswerViewModel),
    audioUrl: payload.audio?.url || scene.audioUrl,
    helperLabel: 'Dialogue choice',
    helperActionLabel: 'Ouça a cena',
  }
}

const buildSpeakingPrompt = (
  scene: MissionRuntimeSceneRecord,
  speakingExperience: RuntimeExperienceContract<'speaking'> | null,
): RuntimePromptViewModel => {
  if (!speakingExperience) {
    return {
      type: 'speaking' as const,
      npc: scene.character || scene.dialogue,
      question: 'How would you answer the officer?',
      translation: 'Escolha a resposta que soe mais natural para continuar a cena.',
      answers: scene.answers.map(buildRuntimeAnswerViewModel),
      audioUrl: scene.audioUrl,
      helperLabel: 'Your reply',
      helperActionLabel: 'Responda com calma',
    }
  }

  const payload = speakingExperience.payload as SpeakingExperiencePayload

  return {
    type: 'speaking' as const,
    npc: payload.npc,
    question: payload.prompt,
    translation: payload.translation || '',
      answers: scene.answers.map(buildRuntimeAnswerViewModel),
      audioUrl: payload.audio?.url || scene.audioUrl,
      helperLabel: 'Your reply',
      helperActionLabel: 'Fale com confiança',
  }
}

export function MissionRuntimeScenePreviewCard({
  scene,
  missionTitle,
}: {
  scene: MissionRuntimeSceneRecord
  missionTitle?: string
}) {
  const previewImageStyle = {
    objectPosition: `${scene.backgroundFocalX}% ${scene.backgroundFocalY}%`,
    transform: `translate3d(${scene.backgroundOffsetX}%, ${scene.backgroundOffsetY}%, 0) scale(${scene.backgroundScale / 100})`,
  } as CSSProperties
  const previewImageSrc = scene.backgroundImageUrl || scene.backgroundImageUrlMobile

  return (
    <article className={`runtime-scene-preview runtime-scene-preview-${scene.emotionalFeedbackTone}`}>
      {previewImageSrc ? (
        <img
          className="runtime-scene-preview-image"
          src={previewImageSrc}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          style={previewImageStyle}
        />
      ) : null}
      <div className="runtime-scene-preview-overlay" />
      <div className="runtime-scene-preview-copy">
        <span>{missionTitle || scene.missionTitle || 'Mission Runtime'}</span>
        <strong>{scene.character}</strong>
        <h3>{scene.question || scene.title}</h3>
        <p>{scene.questionTranslation || scene.subtitle}</p>
      </div>
      <div className="runtime-scene-preview-meta">
        <small>
          {scene.chapter} • Scene {scene.sceneNumber} of {scene.sceneTotal}
        </small>
        <span>+{scene.xpReward} XP</span>
      </div>
    </article>
  )
}

export function MissionRuntime({
  mission,
  scenes,
  sceneContracts = [],
  streakDays,
  totalXp,
  avatarUrl,
  onBack,
  onOpenAdmin,
}: MissionRuntimeProps) {
  const sortedScenes = useMemo(
    () =>
      [...scenes]
        .filter((scene) => scene.active)
        .sort((a, b) => a.order - b.order || a.sceneNumber - b.sceneNumber || a.id.localeCompare(b.id)),
    [scenes],
  )

  const sceneFlow = useMemo<RuntimeSceneFlow[]>(() => {
    if (!sortedScenes.length) return []

    const sceneMap = new Map(sortedScenes.map((scene) => [scene.id, scene]))

    if (sceneContracts.length) {
      const flows: RuntimeSceneFlow[] = []

      sceneContracts.forEach((contract, index) => {
          const legacyId = getLegacySceneIdFromContract(contract)
          const scene = sceneMap.get(legacyId) ?? sortedScenes[index] ?? null
          if (!scene) return

          flows.push({
            scene,
            contract,
            interactiveExperience:
              contract.experiences.find(
                (
                  experience,
                ): experience is RuntimeExperienceContract<'multiple_choice'> | RuntimeExperienceContract<'listening'> =>
                  experience.type === 'multiple_choice' || experience.type === 'listening',
              ) ?? null,
            listeningExperience:
              contract.experiences.find(
                (experience): experience is RuntimeExperienceContract<'listening'> =>
                  experience.type === 'listening',
              ) ?? null,
            speakingExperience:
              contract.experiences.find(
                (experience): experience is RuntimeExperienceContract<'speaking'> =>
                  experience.type === 'speaking',
              ) ?? null,
            feedbackExperience:
              contract.experiences.find(
                (experience): experience is RuntimeExperienceContract<'emotional_feedback'> =>
                  experience.type === 'emotional_feedback',
              ) ?? null,
          })
      })

      return flows
    }

    return sortedScenes.map((scene) => ({
      scene,
      contract: null,
      interactiveExperience: null,
      listeningExperience: null,
      speakingExperience: null,
      feedbackExperience: null,
    }))
  }, [sceneContracts, sortedScenes])

  const [phase, setPhase] = useState<RuntimePhase>('intro')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [sceneSteps, setSceneSteps] = useState<Record<string, RuntimeSceneStep>>({})
  const [feedbackRevealStages, setFeedbackRevealStages] = useState<Record<string, RuntimeFeedbackRevealStage>>({})
  const [earnedXp, setEarnedXp] = useState(0)
  const [comboCount, setComboCount] = useState(0)
  const [feedbackPulse, setFeedbackPulse] = useState(false)
  const [isListeningTransitioning, setIsListeningTransitioning] = useState(false)
  const [previousSceneId, setPreviousSceneId] = useState<string | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 780px)').matches : false,
  )
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0)
  const [previousBackgroundIndex, setPreviousBackgroundIndex] = useState(0)
  const activeSceneRef = useRef<string | null>(null)
  const pacingTimersRef = useRef<number[]>([])

  const clearPacingTimers = () => {
    pacingTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    pacingTimersRef.current = []
  }

  const schedulePacingTimer = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    pacingTimersRef.current.push(timer)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const media = window.matchMedia('(max-width: 780px)')
    const handleChange = () => setIsMobileViewport(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    setPhase('intro')
    setSceneIndex(0)
    setSelectedAnswers({})
    setSceneSteps({})
    setFeedbackRevealStages({})
    setEarnedXp(0)
    setComboCount(0)
    setFeedbackPulse(false)
    setPreviousSceneId(null)
    setIsListeningTransitioning(false)
    clearPacingTimers()
    activeSceneRef.current = null
  }, [mission.id])

  useEffect(() => () => clearPacingTimers(), [])

  const currentFlow = sceneFlow[sceneIndex] ?? null
  const currentScene = currentFlow?.scene ?? null
  const currentContract = currentFlow?.contract ?? null
  const interactiveExperience = currentFlow?.interactiveExperience ?? null
  const listeningExperience = currentFlow?.listeningExperience ?? null
  const speakingExperience = currentFlow?.speakingExperience ?? null
  const feedbackExperience = currentFlow?.feedbackExperience ?? null

  useEffect(() => {
    if (!currentScene) return
    const previousId = activeSceneRef.current
    if (previousId && previousId !== currentScene.id) {
      setPreviousSceneId(previousId)
      const timeout = window.setTimeout(() => setPreviousSceneId(null), 920)
      activeSceneRef.current = currentScene.id
      return () => window.clearTimeout(timeout)
    }

    activeSceneRef.current = currentScene.id
    return undefined
  }, [currentScene])

  const previousScene = sceneFlow.find((item) => item.scene.id === previousSceneId)?.scene ?? null
  const isImmigrationPlayableSlice =
    currentScene?.sceneNumber === 1 &&
    /airport/i.test(currentScene.missionTitle || mission.title) &&
    Boolean(listeningExperience && speakingExperience)
  const currentSceneStep = currentScene
    ? sceneSteps[currentScene.id] ?? (isImmigrationPlayableSlice ? 'listening' : 'speaking')
    : 'speaking'
  const prompt = currentScene
    ? currentSceneStep === 'speaking' || currentSceneStep === 'feedback'
      ? buildSpeakingPrompt(currentScene, speakingExperience)
      : buildInteractivePrompt(currentScene, interactiveExperience)
    : null
  const answerOptions = prompt?.answers ?? []
  const selectedAnswerId = currentScene ? selectedAnswers[currentScene.id] ?? '' : ''
  const selectedAnswer = answerOptions.find((answer) => answer.id === selectedAnswerId) ?? null
  const currentFeedbackRevealStage = currentScene
    ? feedbackRevealStages[currentScene.id] ?? 'idle'
    : 'idle'
  const feedbackVisible =
    Boolean(selectedAnswer) &&
    currentSceneStep === 'feedback' &&
    currentFeedbackRevealStage !== 'idle'
  const rewardVisible =
    currentFeedbackRevealStage === 'reward' || currentFeedbackRevealStage === 'ready'
  const feedback = currentScene ? buildFeedback(currentScene, selectedAnswer, feedbackExperience) : null
  const feedbackTitle =
    phase === 'scene'
      ? selectedAnswer
        ? feedbackVisible
          ? feedback?.title || currentScene?.emotionalFeedbackTitle || ''
          : 'Spark is reading the moment.'
        : isImmigrationPlayableSlice
          ? currentSceneStep === 'listening'
            ? 'Listen first.'
            : 'Your turn.'
          : interactiveExperience?.type === 'listening'
            ? 'Listen first.'
            : 'Choose your response.'
      : ''
  const feedbackBody =
    phase === 'scene'
      ? selectedAnswer
        ? feedbackVisible
          ? feedback?.body || currentScene?.emotionalFeedbackBody || ''
          : 'Hold the moment for a second. Spark will react once your answer lands.'
        : isImmigrationPlayableSlice
          ? currentSceneStep === 'listening'
            ? 'Let the officer finish the question. One clear answer is all you need.'
            : 'Choose the line you would actually say at the desk and keep your voice calm.'
          : 'React to the scene and Spark will guide your next move.'
      : ''
  const feedbackXpValue = rewardVisible && selectedAnswer ? feedback?.xp ?? currentScene?.xpReward ?? 0 : 0

  const currentAsset = currentScene ? buildRuntimeAsset(mission, currentScene) : mission.asset
  const previousAsset = previousScene ? buildRuntimeAsset(mission, previousScene) : null
  const currentBackgroundCandidates = useMemo(
    () => buildRuntimeBackgroundCandidates(currentScene, mission, currentAsset, isMobileViewport),
    [currentAsset, currentScene, isMobileViewport, mission],
  )
  const currentBackgroundCandidatesKey = useMemo(
    () => currentBackgroundCandidates.join('||'),
    [currentBackgroundCandidates],
  )
  const previousBackgroundCandidates = useMemo(
    () =>
      previousAsset
        ? buildRuntimeBackgroundCandidates(previousScene, mission, previousAsset, isMobileViewport)
        : [],
    [isMobileViewport, mission, previousAsset, previousScene],
  )
  const previousBackgroundCandidatesKey = useMemo(
    () => previousBackgroundCandidates.join('||'),
    [previousBackgroundCandidates],
  )
  const currentBackgroundSource =
    currentBackgroundCandidates[currentBackgroundIndex] ||
    pickRuntimeBackgroundSource(currentScene, mission, isMobileViewport)
  const previousBackgroundSource =
    previousBackgroundCandidates[previousBackgroundIndex] ||
    pickRuntimeBackgroundSource(previousScene, mission, isMobileViewport)
  const currentBackgroundStyle = currentScene
    ? ({
        ...buildRuntimeBackgroundImageStyle(currentScene),
      } as CSSProperties)
    : undefined
  const currentBackgroundContainerStyle = currentScene
    ? ({
        ...buildRuntimeBackgroundLayerStyle(currentBackgroundSource, currentScene),
      } as CSSProperties)
    : undefined
  const currentBackgroundLayerStyle = currentScene
    ? ({
        ...buildRuntimeBackgroundLayerStyle(currentBackgroundSource, currentScene),
      } as CSSProperties)
    : undefined
  const previousBackgroundStyle = previousScene
    ? ({
        ...buildRuntimeBackgroundImageStyle(previousScene),
      } as CSSProperties)
    : undefined
  const previousBackgroundLayerStyle = previousScene
    ? ({
        ...buildRuntimeBackgroundLayerStyle(previousBackgroundSource, previousScene),
      } as CSSProperties)
    : undefined

  useEffect(() => {
    setCurrentBackgroundIndex(0)
  }, [currentScene?.id, currentBackgroundCandidatesKey, isMobileViewport])

  useEffect(() => {
    setPreviousBackgroundIndex(0)
  }, [previousScene?.id, previousBackgroundCandidatesKey, isMobileViewport])

  const rewardBadgeIconUrl = currentScene?.rewardIconUrl
  const rewardChestIconUrl = currentScene?.rewardChestIconUrl || currentScene?.rewardIconUrl
  const totalSceneCount = Math.max(1, sceneFlow.length || currentScene?.sceneTotal || mission.sceneCount || 1)
  const displaySceneNumber =
    phase === 'intro'
      ? 1
      : phase === 'complete'
        ? isImmigrationPlayableSlice
          ? 1
          : totalSceneCount
        : sceneIndex + 1
  const progressPercent =
    phase === 'intro'
      ? 0
      : Math.min(100, Math.max(0, (displaySceneNumber / totalSceneCount) * 100))
  const rewardProgressCount =
    phase === 'complete'
      ? isImmigrationPlayableSlice
        ? 1
        : totalSceneCount
      : phase === 'intro'
        ? 0
        : Math.max(0, Math.min(totalSceneCount, sceneIndex + (selectedAnswer?.isCorrect && rewardVisible ? 1 : 0)))
  const stageCompanionImage = currentScene
    ? selectedAnswer
      ? selectedAnswer.isCorrect
        ? currentScene.feedbackCompanionPositiveImageUrl || currentScene.companionImageUrl
        : currentScene.feedbackCompanionRetryImageUrl || currentScene.companionImageUrl
      : currentScene.companionImageUrl
    : ''
  const storyFeedbackCompanionImage = currentScene && selectedAnswer
    ? selectedAnswer.isCorrect
      ? currentScene.storyFeedbackCompanionPositiveImageUrl ||
        currentScene.feedbackCompanionPositiveImageUrl ||
        currentScene.companionImageUrl
      : currentScene.storyFeedbackCompanionRetryImageUrl ||
        currentScene.feedbackCompanionRetryImageUrl ||
        currentScene.companionImageUrl
    : ''
  const totalXpLabel = totalXp + earnedXp
  const completedSceneCount = isImmigrationPlayableSlice ? 1 : totalSceneCount
  const canAdvance =
    phase === 'intro'
      ? true
      : phase === 'complete'
        ? true
        : isImmigrationPlayableSlice
          ? currentSceneStep === 'listening'
            ? !isListeningTransitioning
            : currentSceneStep === 'speaking'
              ? Boolean(selectedAnswer)
              : currentFeedbackRevealStage === 'ready'
          : answerOptions.length === 0 || Boolean(selectedAnswer)
  const rewardDots = Array.from({ length: totalSceneCount })
  const rewardLabel =
    phase === 'intro'
      ? 'Mission ready'
      : phase === 'complete'
        ? isImmigrationPlayableSlice
          ? 'Checkpoint complete'
          : 'Mission complete'
        : isImmigrationPlayableSlice && currentSceneStep === 'listening'
          ? isListeningTransitioning
            ? 'Take it in'
            : 'Listen first'
          : !selectedAnswer
          ? 'Checkpoint'
          : currentFeedbackRevealStage === 'idle'
            ? 'Spark is reading the moment'
            : !rewardVisible
              ? 'That landed'
              : selectedAnswer.isCorrect
                ? 'Excelente!'
                : 'Boa tentativa!'
  const companionStyle = currentScene
    ? ({
        '--runtime-companion-scale': `${currentScene.companionScale / 100}`,
        '--runtime-companion-offset-x': `${currentScene.companionOffsetX}%`,
        '--runtime-companion-offset-y': `${currentScene.companionOffsetY}%`,
        '--runtime-companion-glow-strength': `${currentScene.companionGlowStrength / 100}`,
      } as CSSProperties)
    : undefined
  const storyContextImageSource =
    currentScene?.backgroundImageUrl ||
    currentScene?.backgroundImageUrlMobile ||
    mission.backgroundDesktop ||
    mission.backgroundMobile ||
    mission.posterImage ||
    ''
  const storyContextStyle = currentScene
    ? ({
        objectPosition: `${currentScene.backgroundFocalX}% ${currentScene.backgroundFocalY}%`,
        transform: `translate3d(${currentScene.backgroundOffsetX}%, ${currentScene.backgroundOffsetY}%, 0) scale(${currentScene.backgroundScale / 100})`,
      } as CSSProperties)
    : undefined
  const introCompanionImage = currentScene?.companionImageUrl || ''
  const introWorldTitle = currentContract?.world.title || 'Airport Survival'
  const introSceneTitles = sceneFlow.map((item) => item.scene.title)
  const topbarXpValue = phase === 'complete' ? earnedXp || currentScene?.xpReward || 0 : currentScene?.xpReward || 0
  const nextTeaserScene =
    currentScene?.nextSceneId
      ? sceneFlow.find((item) => item.scene.id === currentScene.nextSceneId)?.scene ??
        sceneFlow[sceneIndex + 1]?.scene ??
        null
      : sceneFlow[sceneIndex + 1]?.scene ?? null
  const completionTitle = isImmigrationPlayableSlice ? 'You cleared immigration.' : `${mission.title} complete.`
  const completionBody = isImmigrationPlayableSlice
    ? 'You stayed calm, answered clearly and made it through the first checkpoint of the airport.'
    : 'You survived the airport with more confidence, clearer English and visible progress.'

  const handleSelectAnswer = (answer: RuntimeAnswerViewModel) => {
    if (!currentScene || phase !== 'scene') return

    const wasSelected = selectedAnswers[currentScene.id]
    if (isImmigrationPlayableSlice && currentSceneStep === 'feedback') return

    if (wasSelected === answer.id) {
      playSpeech(answer.text, answer.audioUrl)
      return
    }

    clearPacingTimers()
    setFeedbackRevealStages((current) => ({
      ...current,
      [currentScene.id]: 'idle',
    }))

    setSelectedAnswers((current) => ({
      ...current,
      [currentScene.id]: answer.id,
    }))

    setEarnedXp((current) => {
      if (wasSelected) {
        const previousAnswer = answerOptions.find((item) => item.id === wasSelected)
        return current - (previousAnswer?.xpReward ?? 0) + answer.xpReward
      }
      return current + answer.xpReward
    })

    setComboCount((current) => (answer.isCorrect ? current + 1 : Math.max(0, current - 1)))
    if (isImmigrationPlayableSlice) {
      setSceneSteps((current) => ({
        ...current,
        [currentScene.id]: 'feedback',
      }))
    }
    playSpeech(answer.text, answer.audioUrl)

    schedulePacingTimer(() => {
      setFeedbackRevealStages((current) => ({
        ...current,
        [currentScene.id]: 'feedback',
      }))
      setFeedbackPulse(true)
      schedulePacingTimer(() => setFeedbackPulse(false), 520)
    }, 220)

    schedulePacingTimer(() => {
      setFeedbackRevealStages((current) => ({
        ...current,
        [currentScene.id]: 'reward',
      }))
    }, 980)

    schedulePacingTimer(() => {
      setFeedbackRevealStages((current) => ({
        ...current,
        [currentScene.id]: 'ready',
      }))
    }, 1560)
  }

  const goToNextScene = () => {
    if (phase === 'intro') {
      if (currentScene && isImmigrationPlayableSlice) {
        setSceneSteps((current) => ({
          ...current,
          [currentScene.id]: 'listening',
        }))
      }
      setPhase('scene')
      return
    }

    if (phase === 'complete') {
      onBack()
      return
    }

    if (!currentScene) return

    if (isImmigrationPlayableSlice) {
      if (currentSceneStep === 'listening') {
        if (isListeningTransitioning) return
        setIsListeningTransitioning(true)
        playSpeech(prompt?.question || currentScene.question, prompt?.audioUrl || currentScene.audioUrl)
        clearPacingTimers()
        schedulePacingTimer(() => {
          setSceneSteps((current) => ({
            ...current,
            [currentScene.id]: 'speaking',
          }))
          setIsListeningTransitioning(false)
        }, 760)
        return
      }

      if (currentSceneStep === 'speaking') {
        if (!selectedAnswer) return
        return
      }

      if (currentFeedbackRevealStage !== 'ready') return
      setPhase('complete')
      return
    }

    const linkedIndex = currentScene.nextSceneId
      ? sceneFlow.findIndex((item) => item.scene.id === currentScene.nextSceneId)
      : -1
    const nextIndex = linkedIndex >= 0 ? linkedIndex : sceneIndex + 1

    if (nextIndex >= sceneFlow.length) {
      setPhase('complete')
      return
    }

    setSceneIndex(nextIndex)
  }

  const skipScene = () => {
    if (!sceneFlow.length) return
    clearPacingTimers()
    if (phase === 'intro') {
      if (currentScene && isImmigrationPlayableSlice) {
        setSceneSteps((current) => ({
          ...current,
          [currentScene.id]: 'listening',
        }))
      }
      setPhase('scene')
      return
    }

    if (isImmigrationPlayableSlice) {
      setPhase('complete')
      return
    }

    const nextIndex = Math.min(sceneFlow.length, sceneIndex + 1)
    if (nextIndex >= sceneFlow.length) {
      setPhase('complete')
      return
    }

    setSceneIndex(nextIndex)
  }

  const restartMission = () => {
    setPhase('intro')
    setSceneIndex(0)
    setSelectedAnswers({})
    setSceneSteps({})
    setFeedbackRevealStages({})
    setEarnedXp(0)
    setComboCount(0)
    setFeedbackPulse(false)
    setPreviousSceneId(null)
    setIsListeningTransitioning(false)
    clearPacingTimers()
    activeSceneRef.current = null
  }

  if (!currentScene) {
    return (
      <div className="mission-runtime-shell">
        <div className="mission-runtime-empty">
          <button className="mission-runtime-back" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            Voltar para Home
          </button>
          <div>
            <p className="mission-runtime-kicker">Mission Runtime</p>
            <h1>Nenhuma cena publicada para esta missão.</h1>
            <p>Abra o CMS, cadastre cenas no Mission Runtime e depois volte para testar a experiência cinematográfica.</p>
            {onOpenAdmin && (
              <button className="mission-runtime-primary" type="button" onClick={onOpenAdmin}>
                Abrir Mission Runtime CMS
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`mission-runtime-shell mission-runtime-tone-${currentScene.emotionalFeedbackTone}`}>
      <div className="mission-runtime-stage">
        <div className="mission-runtime-background" aria-hidden="true" style={currentBackgroundContainerStyle}>
          <div className="mission-runtime-background-layer mission-runtime-background-layer-ambient" style={currentBackgroundLayerStyle}>
            {currentBackgroundSource ? (
              <img
                className="mission-runtime-background-image"
                src={currentBackgroundSource}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                style={currentBackgroundStyle}
                onError={() =>
                  setCurrentBackgroundIndex((index) =>
                    index < currentBackgroundCandidates.length - 1 ? index + 1 : index,
                  )
                }
              />
            ) : null}
          </div>
          {previousAsset ? (
            <div className="mission-runtime-background-layer mission-runtime-background-layer-previous" style={previousBackgroundLayerStyle}>
              {previousBackgroundSource ? (
                <img
                  className="mission-runtime-background-image"
                  src={previousBackgroundSource}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  style={previousBackgroundStyle}
                  onError={() =>
                    setPreviousBackgroundIndex((index) =>
                      index < previousBackgroundCandidates.length - 1 ? index + 1 : index,
                    )
                  }
                />
              ) : null}
            </div>
          ) : null}
          <div className="mission-runtime-background-layer mission-runtime-background-layer-current" style={currentBackgroundLayerStyle}>
            {currentBackgroundSource ? (
              <img
                className="mission-runtime-background-image"
                src={currentBackgroundSource}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                style={currentBackgroundStyle}
                onError={() =>
                  setCurrentBackgroundIndex((index) =>
                    index < currentBackgroundCandidates.length - 1 ? index + 1 : index,
                  )
                }
              />
            ) : null}
          </div>
          <div className="mission-runtime-global-overlay" />
          <div className="mission-runtime-atmosphere" />
          <div className="mission-runtime-vignette" />
        </div>

        <header className="mission-runtime-topbar">
          <button className="mission-runtime-topbar-button" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            {mission.title}
          </button>
          <div className="mission-runtime-topbar-pill">
            {currentScene.chapter} • Scene {displaySceneNumber} of {totalSceneCount}
          </div>
          <div className="mission-runtime-progress-head">
            <span>Scene Progress</span>
            <div className="mission-runtime-progress-line">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <strong>
              {Math.min(displaySceneNumber, totalSceneCount)}/{totalSceneCount}
            </strong>
          </div>
          <div className="mission-runtime-topbar-pill mission-runtime-topbar-pill-xp">
            <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="XP reward icon">
              <Star size={15} />
            </RuntimeIcon>
            +{topbarXpValue} XP
          </div>
          <div className="mission-runtime-topbar-status">
            <div className="mission-runtime-status-pill">
              <Flame size={15} />
              <div>
                <strong>{streakDays}</strong>
                <span>day streak</span>
              </div>
            </div>
            <div className="mission-runtime-status-pill">
              <Medal size={15} />
              <div>
                <strong>{totalXpLabel.toLocaleString()}</strong>
                <span>XP Total</span>
              </div>
            </div>
            <div className="mission-runtime-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <UserRound size={18} />}
            </div>
          </div>
        </header>

        {phase === 'intro' ? (
          <>
            <div className="mission-runtime-main mission-runtime-main-phase">
              <section className="mission-runtime-phase-panel">
                <p className="mission-runtime-phase-kicker">{introWorldTitle}</p>
                <h1>{mission.title}</h1>
                <p>
                  You landed inside a noisy terminal. Answer clearly, recover when pressure rises and let Spark guide
                  you through the first checkpoint without breaking the scene.
                </p>
                <div className="mission-runtime-phase-route">
                  {introSceneTitles.map((title) => (
                    <span key={title}>{title}</span>
                  ))}
                </div>
                <div className="mission-runtime-phase-note">
                  <strong>Spark only steps in when the tension rises.</strong>
                  <p>Just enough to steady your confidence and keep the moment feeling human.</p>
                </div>
              </section>
              <aside className="mission-runtime-phase-side">
                {introCompanionImage ? (
                  <div className="mission-runtime-phase-companion">
                    <img src={introCompanionImage} alt="Spark companion" />
                  </div>
                ) : null}
              </aside>
            </div>
            <div className="mission-runtime-footer">
              <button className="mission-runtime-secondary" type="button" onClick={skipScene}>
                <Play size={16} />
                Pular intro
              </button>
              <div className="mission-runtime-reward-rail">
                <div className="mission-runtime-reward-core">
                  <span className="mission-runtime-reward-badge">
                    <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="Reward badge icon">
                      <Star size={16} />
                    </RuntimeIcon>
                  </span>
                  <div>
                    <small>Mission ready</small>
                    <strong>3 scenes</strong>
                  </div>
                </div>
                <div className="mission-runtime-reward-dots">
                  {rewardDots.map((_, index) => (
                    <span key={`intro-${index}`} className={index < rewardProgressCount ? 'is-filled' : ''} />
                  ))}
                </div>
                <div className="mission-runtime-reward-chest">
                  <RuntimeIcon iconUrl={rewardChestIconUrl} alt="Reward chest icon">
                    <Gift size={18} />
                  </RuntimeIcon>
                </div>
              </div>
              <button className="mission-runtime-primary" type="button" onClick={goToNextScene}>
                Start mission
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        ) : phase === 'complete' ? (
          <>
            <div className="mission-runtime-main mission-runtime-main-phase">
              <section className="mission-runtime-phase-panel mission-runtime-phase-panel-complete">
                <p className="mission-runtime-phase-kicker">{introWorldTitle}</p>
                <h1>{completionTitle}</h1>
                <p>{completionBody}</p>
                <div className="mission-runtime-phase-stats">
                  <div>
                    <small>XP earned</small>
                    <strong>+{earnedXp}</strong>
                  </div>
                  <div>
                    <small>Scenes cleared</small>
                    <strong>{completedSceneCount}</strong>
                  </div>
                  <div>
                    <small>Confidence loop</small>
                    <strong>{Math.max(comboCount, 1)}x</strong>
                  </div>
                </div>
                {isImmigrationPlayableSlice && nextTeaserScene ? (
                  <div className="mission-runtime-next-teaser">
                    <small>Next scene teaser</small>
                    <strong>{nextTeaserScene.title}</strong>
                    <p>{nextTeaserScene.subtitle || 'A new problem is waiting just beyond the checkpoint.'}</p>
                  </div>
                ) : null}
              </section>
              <aside className="mission-runtime-phase-side">
                {stageCompanionImage ? (
                  <div className="mission-runtime-phase-companion mission-runtime-phase-companion-complete">
                    <img src={stageCompanionImage} alt="Spark celebrating the mission" />
                  </div>
                ) : null}
              </aside>
            </div>
            <div className="mission-runtime-footer">
              <button className="mission-runtime-secondary" type="button" onClick={restartMission}>
                <Play size={16} />
                Replay mission
              </button>
              <div className="mission-runtime-reward-rail">
                <div className="mission-runtime-reward-core">
                  <span className="mission-runtime-reward-badge">
                    <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="Reward badge icon">
                      <Star size={16} />
                    </RuntimeIcon>
                  </span>
                  <div>
                    <small>Mission complete</small>
                    <strong>+{earnedXp} XP</strong>
                  </div>
                </div>
                <div className="mission-runtime-reward-dots">
                  {rewardDots.map((_, index) => (
                    <span key={`complete-${index}`} className={index < rewardProgressCount ? 'is-filled' : ''} />
                  ))}
                </div>
                <div className="mission-runtime-reward-chest">
                  <RuntimeIcon iconUrl={rewardChestIconUrl} alt="Reward chest icon">
                    <Gift size={18} />
                  </RuntimeIcon>
                </div>
              </div>
              <button className="mission-runtime-primary" type="button" onClick={onBack}>
                {isImmigrationPlayableSlice ? 'Back home' : 'Back home'}
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mission-runtime-main">
              <section className="mission-runtime-dialogue">
                <article className="mission-runtime-prompt-card">
                  <div className="mission-runtime-prompt-head">
                    <span>{prompt?.npc || currentScene.character}</span>
                    <button
                      type="button"
                      onClick={() => playSpeech(prompt?.question || currentScene.question, prompt?.audioUrl || currentScene.audioUrl)}
                      aria-label="Play prompt audio"
                    >
                      <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Prompt audio icon">
                        <Volume2 size={18} />
                      </RuntimeIcon>
                    </button>
                  </div>
                  <h1>{prompt?.question || currentScene.question}</h1>
                  <p>{prompt?.translation || currentScene.questionTranslation}</p>
                </article>

                <div className="mission-runtime-dots" aria-hidden="true">
                  <span className={currentSceneStep !== 'listening' ? 'is-active' : ''} />
                  <span className={currentSceneStep === 'feedback' || Boolean(selectedAnswer) ? 'is-active' : ''} />
                  <span className={currentSceneStep === 'feedback' ? 'is-active' : ''} />
                </div>

                <div className="mission-runtime-answers">
                  {isImmigrationPlayableSlice && currentSceneStep === 'listening' ? (
                    <button
                      className={`mission-runtime-listening-panel${isListeningTransitioning ? ' is-processing' : ''}`}
                      type="button"
                      disabled={isListeningTransitioning}
                      onClick={() => goToNextScene()}
                    >
                      <span className="mission-runtime-listening-audio">
                        <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Listening audio icon">
                          <Volume2 size={18} />
                        </RuntimeIcon>
                      </span>
                      <span className="mission-runtime-listening-copy">
                        <strong>{prompt?.helperLabel || 'Listening moment'}</strong>
                        <small>{isListeningTransitioning ? 'Take the question in. Your answer comes next.' : 'Hear the officer first, then answer like a traveler.'}</small>
                      </span>
                      <span className="mission-runtime-answer-check">
                        {isListeningTransitioning ? <Volume2 size={18} /> : <ArrowRight size={18} />}
                      </span>
                    </button>
                  ) : (
                    answerOptions.map((answer) => (
                      <button
                        key={answer.id}
                        className={`mission-runtime-answer${selectedAnswer?.id === answer.id ? ' is-selected' : ''}${isImmigrationPlayableSlice && currentSceneStep === 'feedback' ? ' is-locked' : ''}`}
                        type="button"
                        disabled={isImmigrationPlayableSlice && currentSceneStep === 'feedback'}
                        onClick={() => handleSelectAnswer(answer)}
                      >
                        <span className="mission-runtime-answer-audio">
                          <RuntimeIcon iconUrl={currentScene.answerAudioIconUrl} alt="Answer audio icon">
                            {prompt?.type === 'listening' ? <Volume2 size={18} /> : <AudioLines size={18} />}
                          </RuntimeIcon>
                        </span>
                        <span className="mission-runtime-answer-copy">
                          <strong>{answer.text}</strong>
                          <small>{answer.translation}</small>
                        </span>
                        {selectedAnswer?.id === answer.id ? (
                          <span className="mission-runtime-answer-check">
                            <Check size={18} />
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </section>

              <aside className="mission-runtime-companion-column">
                <div className="mission-runtime-feedback-stage">
                  <article
                    className={`mission-runtime-feedback-card${feedbackPulse ? ' is-pulsing' : ''}${
                      feedbackVisible ? ' is-revealed' : ''
                    }${rewardVisible ? ' is-reward-ready' : ''}`}
                  >
                    <span className="mission-runtime-feedback-star">
                      <RuntimeIcon iconUrl={currentScene.feedbackIconUrl} alt="Feedback icon">
                        <Sparkles size={16} />
                      </RuntimeIcon>
                    </span>
                    <div className="mission-runtime-feedback-copy">
                      <strong>{feedbackTitle}</strong>
                      <p>{feedbackBody}</p>
                      {selectedAnswer ? (
                        <span className="mission-runtime-feedback-xp">
                          <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="XP reward icon">
                            <Star size={16} />
                          </RuntimeIcon>
                          +{feedbackXpValue} XP
                        </span>
                      ) : null}
                    </div>
                  </article>
                  {stageCompanionImage && feedbackVisible ? (
                    <div className={`mission-runtime-character${rewardVisible ? ' is-revealed' : ''}`} style={companionStyle}>
                      <img src={stageCompanionImage} alt="Spark companion" />
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>

            <div className="mission-runtime-footer">
              <button className="mission-runtime-secondary" type="button" onClick={skipScene}>
                <Play size={16} />
                Pular cena
              </button>

              <div className={`mission-runtime-reward-rail${rewardVisible ? ' is-reward-ready' : ''}`}>
                <div className="mission-runtime-reward-core">
                  <span className="mission-runtime-reward-badge">
                    <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="Reward badge icon">
                      <Star size={16} />
                    </RuntimeIcon>
                  </span>
                  <div>
                    <small>{rewardLabel}</small>
                    <strong>+{rewardVisible && selectedAnswer ? feedbackXpValue : currentScene.xpReward} XP</strong>
                  </div>
                </div>
                <div className="mission-runtime-reward-dots">
                  {rewardDots.map((_, index) => (
                    <span key={`${currentScene.id}-${index}`} className={index < rewardProgressCount ? 'is-filled' : ''} />
                  ))}
                </div>
                <div className="mission-runtime-reward-chest">
                  <RuntimeIcon iconUrl={rewardChestIconUrl} alt="Reward chest icon">
                    <Gift size={18} />
                  </RuntimeIcon>
                </div>
              </div>

              <button className="mission-runtime-primary" type="button" disabled={!canAdvance} onClick={goToNextScene}>
                {isImmigrationPlayableSlice
                  ? currentSceneStep === 'listening'
                    ? isListeningTransitioning
                      ? 'Listening...'
                      : 'I understood'
                    : currentSceneStep === 'feedback'
                      ? rewardVisible
                        ? 'See what happens next'
                        : 'Let it land'
                      : 'Continue'
                  : sceneIndex >= totalSceneCount - 1
                    ? 'Complete mission'
                    : 'Próxima'}
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      {phase === 'scene' ? (
        <>
          <section className="mission-runtime-story-grid">
            <div className="mission-runtime-section-head">
              <span>EXPERIÊNCIA DA MISSÃO</span>
            </div>
            <div className="mission-runtime-story-cards">
              <article className="mission-runtime-story-card">
                <span className="mission-runtime-story-label">Pergunta e contexto</span>
                <div className="mission-runtime-context-scene">
                  {storyContextImageSource ? (
                    <img
                      className="mission-runtime-context-image"
                      src={storyContextImageSource}
                      alt=""
                      aria-hidden="true"
                      referrerPolicy="no-referrer"
                      style={storyContextStyle}
                    />
                  ) : null}
                  <div className="mission-runtime-context-overlay" />
                  <div className="mission-runtime-context-prompt">
                    <div className="mission-runtime-context-head">
                      <span>{prompt?.npc || currentScene.character}</span>
                      <button
                        type="button"
                        onClick={() => playSpeech(prompt?.question || currentScene.question, prompt?.audioUrl || currentScene.audioUrl)}
                        aria-label="Play prompt audio"
                      >
                        <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Voice prompt icon">
                          <Volume2 size={16} />
                        </RuntimeIcon>
                      </button>
                    </div>
                    <strong>{prompt?.question || currentScene.question}</strong>
                    <p>{prompt?.translation || currentScene.questionTranslation}</p>
                  </div>
                  <button
                    className="mission-runtime-story-voice mission-runtime-story-voice-wave"
                    type="button"
                    onClick={() => playSpeech(prompt?.question || currentScene.question, prompt?.audioUrl || currentScene.audioUrl)}
                  >
                    <span className="mission-runtime-story-voice-orb">
                      <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Voice prompt icon">
                        {prompt?.type === 'listening' ? <Volume2 size={16} /> : <Mic size={16} />}
                      </RuntimeIcon>
                    </span>
                    <span className="mission-runtime-story-voice-line" aria-hidden="true">
                      {waveformBars.slice(0, 18).map((height, index) => (
                        <i
                          key={`${currentScene.id}-prompt-wave-${index}`}
                          style={{ height: `${Math.max(20, height - 6)}%`, animationDelay: `${index * 55}ms` }}
                        />
                      ))}
                    </span>
                    <span className="mission-runtime-story-voice-text">{prompt?.helperActionLabel || 'Toque para falar'}</span>
                  </button>
                </div>
              </article>

              <article className="mission-runtime-story-card mission-runtime-story-card-response">
                <span className="mission-runtime-story-label">Resposta do usuário</span>
                <div className="mission-runtime-story-response-card">
                  <small>YOU</small>
                  <strong>
                    {selectedAnswer?.text ||
                      (currentSceneStep === 'listening'
                        ? 'Listen before you answer.'
                        : 'Choose the line you would actually say.')}
                  </strong>
                  <p>
                    {selectedAnswer?.translation ||
                      (currentSceneStep === 'listening'
                        ? 'Take in the officer’s question first. You only need one calm answer.'
                        : 'Choose the line that sounds most natural at the desk.')}
                  </p>
                  <button
                    type="button"
                    className="mission-runtime-mini-audio"
                    onClick={() => selectedAnswer && playSpeech(selectedAnswer.text, selectedAnswer.audioUrl)}
                    disabled={!selectedAnswer}
                  >
                    <RuntimeIcon iconUrl={currentScene.answerAudioIconUrl} alt="Selected answer audio icon">
                      <Volume2 size={16} />
                    </RuntimeIcon>
                  </button>
                </div>
                <div className="mission-runtime-waveform-card">
                  <div className="mission-runtime-waveform">
                    {waveformBars.map((height, index) => (
                      <span
                        key={`${currentScene.id}-wave-${index}`}
                        style={{ height: `${height}%`, animationDelay: `${index * 40}ms` }}
                      />
                    ))}
                  </div>
                  <span className={`mission-runtime-waveform-check${selectedAnswer ? ' is-visible' : ''}`}>
                    <Check size={16} />
                  </span>
                </div>
              </article>

              <article className="mission-runtime-story-card mission-runtime-story-card-feedback">
                <span className="mission-runtime-story-label">Feedback emocional</span>
                <div className="mission-runtime-story-feedback-card">
                  <span className="mission-runtime-story-feedback-star">
                    <RuntimeIcon iconUrl={currentScene.feedbackIconUrl} alt="Feedback sparkle icon">
                      <Sparkles size={16} />
                    </RuntimeIcon>
                  </span>
                  <div className="mission-runtime-story-feedback-copy">
                    <strong>{feedbackTitle}</strong>
                    <p>{feedbackBody}</p>
                    {selectedAnswer ? (
                      <span className="mission-runtime-story-feedback-xp">
                        <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="XP reward icon">
                          <Star size={16} />
                        </RuntimeIcon>
                        +{feedbackXpValue} XP
                      </span>
                    ) : null}
                  </div>
                  {storyFeedbackCompanionImage && feedbackVisible ? (
                    <div className={`mission-runtime-story-feedback-companion${rewardVisible ? ' is-revealed' : ''}`}>
                      <img src={storyFeedbackCompanionImage} alt="Spark companion emotional feedback" />
                    </div>
                  ) : null}
                </div>
              </article>
            </div>
          </section>

          <section className="mission-runtime-system-grid">
            <div className="mission-runtime-section-head">
              <span>SISTEMAS INTEGRADOS</span>
            </div>
            <div className="mission-runtime-system-cards">
              <article className="mission-runtime-system-card">
                <div className="mission-runtime-system-icon">
                  <Sparkles size={18} />
                </div>
                <strong>Feedback Adaptativo</strong>
                <p>Respostas se adaptam ao desempenho e ao tom do usuário.</p>
              </article>
              <article className="mission-runtime-system-card">
                <div className="mission-runtime-system-icon">
                  <Shield size={18} />
                </div>
                <strong>Companheiro Emocional</strong>
                <p>O Spark te acompanha, reage e celebra suas conquistas.</p>
              </article>
              <article className="mission-runtime-system-card">
                <div className="mission-runtime-system-icon">
                  <Star size={18} />
                </div>
                <strong>XP, Combo & Streak</strong>
                <div className="mission-runtime-system-stats">
                  <div>
                    <small>Combo</small>
                    <strong>{comboCount}</strong>
                  </div>
                  <div>
                    <small>Streak</small>
                    <strong>{streakDays}</strong>
                  </div>
                </div>
              </article>
              <article className="mission-runtime-system-card">
                <div className="mission-runtime-system-icon">
                  <Volume2 size={18} />
                </div>
                <strong>Cena Cinemática</strong>
                <p>Ambientes vivos que mudam com a sua progressão.</p>
              </article>
              <article className="mission-runtime-system-card">
                <div className="mission-runtime-system-icon">
                  <ChevronRight size={18} />
                </div>
                <strong>Progresso da Missão</strong>
                <div className="mission-runtime-system-progress">
                  <small>
                    {currentScene.chapter} • Scene {displaySceneNumber} of {totalSceneCount}
                  </small>
                  <div className="mission-runtime-mini-progress">
                    <span style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </article>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
