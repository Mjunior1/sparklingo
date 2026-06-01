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
import { NarrativeOverlay } from '../scene/SceneRenderer'
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
  streakDays: number
  totalXp: number
  avatarUrl?: string | null
  onBack: () => void
  onOpenAdmin?: () => void
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

const buildRuntimeLayerStyle = (
  scene: MissionRuntimeSceneRecord | null,
  mission: MissionRuntimeMission,
): CSSProperties | undefined => {
  if (!scene) return undefined

  const desktopSource =
    scene.backgroundImageUrl ||
    scene.backgroundImageUrlMobile ||
    mission.backgroundDesktop ||
    mission.backgroundMobile ||
    mission.asset.imageUrlDesktop ||
    mission.asset.imageUrlMobile ||
    mission.asset.imageUrl ||
    mission.asset.heroBackgroundImageUrl

  const mobileSource =
    scene.backgroundImageUrlMobile ||
    scene.backgroundImageUrl ||
    mission.backgroundMobile ||
    mission.backgroundDesktop ||
    mission.asset.imageUrlMobile ||
    mission.asset.mobileImageUrl ||
    mission.asset.imageUrlDesktop ||
    mission.asset.imageUrl ||
    mission.asset.heroBackgroundImageUrl

  return {
    '--runtime-stage-image-desktop': `url("${desktopSource}")`,
    '--runtime-stage-image-mobile': `url("${mobileSource}")`,
    '--runtime-bg-scale': `${scene.backgroundScale / 100}`,
    '--runtime-bg-offset-x': `${scene.backgroundOffsetX}%`,
    '--runtime-bg-offset-y': `${scene.backgroundOffsetY}%`,
    '--runtime-bg-focal-x': `${scene.backgroundFocalX}%`,
    '--runtime-bg-focal-y': `${scene.backgroundFocalY}%`,
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
  selectedAnswer: MissionRuntimeAnswerRecord | null,
) => ({
  title: selectedAnswer?.feedbackTitle || scene.emotionalFeedbackTitle,
  body: selectedAnswer?.feedbackBody || scene.emotionalFeedbackBody,
  xp: selectedAnswer?.xpReward ?? scene.xpReward,
})

export function MissionRuntimeScenePreviewCard({
  scene,
  missionTitle,
}: {
  scene: MissionRuntimeSceneRecord
  missionTitle?: string
}) {
  const previewStyle = {
    '--runtime-preview-image': `url(${scene.backgroundImageUrl || scene.backgroundImageUrlMobile})`,
    '--runtime-preview-focal-x': `${scene.backgroundFocalX}%`,
    '--runtime-preview-focal-y': `${scene.backgroundFocalY}%`,
    '--runtime-preview-offset-x': `${scene.backgroundOffsetX}%`,
    '--runtime-preview-offset-y': `${scene.backgroundOffsetY}%`,
    '--runtime-preview-scale': `${scene.backgroundScale / 100}`,
    '--runtime-preview-companion-scale': `${scene.companionScale / 100}`,
    '--runtime-preview-companion-offset-x': `${scene.companionOffsetX}%`,
    '--runtime-preview-companion-offset-y': `${scene.companionOffsetY}%`,
  } as CSSProperties

  return (
    <article
      className={`runtime-scene-preview runtime-scene-preview-${scene.emotionalFeedbackTone}`}
      style={previewStyle}
    >
      <div className="runtime-scene-preview-image" />
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

  const [sceneIndex, setSceneIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [earnedXp, setEarnedXp] = useState(0)
  const [comboCount, setComboCount] = useState(0)
  const [feedbackPulse, setFeedbackPulse] = useState(false)
  const [previousSceneId, setPreviousSceneId] = useState<string | null>(null)
  const activeSceneRef = useRef<string | null>(null)

  useEffect(() => {
    setSceneIndex(0)
    setSelectedAnswers({})
    setEarnedXp(0)
    setComboCount(0)
    setPreviousSceneId(null)
    activeSceneRef.current = null
  }, [mission.id])

  const currentScene = sortedScenes[sceneIndex] ?? null

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

  const previousScene = sortedScenes.find((scene) => scene.id === previousSceneId) ?? null
  const selectedAnswerId = currentScene ? selectedAnswers[currentScene.id] ?? '' : ''
  const selectedAnswer =
    currentScene?.answers.find((answer) => answer.id === selectedAnswerId) ?? null
  const feedback = currentScene ? buildFeedback(currentScene, selectedAnswer) : null
  const feedbackTitle = selectedAnswer ? feedback?.title || currentScene?.emotionalFeedbackTitle || '' : 'Aguardando resposta'
  const feedbackBody = selectedAnswer
    ? feedback?.body || currentScene?.emotionalFeedbackBody || ''
    : 'Escolha uma resposta para receber o feedback emocional desta cena.'
  const feedbackXpValue = selectedAnswer ? feedback?.xp ?? currentScene?.xpReward ?? 0 : 0
  const feedbackCompanionImage =
    currentScene && selectedAnswer
      ? selectedAnswer.isCorrect
        ? currentScene.feedbackCompanionPositiveImageUrl || currentScene.companionImageUrl
        : currentScene.feedbackCompanionRetryImageUrl || currentScene.companionImageUrl
      : ''

  const currentAsset = currentScene ? buildRuntimeAsset(mission, currentScene) : mission.asset
  const previousAsset = previousScene ? buildRuntimeAsset(mission, previousScene) : null
  const currentLayerStyle = buildRuntimeLayerStyle(currentScene, mission)
  const previousLayerStyle = buildRuntimeLayerStyle(previousScene, mission)
  const rewardBadgeIconUrl = currentScene?.rewardIconUrl
  const rewardChestIconUrl = currentScene?.rewardChestIconUrl || currentScene?.rewardIconUrl
  const progressPercent = currentScene
    ? Math.min(100, Math.max(0, (currentScene.sceneNumber / Math.max(1, currentScene.sceneTotal)) * 100))
    : 0

  const totalXpLabel = totalXp + earnedXp
  const canAdvance = currentScene ? currentScene.answers.length === 0 || Boolean(selectedAnswer) : false
  const rewardDots = currentScene ? Array.from({ length: currentScene.sceneTotal }) : []
  const companionStyle = currentScene
    ? ({
        '--runtime-companion-scale': `${currentScene.companionScale / 100}`,
        '--runtime-companion-offset-x': `${currentScene.companionOffsetX}%`,
        '--runtime-companion-offset-y': `${currentScene.companionOffsetY}%`,
        '--runtime-companion-glow-strength': `${currentScene.companionGlowStrength / 100}`,
      } as CSSProperties)
    : undefined
  const storyContextStyle = currentScene
    ? ({
        '--runtime-story-image': `url(${currentScene.backgroundImageUrl || currentScene.backgroundImageUrlMobile || mission.backgroundDesktop || mission.backgroundMobile || mission.posterImage})`,
        '--runtime-story-focal-x': `${currentScene.backgroundFocalX}%`,
        '--runtime-story-focal-y': `${currentScene.backgroundFocalY}%`,
        '--runtime-story-offset-x': `${currentScene.backgroundOffsetX}%`,
        '--runtime-story-offset-y': `${currentScene.backgroundOffsetY}%`,
        '--runtime-story-scale': `${currentScene.backgroundScale / 100}`,
      } as CSSProperties)
    : undefined

  const handleSelectAnswer = (answer: MissionRuntimeAnswerRecord) => {
    if (!currentScene) return

    const wasSelected = selectedAnswers[currentScene.id]
    if (wasSelected === answer.id) {
      playSpeech(answer.text, answer.audioUrl)
      return
    }

    setSelectedAnswers((current) => ({
      ...current,
      [currentScene.id]: answer.id,
    }))

    setEarnedXp((current) => {
      if (wasSelected) {
        const previousAnswer = currentScene.answers.find((item) => item.id === wasSelected)
        return current - (previousAnswer?.xpReward ?? 0) + answer.xpReward
      }
      return current + answer.xpReward
    })

    setComboCount((current) => (answer.isCorrect ? current + 1 : Math.max(0, current - 1)))
    setFeedbackPulse(true)
    window.setTimeout(() => setFeedbackPulse(false), 520)
    playSpeech(answer.text, answer.audioUrl)
  }

  const goToNextScene = () => {
    if (!currentScene) return
    const linkedIndex = currentScene.nextSceneId
      ? sortedScenes.findIndex((scene) => scene.id === currentScene.nextSceneId)
      : -1
    const nextIndex =
      linkedIndex >= 0 ? linkedIndex : Math.min(sortedScenes.length - 1, sceneIndex + 1)
    setSceneIndex(nextIndex)
  }

  const skipScene = () => {
    if (!sortedScenes.length) return
    setSceneIndex((current) => Math.min(sortedScenes.length - 1, current + 1))
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
        <div className="mission-runtime-background" aria-hidden="true">
          <div className="mission-runtime-background-layer mission-runtime-background-layer-ambient" style={currentLayerStyle}>
            <div className="mission-runtime-background-image" />
          </div>
          {previousAsset && (
            <div className="mission-runtime-background-layer mission-runtime-background-layer-previous" style={previousLayerStyle}>
              <div className="mission-runtime-background-image" />
            </div>
          )}
          <div className="mission-runtime-background-layer mission-runtime-background-layer-current" style={currentLayerStyle}>
            <div className="mission-runtime-background-image" />
          </div>
          <div className="mission-runtime-global-overlay" />
          <NarrativeOverlay asset={currentAsset} />
          <div className="mission-runtime-atmosphere" />
          <div className="mission-runtime-vignette" />
        </div>

        <header className="mission-runtime-topbar">
          <button className="mission-runtime-topbar-button" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            {mission.title}
          </button>
          <div className="mission-runtime-topbar-pill">
            {currentScene.chapter} • Scene {currentScene.sceneNumber} of {currentScene.sceneTotal}
          </div>
          <div className="mission-runtime-progress-head">
            <span>Scene Progress</span>
            <div className="mission-runtime-progress-line">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <strong>
              {currentScene.sceneNumber}/{currentScene.sceneTotal}
            </strong>
          </div>
          <div className="mission-runtime-topbar-pill mission-runtime-topbar-pill-xp">
            <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="XP reward icon">
              <Star size={15} />
            </RuntimeIcon>
            +{feedback?.xp ?? currentScene.xpReward} XP
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

        <div className="mission-runtime-main">
          <section className="mission-runtime-dialogue">
            <article className="mission-runtime-prompt-card">
              <div className="mission-runtime-prompt-head">
                <span>{currentScene.character}</span>
                <button type="button" onClick={() => playSpeech(currentScene.question, currentScene.audioUrl)} aria-label="Play prompt audio">
                  <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Prompt audio icon">
                    <Volume2 size={18} />
                  </RuntimeIcon>
                </button>
              </div>
              <h1>{currentScene.question}</h1>
              <p>{currentScene.questionTranslation}</p>
            </article>

            <div className="mission-runtime-dots" aria-hidden="true">
              <span className={selectedAnswer ? 'is-active' : ''} />
              <span className={selectedAnswer ? 'is-active' : ''} />
              <span className={selectedAnswer ? 'is-active' : ''} />
            </div>

            <div className="mission-runtime-answers">
              {currentScene.answers.map((answer) => (
                <button
                  key={answer.id}
                  className={`mission-runtime-answer${selectedAnswer?.id === answer.id ? ' is-selected' : ''}`}
                  type="button"
                  onClick={() => handleSelectAnswer(answer)}
                >
                  <span className="mission-runtime-answer-audio">
                    <RuntimeIcon iconUrl={currentScene.answerAudioIconUrl} alt="Answer audio icon">
                      <AudioLines size={18} />
                    </RuntimeIcon>
                  </span>
                  <span className="mission-runtime-answer-copy">
                    <strong>{answer.text}</strong>
                    <small>{answer.translation}</small>
                  </span>
                  {selectedAnswer?.id === answer.id && (
                    <span className="mission-runtime-answer-check">
                      <Check size={18} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <aside className="mission-runtime-companion-column">
            {currentScene.companionImageUrl && (
              <div className="mission-runtime-character" style={companionStyle}>
                <img src={currentScene.companionImageUrl} alt="Spark companion" />
              </div>
            )}
            <article className={`mission-runtime-feedback-card${feedbackPulse ? ' is-pulsing' : ''}`}>
              <span className="mission-runtime-feedback-star">
                <RuntimeIcon iconUrl={currentScene.feedbackIconUrl} alt="Feedback icon">
                  <Sparkles size={16} />
                </RuntimeIcon>
              </span>
              <strong>{feedbackTitle}</strong>
              <p>{feedbackBody}</p>
            </article>
          </aside>
        </div>

        <div className="mission-runtime-footer">
          <button className="mission-runtime-secondary" type="button" onClick={skipScene}>
            <Play size={16} />
            Pular cena
          </button>

          <div className="mission-runtime-reward-rail">
            <div className="mission-runtime-reward-core">
              <span className="mission-runtime-reward-badge">
                <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="Reward badge icon">
                  <Star size={16} />
                </RuntimeIcon>
              </span>
              <div>
                <small>{selectedAnswer?.isCorrect ? 'Excelente!' : 'Checkpoint'}</small>
                <strong>+{selectedAnswer ? feedbackXpValue : currentScene.xpReward} XP</strong>
              </div>
            </div>
            <div className="mission-runtime-reward-dots">
              {rewardDots.map((_, index) => (
                <span key={`${currentScene.id}-${index}`} className={index < currentScene.sceneNumber ? 'is-filled' : ''} />
              ))}
            </div>
            <div className="mission-runtime-reward-chest">
              <RuntimeIcon iconUrl={rewardChestIconUrl} alt="Reward chest icon">
                <Gift size={18} />
              </RuntimeIcon>
            </div>
          </div>

          <button className="mission-runtime-primary" type="button" disabled={!canAdvance} onClick={goToNextScene}>
            Próxima
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <section className="mission-runtime-story-grid">
        <div className="mission-runtime-section-head">
          <span>EXPERIÊNCIA DA MISSÃO</span>
        </div>
        <div className="mission-runtime-story-cards">
          <article className="mission-runtime-story-card">
            <span className="mission-runtime-story-label">Pergunta e contexto</span>
            <div className="mission-runtime-context-scene" style={storyContextStyle}>
              <div className="mission-runtime-context-image" />
              <div className="mission-runtime-context-overlay" />
              <div className="mission-runtime-context-prompt">
                <div className="mission-runtime-context-head">
                  <span>{currentScene.character}</span>
                  <button
                    type="button"
                    onClick={() => playSpeech(currentScene.question, currentScene.audioUrl)}
                    aria-label="Play prompt audio"
                  >
                    <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Voice prompt icon">
                      <Volume2 size={16} />
                    </RuntimeIcon>
                  </button>
                </div>
                <strong>{currentScene.question}</strong>
                <p>{currentScene.questionTranslation}</p>
              </div>
              <button
                className="mission-runtime-story-voice mission-runtime-story-voice-wave"
                type="button"
                onClick={() => playSpeech(currentScene.question, currentScene.audioUrl)}
              >
                <span className="mission-runtime-story-voice-orb">
                  <RuntimeIcon iconUrl={currentScene.promptAudioIconUrl} alt="Voice prompt icon">
                    <Mic size={16} />
                  </RuntimeIcon>
                </span>
                <span className="mission-runtime-story-voice-line" aria-hidden="true">
                  {waveformBars.slice(0, 18).map((height, index) => (
                    <i key={`${currentScene.id}-prompt-wave-${index}`} style={{ height: `${Math.max(20, height - 6)}%`, animationDelay: `${index * 55}ms` }} />
                  ))}
                </span>
                <span className="mission-runtime-story-voice-text">Toque para falar</span>
              </button>
            </div>
          </article>

          <article className="mission-runtime-story-card mission-runtime-story-card-response">
            <span className="mission-runtime-story-label">Resposta do usuário</span>
            <div className="mission-runtime-story-response-card">
              <small>YOU</small>
              <strong>{selectedAnswer?.text || 'Escolha uma resposta para continuar a cena.'}</strong>
              <p>{selectedAnswer?.translation || 'A resposta escolhida aparecerá aqui com áudio e confirmação.'}</p>
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
                {selectedAnswer && (
                  <span className="mission-runtime-story-feedback-xp">
                    <RuntimeIcon iconUrl={rewardBadgeIconUrl} alt="XP reward icon">
                      <Star size={16} />
                    </RuntimeIcon>
                    +{feedbackXpValue} XP
                  </span>
                )}
              </div>
              {feedbackCompanionImage && (
                <div className="mission-runtime-story-feedback-companion">
                  <img src={feedbackCompanionImage} alt="Spark companion emotional feedback" />
                </div>
              )}
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
                {currentScene.chapter} • Scene {currentScene.sceneNumber} of {currentScene.sceneTotal}
              </small>
              <div className="mission-runtime-mini-progress">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
