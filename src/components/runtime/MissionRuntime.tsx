import './MissionRuntime.css'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  Flame,
  Gift,
  Hourglass,
  Languages,
  Medal,
  Mic,
  Play,
  Shield,
  Sparkles,
  Star,
  UserRound,
  Volume2,
  VolumeX,
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
import {
  getRuntimeSpeechAudioUrl,
  prefetchRuntimeSpeechAudio,
  type RuntimeSpeechVoiceRole,
} from '../../services/runtimeSpeech'

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
  learnerLevel?: number | null
  questionTimeLimitSeconds?: number | null
  streakDays: number
  totalXp: number
  avatarUrl?: string | null
  onBack: () => void
  onOpenAdmin?: () => void
}

type RuntimePhase = 'intro' | 'scene' | 'complete'
type RuntimeSceneStep = 'listening' | 'speaking' | 'feedback'
type RuntimeFeedbackRevealStage = 'idle' | 'feedback' | 'reward' | 'ready'
type RuntimeAudioCue = 'prompt' | 'listening' | 'answer' | null

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
const runtimeSubtitleStorageKey = 'sparklingo.runtime.showTranslations'
const runtimeSoundStorageKey = 'sparklingo.runtime.soundEnabled'

const resolveDefaultSubtitleVisibility = (learnerLevel?: number | null) =>
  learnerLevel == null || learnerLevel <= 3

const readStoredSubtitlePreference = () => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(runtimeSubtitleStorageKey)
  if (stored === 'on') return true
  if (stored === 'off') return false
  return null
}

const writeStoredSubtitlePreference = (showTranslations: boolean) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(runtimeSubtitleStorageKey, showTranslations ? 'on' : 'off')
}

const readStoredSoundPreference = () => {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(runtimeSoundStorageKey)
  if (stored === 'off') return false
  return true
}

const writeStoredSoundPreference = (soundEnabled: boolean) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(runtimeSoundStorageKey, soundEnabled ? 'on' : 'off')
}

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
  scene: MissionRuntimeSceneRecord | null,
): CSSProperties | undefined => {
  if (!scene) return undefined

  return {
    '--runtime-background-focal-x': `${scene.backgroundFocalX}%`,
    '--runtime-background-focal-y': `${scene.backgroundFocalY}%`,
    '--runtime-background-offset-x': `${scene.backgroundOffsetX}%`,
    '--runtime-background-offset-y': `${scene.backgroundOffsetY}%`,
    '--runtime-background-scale': `${scene.backgroundScale / 100}`,
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

let sharedRuntimeAudio: HTMLAudioElement | null = null

const getSharedRuntimeAudio = () => {
  if (typeof window === 'undefined') return null
  if (sharedRuntimeAudio) return sharedRuntimeAudio

  sharedRuntimeAudio = new Audio()
  sharedRuntimeAudio.preload = 'auto'
  return sharedRuntimeAudio
}

const stopRuntimeSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }

  if (sharedRuntimeAudio) {
    sharedRuntimeAudio.pause()
    sharedRuntimeAudio.currentTime = 0
  }
}

const playResolvedAudioUrl = async (audioUrl: string) => {
  const audio = getSharedRuntimeAudio()
  if (!audio) return false

  try {
    stopRuntimeSpeech()

    if (audio.src === audioUrl) {
      audio.currentTime = 0
    } else {
      audio.src = audioUrl
      audio.load()
    }

    audio.defaultPlaybackRate = 0.84
    audio.playbackRate = 0.84
    if ('preservesPitch' in audio) {
      (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true
    }

    await audio.play()
    return true
  } catch {
    return false
  }
}

const playSpeech = async (
  text: string,
  options?: {
    audioUrl?: string
    voiceRole?: RuntimeSpeechVoiceRole
  },
) => {
  const trimmedText = text.trim()
  const audioUrl = options?.audioUrl

  if (audioUrl) {
    console.log('[runtime-speech] runtime manual audio attempt', {
      voiceRole: options?.voiceRole || 'default',
      audioUrlPreview: audioUrl.slice(0, 80),
      textPreview: trimmedText.slice(0, 80),
    })
    const playedDirectAudio = await playResolvedAudioUrl(audioUrl)
    if (playedDirectAudio) {
      console.log('[runtime-speech] runtime manual audio playing', {
        voiceRole: options?.voiceRole || 'default',
        audioUrlPreview: audioUrl.slice(0, 80),
      })
      return
    }

    console.log('[runtime-speech] runtime manual audio failed, falling back to TTS', {
      voiceRole: options?.voiceRole || 'default',
      audioUrlPreview: audioUrl.slice(0, 80),
    })
  }

  const resolvedAudioUrl = trimmedText
    ? await getRuntimeSpeechAudioUrl(trimmedText, {
        voiceRole: options?.voiceRole,
      })
    : ''

  if (resolvedAudioUrl) {
    console.log('[runtime-speech] runtime generated audio attempt', {
      voiceRole: options?.voiceRole || 'default',
      textPreview: trimmedText.slice(0, 80),
    })
    const playedGeneratedAudio = await playResolvedAudioUrl(resolvedAudioUrl)
    if (playedGeneratedAudio) {
      console.log('[runtime-speech] runtime generated audio playing', {
        voiceRole: options?.voiceRole || 'default',
        textPreview: trimmedText.slice(0, 80),
      })
      return
    }
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !trimmedText) return
  console.log('[runtime-speech] runtime browser fallback', {
    voiceRole: options?.voiceRole || 'default',
    textPreview: trimmedText.slice(0, 80),
  })
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.84
  utterance.pitch = 1
  stopRuntimeSpeech()
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

const buildImmigrationSparkMemory = (selectedAnswer: RuntimeAnswerViewModel | null) => {
  if (!selectedAnswer) {
    return {
      listeningTitle: 'Spark is staying quiet.',
      listeningBody: 'Let the officer finish. One calm answer will do more for you than a rushed one.',
      speakingTitle: 'Spark is giving you a beat.',
      speakingBody: 'You do not need a speech here. Choose the line that would keep the queue moving.',
      holdingTitle: 'Spark is staying with you.',
      holdingBody: 'One calm line is enough. Let the checkpoint settle before you move.',
      responseBody: 'Spark is waiting for the line that sounds believable at the desk and simple enough to trust.',
      waveLabel: 'Your reply will settle here once you commit to it',
      rewardLabel: 'Checkpoint is settling',
      completionRewardLabel: 'Checkpoint behind you',
      completionOutcome: 'Held steady',
      completionConfidence: 'Taking root',
      completionTitle: 'You stayed with the moment.',
      completionBody: 'That is how confidence starts here: one scene at a time, without rushing the answer.',
      teaserBody: 'The airport is not finished with you yet. One practical problem is waiting right after this checkpoint.',
    }
  }

  if (selectedAnswer.isCorrect) {
    return {
      listeningTitle: 'Spark stayed calm.',
      listeningBody: 'You heard the checkpoint clearly. Now keep the same calm energy in your answer.',
      speakingTitle: 'Spark is backing this line.',
      speakingBody: 'This answer sounds grounded, direct and right for the desk in front of you.',
      holdingTitle: 'Spark felt that land.',
      holdingBody: 'Short, calm and believable. That is exactly how confidence should sound at the desk.',
      responseBody: 'Spark heard a line that keeps the officer moving and leaves no doubt about the purpose of your trip.',
      waveLabel: 'Spark heard a calm, travel-ready answer',
      rewardLabel: 'Confidence landed',
      completionRewardLabel: 'Checkpoint behind you',
      completionOutcome: 'Clear answer',
      completionConfidence: 'Voice steadier',
      completionTitle: 'Keep that same calm voice.',
      completionBody: 'You did not need a perfect speech. You needed one clear answer that matched the moment, and you gave it.',
      teaserBody: 'You are through the line. Now the airport shifts the tension to your missing luggage.',
    }
  }

  if (selectedAnswer.id === 'airport-a1') {
    return {
      listeningTitle: 'Spark heard the instinct.',
      listeningBody: 'The intention is practical. The checkpoint just wants the tighter version of it.',
      speakingTitle: 'Spark is nudging the line.',
      speakingBody: 'Tourism makes sense, but the officer wants the clearest possible version of why you are here.',
      holdingTitle: 'Spark caught the intention.',
      holdingBody: 'Tourism makes sense in real life, but this officer needs the exact reason in the cleanest possible form.',
      responseBody: 'Spark heard the right travel instinct first. Now the checkpoint is asking for a cleaner, more exact answer.',
      waveLabel: 'Spark heard intention before precision',
      rewardLabel: 'Instinct landed',
      completionRewardLabel: 'Checkpoint behind you',
      completionOutcome: 'Almost there',
      completionConfidence: 'Instinct intact',
      completionTitle: 'You were close for a reason.',
      completionBody: 'Your instinct was practical. Next time, keep that instinct and tighten the wording even more.',
      teaserBody: 'You crossed the desk, but the airport is about to test how you ask for help under pressure.',
    }
  }

  if (selectedAnswer.id === 'airport-a2') {
    return {
      listeningTitle: 'Spark noticed the fluency.',
      listeningBody: 'The English is there. The checkpoint just needs the story to stay inside this exact trip.',
      speakingTitle: 'Spark is pulling it back.',
      speakingBody: 'Your English sounds clean, but the scene still needs the answer to point back to this journey.',
      holdingTitle: 'Spark noticed the drift.',
      holdingBody: 'The English was clean, but the story slipped away from this trip. Pull the answer back to the actual moment.',
      responseBody: 'Spark heard fluent English, but the checkpoint drifted off the real reason for this trip.',
      waveLabel: 'Spark heard fluency drift off the desk',
      rewardLabel: 'Drift noticed',
      completionRewardLabel: 'Checkpoint behind you',
      completionOutcome: 'Recovered focus',
      completionConfidence: 'Story corrected',
      completionTitle: 'You corrected the drift.',
      completionBody: 'Even when your first instinct changed the story, you stayed present long enough to recover the checkpoint.',
      teaserBody: 'You are moving again, but the next airport problem will demand clarity for a different reason.',
    }
  }

  return {
    listeningTitle: 'Spark is with you.',
    listeningBody: 'Take the checkpoint one line at a time. The scene will feel simpler once you let it settle.',
    speakingTitle: 'Spark is holding the space.',
    speakingBody: 'Stay with the desk. The answer will feel cleaner when you keep it tied to the real moment.',
    holdingTitle: 'Spark is with you.',
    holdingBody: 'Stay with the checkpoint. A clearer answer always feels simpler when the moment settles.',
    responseBody: 'Spark is helping you pull the scene back into focus before the checkpoint moves on.',
    waveLabel: 'Spark is listening for the cleanest version of this answer',
    rewardLabel: 'Checkpoint held',
    completionRewardLabel: 'Checkpoint behind you',
    completionOutcome: 'Kept moving',
    completionConfidence: 'Pressure handled',
    completionTitle: 'You kept moving.',
    completionBody: 'That recovery matters. The mission is teaching you how to stay present when the line keeps moving.',
    teaserBody: 'The scene is over, but the airport still has another practical obstacle waiting ahead.',
  }
}

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
      helperLabel: 'Officer question',
      helperActionLabel: 'Hear the question',
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
      helperActionLabel: 'Hear the question',
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
    helperLabel: 'Officer question',
    helperActionLabel: 'Hear the question',
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
      question: scene.question,
      translation: scene.questionTranslation,
      answers: scene.answers.map(buildRuntimeAnswerViewModel),
      audioUrl: scene.audioUrl,
      helperLabel: 'Your reply',
      helperActionLabel: 'Answer calmly',
    }
  }

  const payload = speakingExperience.payload as SpeakingExperiencePayload

  return {
    type: 'speaking' as const,
    npc: payload.npc,
    question: scene.question || payload.prompt,
    translation: scene.questionTranslation || payload.translation || '',
    answers: scene.answers.map(buildRuntimeAnswerViewModel),
    audioUrl: scene.audioUrl || payload.audio?.url || '',
    helperLabel: 'Your reply',
    helperActionLabel: 'Answer naturally',
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
  learnerLevel,
  questionTimeLimitSeconds,
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

      const representedSceneIds = new Set(flows.map((flow) => flow.scene.id))
      sortedScenes.forEach((scene) => {
        if (representedSceneIds.has(scene.id)) return

        flows.push({
          scene,
          contract: null,
          interactiveExperience: null,
          listeningExperience: null,
          speakingExperience: null,
          feedbackExperience: null,
        })
      })

      return flows.sort(
        (a, b) =>
          a.scene.order - b.scene.order ||
          a.scene.sceneNumber - b.scene.sceneNumber ||
          a.scene.id.localeCompare(b.scene.id),
      )
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
  const [isCheckpointTransitioning, setIsCheckpointTransitioning] = useState(false)
  const [previousSceneId, setPreviousSceneId] = useState<string | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 780px)').matches : false,
  )
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0)
  const [previousBackgroundIndex, setPreviousBackgroundIndex] = useState(0)
  const [activeAudioCue, setActiveAudioCue] = useState<RuntimeAudioCue>(null)
  const [showTranslations, setShowTranslations] = useState(() => {
    const storedPreference = readStoredSubtitlePreference()
    if (storedPreference !== null) return storedPreference
    return resolveDefaultSubtitleVisibility(learnerLevel)
  })
  const [soundEnabled, setSoundEnabled] = useState(readStoredSoundPreference)
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0)
  const [timedOutScenes, setTimedOutScenes] = useState<Record<string, boolean>>({})
  const activeSceneRef = useRef<string | null>(null)
  const autoNarrationKeyRef = useRef<string>('')
  const hoverPreviewRef = useRef<Record<string, number>>({})
  const pacingTimersRef = useRef<number[]>([])
  const audioCueTimerRef = useRef<number | null>(null)
  const questionTimeoutRef = useRef<string | null>(null)

  const clearPacingTimers = () => {
    pacingTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    pacingTimersRef.current = []
  }

  const clearAudioCueTimer = useCallback(() => {
    if (audioCueTimerRef.current !== null) {
      window.clearTimeout(audioCueTimerRef.current)
      audioCueTimerRef.current = null
    }
  }, [])

  const activateAudioCue = useCallback((cue: Exclude<RuntimeAudioCue, null>, duration = 1800) => {
    clearAudioCueTimer()
    setActiveAudioCue(cue)
    audioCueTimerRef.current = window.setTimeout(() => {
      setActiveAudioCue(null)
      audioCueTimerRef.current = null
    }, duration)
  }, [clearAudioCueTimer])

  const triggerSpeech = useCallback((
    text: string,
    audioUrl?: string,
    cue: Exclude<RuntimeAudioCue, null> = 'prompt',
    voiceRole: RuntimeSpeechVoiceRole = 'narration',
  ) => {
    const trimmed = text.trim()
    if (!trimmed && !audioUrl) return
    activateAudioCue(cue, audioUrl ? 2400 : Math.min(3200, Math.max(1500, trimmed.length * 42)))
    void playSpeech(text, { audioUrl, voiceRole })
  }, [activateAudioCue])

  const toggleSpeech = useCallback((
    text: string,
    audioUrl?: string,
    cue: Exclude<RuntimeAudioCue, null> = 'prompt',
    voiceRole: RuntimeSpeechVoiceRole = 'narration',
  ) => {
    if (activeAudioCue === cue) {
      stopRuntimeSpeech()
      clearAudioCueTimer()
      setActiveAudioCue(null)
      return
    }

    triggerSpeech(text, audioUrl, cue, voiceRole)
  }, [activeAudioCue, clearAudioCueTimer, triggerSpeech])

  const previewSpeechOnHover = useCallback((
    previewKey: string,
    text: string,
    audioUrl: string | undefined,
    cue: Exclude<RuntimeAudioCue, null>,
    voiceRole: RuntimeSpeechVoiceRole,
  ) => {
    if (!soundEnabled) return
    const now = Date.now()
    const lastRun = hoverPreviewRef.current[previewKey] ?? 0
    if (now - lastRun < 1400) return
    hoverPreviewRef.current[previewKey] = now
    triggerSpeech(text, audioUrl, cue, voiceRole)
  }, [soundEnabled, triggerSpeech])

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
    const storedPreference = readStoredSubtitlePreference()
    if (storedPreference !== null) {
      setShowTranslations(storedPreference)
      return
    }

    setShowTranslations(resolveDefaultSubtitleVisibility(learnerLevel))
  }, [learnerLevel])

  useEffect(() => {
    setPhase('intro')
    setSceneIndex(0)
    setSelectedAnswers({})
    setSceneSteps({})
    setFeedbackRevealStages({})
    setTimedOutScenes({})
    setQuestionTimeLeft(0)
    setEarnedXp(0)
    setComboCount(0)
    setFeedbackPulse(false)
    setPreviousSceneId(null)
    setIsListeningTransitioning(false)
    setIsCheckpointTransitioning(false)
    setActiveAudioCue(null)
    clearPacingTimers()
    clearAudioCueTimer()
    activeSceneRef.current = null
    autoNarrationKeyRef.current = ''
    questionTimeoutRef.current = null
  }, [clearAudioCueTimer, mission.id])

  useEffect(
    () => () => {
      clearPacingTimers()
      clearAudioCueTimer()
      stopRuntimeSpeech()
    },
    [clearAudioCueTimer],
  )

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
      stopRuntimeSpeech()
      setActiveAudioCue(null)
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
    ? sceneSteps[currentScene.id] ?? 'speaking'
    : 'speaking'
  const prompt = useMemo(
    () =>
      currentScene
        ? currentSceneStep === 'speaking' || currentSceneStep === 'feedback'
          ? buildSpeakingPrompt(currentScene, speakingExperience)
          : buildInteractivePrompt(currentScene, interactiveExperience)
        : null,
    [currentScene, currentSceneStep, interactiveExperience, speakingExperience],
  )
  const speakingPromptPreview = useMemo(
    () => (currentScene ? buildSpeakingPrompt(currentScene, speakingExperience) : null),
    [currentScene, speakingExperience],
  )
  const answerOptions = useMemo(() => prompt?.answers ?? [], [prompt])
  const selectedAnswerId = currentScene ? selectedAnswers[currentScene.id] ?? '' : ''
  const selectedAnswer = answerOptions.find((answer) => answer.id === selectedAnswerId) ?? null
  const currentSceneTimedOut = currentScene ? Boolean(timedOutScenes[currentScene.id]) : false
  const currentFeedbackRevealStage = currentScene
    ? feedbackRevealStages[currentScene.id] ?? 'idle'
    : 'idle'
  const feedbackVisible =
    Boolean(selectedAnswer) &&
    currentSceneStep === 'feedback' &&
    currentFeedbackRevealStage !== 'idle'
  const rewardVisible =
    currentFeedbackRevealStage === 'reward' || currentFeedbackRevealStage === 'ready'
  const sparkMemory = buildImmigrationSparkMemory(selectedAnswer)
  const shouldShowStoryReflection =
    phase === 'scene' &&
    (!isImmigrationPlayableSlice || feedbackVisible || rewardVisible || isCheckpointTransitioning)
  const shouldShowSystemReflection =
    phase === 'scene' && (!isImmigrationPlayableSlice || rewardVisible || isCheckpointTransitioning)
  const feedback = currentScene ? buildFeedback(currentScene, selectedAnswer, feedbackExperience) : null
  const feedbackTitle =
    phase === 'scene'
      ? selectedAnswer
        ? feedbackVisible
          ? feedback?.title || currentScene?.emotionalFeedbackTitle || ''
          : isImmigrationPlayableSlice
            ? sparkMemory.holdingTitle
            : 'Spark is reading the moment.'
        : isImmigrationPlayableSlice
          ? currentSceneStep === 'listening'
            ? sparkMemory.listeningTitle
            : sparkMemory.speakingTitle
          : interactiveExperience?.type === 'listening'
            ? 'Listen first.'
            : 'Choose your response.'
      : ''
  const feedbackBody =
    phase === 'scene'
      ? selectedAnswer
        ? feedbackVisible
          ? feedback?.body || currentScene?.emotionalFeedbackBody || ''
          : isImmigrationPlayableSlice
            ? sparkMemory.holdingBody
            : 'Hold the moment for a second. Spark will react once your answer lands.'
        : isImmigrationPlayableSlice
          ? currentSceneStep === 'listening'
            ? sparkMemory.listeningBody
            : sparkMemory.speakingBody
          : 'React to the scene and Spark will guide your next move.'
      : ''
  const feedbackXpValue = rewardVisible && selectedAnswer ? feedback?.xp ?? currentScene?.xpReward ?? 0 : 0
  const runtimeFocusMode =
    phase === 'scene'
      ? currentSceneStep === 'feedback'
        ? rewardVisible
          ? 'reward'
          : 'feedback'
        : currentSceneStep
      : phase
  const isCheckpointCleared = Boolean(selectedAnswer?.isCorrect)
  const activeAudioModeClass = activeAudioCue ? ` mission-runtime-audio-${activeAudioCue}` : ''

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
  const currentBackgroundLayerStyle = currentScene
    ? ({
        ...buildRuntimeBackgroundLayerStyle(currentScene),
      } as CSSProperties)
    : undefined
  const previousBackgroundStyle = previousScene
    ? ({
        ...buildRuntimeBackgroundImageStyle(previousScene),
      } as CSSProperties)
    : undefined
  const previousBackgroundLayerStyle = previousScene
    ? ({
        ...buildRuntimeBackgroundLayerStyle(previousScene),
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
            ? false
            : currentSceneStep === 'speaking'
              ? false
              : currentFeedbackRevealStage === 'ready' && !isCheckpointTransitioning
          : answerOptions.length === 0 || Boolean(selectedAnswer)
  const rewardDots = Array.from({ length: totalSceneCount })
  const rewardLabel =
    phase === 'intro'
      ? 'Mission ready'
      : phase === 'complete'
        ? isImmigrationPlayableSlice
          ? sparkMemory.completionRewardLabel
          : 'Mission complete'
        : isImmigrationPlayableSlice && currentSceneStep === 'listening'
          ? isListeningTransitioning
            ? 'Take it in'
            : 'Listen first'
          : currentSceneTimedOut
            ? 'Tempo esgotado'
          : !selectedAnswer
          ? 'Checkpoint'
          : currentFeedbackRevealStage === 'idle'
            ? 'Let it land'
            : !rewardVisible
              ? isCheckpointCleared
                ? 'Confidence is landing'
                : 'Recovery is landing'
              : isImmigrationPlayableSlice
                ? sparkMemory.rewardLabel
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
  const introWorldTitle = mission.asset.missionContextTitle || currentContract?.world.title || 'Airport Survival'
  const introDescription =
    mission.asset.missionContextBody ||
    (currentScene
      ? `${currentScene.subtitle || 'You landed inside a noisy terminal.'} At immigration, the officer wants one clear answer about the purpose of your trip before the line moves on.`
      : 'You landed inside a noisy terminal. Answer clearly, recover when pressure rises and let Spark guide you through the first checkpoint without breaking the scene.')
  const introObjectiveTitle = mission.asset.missionObjectiveTitle || 'Spark steps in when pressure rises.'
  const introObjectiveBody =
    mission.asset.missionObjectiveBody ||
    'Just enough to steady your confidence and keep the moment feeling human.'
  const introTitleWords = mission.title.trim().split(/\s+/)
  const introTitleAccent = introTitleWords.pop() || mission.title
  const introTitleLead = introTitleWords.join(' ')
  const introSentences = introDescription.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()) ?? [introDescription]
  const introClosingSentence = introSentences.length > 2 ? introSentences[introSentences.length - 1] || '' : ''
  const introNarrativeSentences = introClosingSentence ? introSentences.slice(0, -1) : introSentences
  const introNarrativeSplit = Math.max(1, Math.ceil(introNarrativeSentences.length / 2))
  const introNarrativeParagraphs = [
    introNarrativeSentences.slice(0, introNarrativeSplit).join(' '),
    introNarrativeSentences.slice(introNarrativeSplit).join(' '),
  ].filter(Boolean)
  const introNarration = `${introWorldTitle}. ${mission.title}. ${introDescription}`
  const currentPromptVoiceRole: RuntimeSpeechVoiceRole =
    currentSceneStep === 'listening' ? 'npc' : 'narration'
  const nextTeaserScene =
    currentScene?.nextSceneId
      ? sceneFlow.find((item) => item.scene.id === currentScene.nextSceneId)?.scene ??
        sceneFlow[sceneIndex + 1]?.scene ??
        null
      : sceneFlow[sceneIndex + 1]?.scene ?? null
  const resolveNextSceneIndex = () => {
    if (!currentScene) return -1
    const linkedIndex = currentScene.nextSceneId
      ? sceneFlow.findIndex((item) => item.scene.id === currentScene.nextSceneId)
      : -1
    return linkedIndex >= 0 ? linkedIndex : sceneIndex + 1
  }
  const questionTimeLimit = Math.min(90, Math.max(8, Math.round(questionTimeLimitSeconds ?? 22)))
  const questionTimerProgress = questionTimeLimit > 0
    ? Math.max(0, Math.min(100, (questionTimeLeft / questionTimeLimit) * 100))
    : 0
  const shouldShowQuestionTimer =
    phase === 'scene' &&
    currentSceneStep === 'speaking' &&
    answerOptions.length > 0 &&
    !selectedAnswer &&
    !isCheckpointTransitioning

  useEffect(() => {
    if (!currentScene || !shouldShowQuestionTimer) {
      questionTimeoutRef.current = null
      setQuestionTimeLeft(0)
      return undefined
    }

    const sceneId = currentScene.id
    questionTimeoutRef.current = sceneId
    setQuestionTimeLeft(questionTimeLimit)

    let advanceTimer: number | null = null
    const timer = window.setInterval(() => {
      setQuestionTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          if (questionTimeoutRef.current !== sceneId) return 0

          questionTimeoutRef.current = null
          setTimedOutScenes((items) => ({ ...items, [sceneId]: true }))
          setIsCheckpointTransitioning(true)
          advanceTimer = window.setTimeout(() => {
            setIsCheckpointTransitioning(false)
            const nextIndex = resolveNextSceneIndex()
            if (nextIndex >= sceneFlow.length) {
              setPhase('complete')
              return
            }
            setSceneIndex(nextIndex)
          }, 720)

          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
      if (advanceTimer !== null) window.clearTimeout(advanceTimer)
    }
  }, [
    currentScene?.id,
    currentScene,
    questionTimeLimit,
    sceneFlow.length,
    shouldShowQuestionTimer,
  ])
  const completionTitle = isImmigrationPlayableSlice
    ? isCheckpointCleared
      ? 'Immigration is behind you.'
      : 'You still made it through.'
    : `${mission.title} complete.`
  const completionBody = isImmigrationPlayableSlice
    ? isCheckpointCleared
      ? 'The officer got what they needed, the line kept moving and the checkpoint opened without turning into a lesson.'
      : 'It was not perfectly clean, but you stayed present under pressure and kept the checkpoint from closing on you.'
    : 'You survived the airport with more confidence, clearer English and visible progress.'
  const completionSparkTitle = isImmigrationPlayableSlice
    ? sparkMemory.completionTitle
    : 'Spark noticed the shift.'
  const completionSparkBody = isImmigrationPlayableSlice
    ? sparkMemory.completionBody
    : 'You stayed with the scene long enough to turn pressure into visible progress.'
  const completionPrimaryLabel = isImmigrationPlayableSlice ? 'Continue airport journey' : 'Continue journey'
  const completionSecondaryLabel = isImmigrationPlayableSlice ? 'Replay immigration' : 'Replay mission'
  const completionStats = isImmigrationPlayableSlice
    ? [
        { label: 'XP carried', value: `+${earnedXp}` },
        { label: 'Checkpoint', value: sparkMemory.completionOutcome },
        { label: 'Spark read', value: sparkMemory.completionConfidence },
      ]
    : [
        { label: 'XP earned', value: `+${earnedXp}` },
        { label: 'Scenes cleared', value: `${completedSceneCount}` },
        { label: 'Confidence loop', value: `${Math.max(comboCount, 1)}x` },
      ]
  const scenePrimaryLabel = isImmigrationPlayableSlice
    ? currentSceneStep === 'listening'
      ? 'Listening...'
      : currentSceneStep === 'feedback'
        ? rewardVisible
          ? isCheckpointTransitioning
            ? 'Crossing checkpoint...'
            : isCheckpointCleared
              ? nextTeaserScene
                ? 'Next scene'
                : 'Finish checkpoint'
              : nextTeaserScene
                ? 'Recover and continue'
                : 'Finish checkpoint'
          : 'Let it land'
        : 'Choose an answer'
    : sceneIndex >= totalSceneCount - 1
      ? 'Complete mission'
      : 'Próxima'
  const listeningPanelTitle = isListeningTransitioning ? 'Officer speaking' : 'Immigration audio'
  const listeningPanelBody = isListeningTransitioning
    ? 'Stay with the line. You only need the purpose of the trip.'
    : 'Hear the officer once, then answer like the line is moving behind you.'
  const storyVoiceLabel =
    currentSceneStep === 'listening'
      ? 'Hear the officer'
      : currentSceneStep === 'speaking'
        ? 'Hear the question again'
        : 'Replay the line'
  const responseCardTitle =
    selectedAnswer?.text ||
    (currentSceneStep === 'listening'
      ? 'You are still taking in the question.'
      : 'Choose the line you would say without stopping the queue.')
  const responseCardBody =
    (selectedAnswer && isImmigrationPlayableSlice
      ? sparkMemory.responseBody
      : showTranslations
        ? selectedAnswer?.translation
        : '') ||
    (currentSceneStep === 'listening'
      ? 'Let the officer finish. A calm answer comes next.'
      : 'Pick the reply that sounds steady, simple and believable at the desk.')
  const responseWaveLabel = selectedAnswer
    ? activeAudioCue === 'answer'
      ? 'Your answer is landing'
      : isImmigrationPlayableSlice
        ? sparkMemory.waveLabel
        : 'Your answer will sound like this'
    : currentSceneStep === 'speaking'
      ? 'Your spoken reply will settle here'
      : 'Your reply opens after the officer finishes'

  useEffect(() => {
    const speechTexts = new Set<string>()

    if (currentScene) {
      if (currentScene.question) speechTexts.add(currentScene.question)
      if (prompt?.question) speechTexts.add(prompt.question)
      if (speakingPromptPreview?.question) speechTexts.add(speakingPromptPreview.question)
      answerOptions.forEach((answer) => {
        if (answer.text) speechTexts.add(answer.text)
      })
    }

    speechTexts.forEach((text) => {
      let voiceRole: RuntimeSpeechVoiceRole = 'learner-guide'
      if (text === (currentScene?.question || '')) {
        voiceRole = 'npc'
      } else if (text === (prompt?.question || '')) {
        voiceRole = currentPromptVoiceRole
      } else if (text === (speakingPromptPreview?.question || '')) {
        voiceRole = 'narration'
      }

      void prefetchRuntimeSpeechAudio(text, { voiceRole })
    })
  }, [
    answerOptions,
    currentPromptVoiceRole,
    currentScene,
    currentScene?.id,
    currentScene?.question,
    phase,
    prompt?.question,
    speakingPromptPreview?.question,
  ])

  useEffect(() => {
    if (phase === 'complete' || phase === 'intro' || !soundEnabled) return

    let narrationKey = ''
    let narrationText = ''
    let narrationAudioUrl = ''
    let narrationDelay = 360

    if (currentScene) {
      if (currentSceneStep === 'listening') {
        narrationKey = `${currentScene.id}:listening`
        narrationText = prompt?.question || currentScene.question
        narrationAudioUrl = prompt?.audioUrl || currentScene.audioUrl || ''
        narrationDelay = 420
      } else if (currentSceneStep === 'speaking') {
        narrationKey = `${currentScene.id}:speaking`
        narrationText = prompt?.question || currentScene.question
        narrationAudioUrl = prompt?.audioUrl || ''
        narrationDelay = 520
      }
    }

    if (!narrationKey || (!narrationText.trim() && !narrationAudioUrl)) return
    if (autoNarrationKeyRef.current === narrationKey) return

    autoNarrationKeyRef.current = narrationKey
    const timer = window.setTimeout(() => {
      triggerSpeech(
        narrationText,
        narrationAudioUrl,
        'prompt',
        currentSceneStep === 'listening' ? 'npc' : 'narration',
      )
    }, narrationDelay)

    return () => window.clearTimeout(timer)
  }, [
    currentScene?.audioUrl,
    currentScene,
    currentScene?.id,
    currentSceneStep,
    phase,
    prompt?.audioUrl,
    prompt?.question,
    soundEnabled,
    triggerSpeech,
  ])

  const handleSelectAnswer = (answer: RuntimeAnswerViewModel) => {
    if (!currentScene || phase !== 'scene') return

    const wasSelected = selectedAnswers[currentScene.id]
    if (isImmigrationPlayableSlice && currentSceneStep === 'feedback') return

    if (wasSelected) {
      if (wasSelected !== answer.id) return
      triggerSpeech(answer.text, answer.audioUrl, 'answer', 'learner-guide')
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
      return current + answer.xpReward
    })

    setComboCount((current) => (answer.isCorrect ? current + 1 : Math.max(0, current - 1)))
    if (isImmigrationPlayableSlice) {
      setSceneSteps((current) => ({
        ...current,
        [currentScene.id]: 'feedback',
      }))
    }
    triggerSpeech(answer.text, answer.audioUrl, 'answer', 'learner-guide')

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
          [currentScene.id]: 'speaking',
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
      if (currentSceneStep === 'speaking') {
        if (!selectedAnswer) return
        return
      }

      if (currentFeedbackRevealStage !== 'ready') return
      if (isCheckpointTransitioning) return
      setIsCheckpointTransitioning(true)
      clearPacingTimers()
      schedulePacingTimer(() => {
        setIsCheckpointTransitioning(false)
        const nextIndex = resolveNextSceneIndex()
        if (nextIndex >= sceneFlow.length) {
          setPhase('complete')
          return
        }
        setSceneIndex(nextIndex)
      }, 480)
      return
    }

    const nextIndex = resolveNextSceneIndex()

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
          [currentScene.id]: 'speaking',
        }))
      }
      setPhase('scene')
      return
    }

    if (isImmigrationPlayableSlice) {
      const nextIndex = resolveNextSceneIndex()
      if (nextIndex >= sceneFlow.length) {
        setPhase('complete')
        return
      }
      setSceneIndex(nextIndex)
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
    setIsCheckpointTransitioning(false)
    clearPacingTimers()
    activeSceneRef.current = null
    autoNarrationKeyRef.current = ''
  }

  const handleToggleTranslations = useCallback(() => {
    setShowTranslations((current) => {
      const nextValue = !current
      writeStoredSubtitlePreference(nextValue)
      return nextValue
    })
  }, [])

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
    <div
      className={`mission-runtime-shell mission-runtime-tone-${currentScene.emotionalFeedbackTone} mission-runtime-phase-${phase} mission-runtime-focus-${runtimeFocusMode}${phase === 'scene' ? ' mission-runtime-play-focus' : ''}${isCheckpointTransitioning ? ' mission-runtime-is-closing' : ''}${activeAudioModeClass}`}
    >
      <div className="mission-runtime-stage">
        <div className="mission-runtime-background" aria-hidden="true">
          <div className="mission-runtime-background-layer mission-runtime-background-layer-ambient" style={currentBackgroundLayerStyle}>
            {currentBackgroundSource ? (
              <img
                className="mission-runtime-background-image"
                src={currentBackgroundSource}
                alt=""
                aria-hidden="true"
                key={`ambient-${currentBackgroundSource}`}
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
                  key={`previous-${previousBackgroundSource}`}
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
                key={`current-${currentBackgroundSource}`}
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
          <button
            type="button"
            className={`mission-runtime-topbar-pill mission-runtime-translation-toggle${
              showTranslations ? ' is-active' : ''
            }`}
            onClick={handleToggleTranslations}
            aria-pressed={showTranslations}
            aria-label={showTranslations ? 'Hide Portuguese translation support' : 'Show Portuguese translation support'}
          >
            <Languages size={15} />
            <div>
              <strong>Legenda</strong>
              <span>{showTranslations ? 'Português visível' : 'Português oculto'}</span>
            </div>
          </button>
          <button
            type="button"
            className={`mission-runtime-topbar-pill mission-runtime-sound-toggle${soundEnabled ? ' is-active' : ''}`}
            onClick={() => {
              setSoundEnabled((current) => {
                const nextValue = !current
                writeStoredSoundPreference(nextValue)
                if (!nextValue) {
                  stopRuntimeSpeech()
                  clearAudioCueTimer()
                  setActiveAudioCue(null)
                }
                return nextValue
              })
            }}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Disable runtime sound' : 'Enable runtime sound'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <div>
              <strong>Som</strong>
              <span>{soundEnabled ? 'ativo' : 'manual'}</span>
            </div>
          </button>
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
              <section className="mission-runtime-phase-panel mission-runtime-phase-panel-context">
                <div className="mission-runtime-phase-head">
                  <p className="mission-runtime-phase-kicker">{introWorldTitle}</p>
                  <button
                    type="button"
                    className={`mission-runtime-phase-audio${activeAudioCue === 'prompt' ? ' is-audio-active' : ''}`}
                    onClick={() => toggleSpeech(introNarration, '', 'prompt', 'narration')}
                    aria-label="Play intro audio"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
                <h1>
                  {introTitleLead ? <span>{introTitleLead}</span> : null}
                  <em>{introTitleAccent}</em>
                </h1>
                <div className="mission-runtime-intro-narrative">
                  {introNarrativeParagraphs.map((paragraph, index) => (
                    <p key={`${mission.id}-intro-paragraph-${index}`}>{paragraph}</p>
                  ))}
                  {introClosingSentence ? <strong>{introClosingSentence}</strong> : null}
                </div>
                <div className="mission-runtime-phase-note">
                  <span className="mission-runtime-phase-note-icon"><Sparkles size={20} /></span>
                  <div>
                    <strong>{introObjectiveTitle}</strong>
                    <p>{introObjectiveBody}</p>
                  </div>
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
                    <strong>{totalSceneCount} scenes</strong>
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
                <div className="mission-runtime-phase-note mission-runtime-phase-note-complete">
                  <strong>{completionSparkTitle}</strong>
                  <p>{completionSparkBody}</p>
                </div>
                <div className="mission-runtime-phase-stats">
                  {completionStats.map((item) => (
                    <div key={item.label}>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                {isImmigrationPlayableSlice && nextTeaserScene ? (
                  <div className="mission-runtime-next-teaser">
                    <small>Next airport pressure</small>
                    <strong>{nextTeaserScene.title}</strong>
                    <p>{sparkMemory.teaserBody || nextTeaserScene.subtitle || 'A new problem is waiting just beyond the checkpoint.'}</p>
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
                {completionSecondaryLabel}
              </button>
              <div className="mission-runtime-reward-rail">
                <div className="mission-runtime-reward-core">
                  <span className="mission-runtime-reward-badge">
                    <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="Reward badge icon">
                      <Star size={16} />
                    </RuntimeIcon>
                  </span>
                  <div>
                    <small>{rewardLabel}</small>
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
                {completionPrimaryLabel}
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
                      className={activeAudioCue === 'prompt' ? 'is-audio-active' : ''}
                      onClick={() =>
                        toggleSpeech(
                          prompt?.question || currentScene.question,
                          prompt?.audioUrl || currentScene.audioUrl,
                          'prompt',
                          currentPromptVoiceRole,
                        )
                      }
                      onMouseEnter={() =>
                        previewSpeechOnHover(
                          `prompt:${currentScene.id}:${currentSceneStep}`,
                          prompt?.question || currentScene.question,
                          prompt?.audioUrl || currentScene.audioUrl,
                          'prompt',
                          currentPromptVoiceRole,
                        )
                      }
                      onFocus={() =>
                        previewSpeechOnHover(
                          `prompt:${currentScene.id}:${currentSceneStep}`,
                          prompt?.question || currentScene.question,
                          prompt?.audioUrl || currentScene.audioUrl,
                          'prompt',
                          currentPromptVoiceRole,
                        )
                      }
                      aria-label="Play prompt audio"
                    >
                      <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Prompt audio icon">
                        <Volume2 size={18} />
                      </RuntimeIcon>
                    </button>
                  </div>
                  <h1>{prompt?.question || currentScene.question}</h1>
                  {showTranslations && (prompt?.translation || currentScene.questionTranslation) ? (
                    <p>{prompt?.translation || currentScene.questionTranslation}</p>
                  ) : null}
                </article>

                {shouldShowQuestionTimer ? (
                  <div
                    className={`mission-runtime-question-timer${questionTimeLeft <= 5 ? ' is-low' : ''}`}
                    style={{ '--runtime-question-timer': `${questionTimerProgress}%` } as CSSProperties}
                  >
                    <span>
                      <Hourglass size={16} />
                      tempo para responder
                    </span>
                    <strong>{questionTimeLeft}s</strong>
                    <i aria-hidden="true" />
                  </div>
                ) : null}

                <div
                  className={`mission-runtime-answers mission-runtime-answers-step-${currentSceneStep}${
                    selectedAnswer ? ' has-selection' : ''
                  }`}
                >
                  {isImmigrationPlayableSlice && currentSceneStep === 'listening' ? (
                    <button
                      className={`mission-runtime-listening-panel${isListeningTransitioning ? ' is-processing' : ''}${
                        activeAudioCue === 'listening' ? ' is-audio-active' : ''
                      }`}
                      type="button"
                      disabled
                    >
                      <span className="mission-runtime-listening-audio">
                        <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Listening audio icon">
                          <Volume2 size={18} />
                        </RuntimeIcon>
                      </span>
                      <span className="mission-runtime-listening-copy">
                        <strong>{listeningPanelTitle}</strong>
                        <small>{listeningPanelBody}</small>
                      </span>
                      <span className="mission-runtime-answer-check">
                        <Volume2 size={18} />
                      </span>
                    </button>
                  ) : (
                    answerOptions.map((answer) => (
                      <button
                        key={answer.id}
                        className={`mission-runtime-answer${selectedAnswer?.id === answer.id ? ' is-selected' : ''}${selectedAnswer ? ' is-locked' : ''}`}
                        type="button"
                        onClick={() => handleSelectAnswer(answer)}
                      >
                        <span
                          className="mission-runtime-answer-audio"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            toggleSpeech(answer.text, answer.audioUrl, 'answer', 'learner-guide')
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            event.stopPropagation()
                            toggleSpeech(answer.text, answer.audioUrl, 'answer', 'learner-guide')
                          }}
                          onMouseEnter={() => previewSpeechOnHover(`answer:${currentScene.id}:${answer.id}`, answer.text, answer.audioUrl, 'answer', 'learner-guide')}
                          onFocus={() => previewSpeechOnHover(`answer:${currentScene.id}:${answer.id}`, answer.text, answer.audioUrl, 'answer', 'learner-guide')}
                          role="button"
                          tabIndex={0}
                          aria-label={`Hear answer: ${answer.text}`}
                        >
                          <RuntimeIcon iconUrl={currentScene.answerAudioIconUrl} alt="Answer audio icon">
                            {prompt?.type === 'listening' ? <Volume2 size={18} /> : <AudioLines size={18} />}
                          </RuntimeIcon>
                        </span>
                        <span className="mission-runtime-answer-copy">
                          <strong>{answer.text}</strong>
                          {showTranslations && answer.translation ? <small>{answer.translation}</small> : null}
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

              <div className={`mission-runtime-reward-rail${rewardVisible ? ' is-reward-ready' : ''}${selectedAnswer ? ' is-xp-live' : ''}`}>
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
                {scenePrimaryLabel}
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      {phase === 'scene' ? (
        <>
          {shouldShowStoryReflection ? (
            <section className="mission-runtime-story-grid is-revealed">
              <div className="mission-runtime-section-head">
                <span>EXPERIÊNCIA DA MISSÃO</span>
              </div>
              <div className="mission-runtime-story-cards">
                <article
                  className={`mission-runtime-story-card${
                    runtimeFocusMode === 'listening' ? ' is-focused' : ' is-muted'
                  }`}
                >
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
                          className={activeAudioCue === 'prompt' ? 'is-audio-active' : ''}
                          onClick={() =>
                            toggleSpeech(
                              prompt?.question || currentScene.question,
                              prompt?.audioUrl || currentScene.audioUrl,
                              'prompt',
                              currentPromptVoiceRole,
                            )
                          }
                          onMouseEnter={() =>
                            previewSpeechOnHover(
                              `story-prompt:${currentScene.id}:${currentSceneStep}`,
                              prompt?.question || currentScene.question,
                              prompt?.audioUrl || currentScene.audioUrl,
                              'prompt',
                              currentPromptVoiceRole,
                            )
                          }
                          onFocus={() =>
                            previewSpeechOnHover(
                              `story-prompt:${currentScene.id}:${currentSceneStep}`,
                              prompt?.question || currentScene.question,
                              prompt?.audioUrl || currentScene.audioUrl,
                              'prompt',
                              currentPromptVoiceRole,
                            )
                          }
                          aria-label="Play prompt audio"
                        >
                          <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Voice prompt icon">
                            <Volume2 size={16} />
                          </RuntimeIcon>
                        </button>
                      </div>
                      <strong>{prompt?.question || currentScene.question}</strong>
                      {showTranslations && (prompt?.translation || currentScene.questionTranslation) ? (
                        <p>{prompt?.translation || currentScene.questionTranslation}</p>
                      ) : null}
                    </div>
                    <button
                      className={`mission-runtime-story-voice mission-runtime-story-voice-wave${
                        activeAudioCue === 'prompt' ? ' is-audio-active' : ''
                      }`}
                      type="button"
                      onClick={() =>
                        toggleSpeech(
                          prompt?.question || currentScene.question,
                          prompt?.audioUrl || currentScene.audioUrl,
                          'prompt',
                          currentPromptVoiceRole,
                        )
                      }
                      onMouseEnter={() =>
                        previewSpeechOnHover(
                          `story-voice:${currentScene.id}:${currentSceneStep}`,
                          prompt?.question || currentScene.question,
                          prompt?.audioUrl || currentScene.audioUrl,
                          'prompt',
                          currentPromptVoiceRole,
                        )
                      }
                      onFocus={() =>
                        previewSpeechOnHover(
                          `story-voice:${currentScene.id}:${currentSceneStep}`,
                          prompt?.question || currentScene.question,
                          prompt?.audioUrl || currentScene.audioUrl,
                          'prompt',
                          currentPromptVoiceRole,
                        )
                      }
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
                      <span className="mission-runtime-story-voice-text">{storyVoiceLabel}</span>
                    </button>
                  </div>
                </article>

                <article
                  className={`mission-runtime-story-card mission-runtime-story-card-response${
                    runtimeFocusMode === 'speaking' ? ' is-focused' : ' is-muted'
                  }`}
                >
                  <span className="mission-runtime-story-label">Resposta do usuário</span>
                  <div className="mission-runtime-story-response-card">
                    <small>YOU</small>
                    <strong>{responseCardTitle}</strong>
                    {responseCardBody ? <p>{responseCardBody}</p> : null}
                    <button
                      type="button"
                      className={`mission-runtime-mini-audio${activeAudioCue === 'answer' ? ' is-audio-active' : ''}`}
                      onClick={() => selectedAnswer && toggleSpeech(selectedAnswer.text, selectedAnswer.audioUrl, 'answer', 'learner-guide')}
                      onMouseEnter={() =>
                        selectedAnswer &&
                        previewSpeechOnHover(
                          `selected-answer:${currentScene.id}:${selectedAnswer.id}`,
                          selectedAnswer.text,
                          selectedAnswer.audioUrl,
                          'answer',
                          'learner-guide',
                        )
                      }
                      onFocus={() =>
                        selectedAnswer &&
                        previewSpeechOnHover(
                          `selected-answer:${currentScene.id}:${selectedAnswer.id}`,
                          selectedAnswer.text,
                          selectedAnswer.audioUrl,
                          'answer',
                          'learner-guide',
                        )
                      }
                      disabled={!selectedAnswer}
                    >
                      <RuntimeIcon iconUrl={currentScene.answerAudioIconUrl} alt="Selected answer audio icon">
                        <Volume2 size={16} />
                      </RuntimeIcon>
                    </button>
                  </div>
                  <div className="mission-runtime-waveform-card">
                    <small className="mission-runtime-waveform-label">{responseWaveLabel}</small>
                    <div className={`mission-runtime-waveform${activeAudioCue === 'answer' ? ' is-audio-active' : ''}`}>
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

                <article
                  className={`mission-runtime-story-card mission-runtime-story-card-feedback${
                    runtimeFocusMode === 'feedback' || runtimeFocusMode === 'reward'
                      ? ' is-focused'
                      : ' is-muted'
                  }`}
                >
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
          ) : null}

          {shouldShowSystemReflection ? (
            <section className="mission-runtime-system-grid is-revealed">
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
          ) : null}
        </>
      ) : null}
    </div>
  )
}
