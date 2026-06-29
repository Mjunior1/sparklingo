import { httpsCallable } from 'firebase/functions'
import { requireFirebase } from '../lib/firebase'
import {
  createMissionRuntimeProvenanceEvent,
  type MissionRuntimeGenerationMetadata,
  type MissionRuntimeSceneRecord,
} from './missionRuntime'
import type { SceneAssetRecord } from './sceneAssets'

export type AiMissionStudioLevel = 'A1' | 'A2' | 'B1' | 'B2'
export type AiMissionStudioSkill = 'Speaking' | 'Listening' | 'Reading' | 'Writing' | 'Mixed'
export type AiMissionStudioImpactLevel = 'Low' | 'Medium' | 'High'

export type AiMissionStudioBrief = {
  world: string
  mission: string
  sceneAssetId: string
  level: AiMissionStudioLevel
  skill: AiMissionStudioSkill
  grammarTarget: string
  learningOutcome: string
  learningIntent: string
  confidenceGoal: string
  pressureLevel: AiMissionStudioImpactLevel
  failureMode: string
  recoveryStyle: string
  emotionalTone: string
  scenario: string
  realLifeTransfer: string
}

export type AiMissionStudioMetric = {
  label: string
  value: string
  why: string
}

export type AiMissionStudioQualityReport = {
  linguisticQuality: {
    grammarCoverage: AiMissionStudioMetric
    vocabularyDifficulty: AiMissionStudioMetric
    estimatedDuration: AiMissionStudioMetric
    listeningLoad: AiMissionStudioMetric
    speakingLoad: AiMissionStudioMetric
    learningOutcomeCoverage: AiMissionStudioMetric
  }
  confidenceImpact: {
    anxietyReduction: AiMissionStudioMetric
    recoverySupport: AiMissionStudioMetric
    speakingConfidenceImpact: AiMissionStudioMetric
    emotionalSafety: AiMissionStudioMetric
    realWorldTransfer: AiMissionStudioMetric
  }
}

export type AiMissionStudioDraft = {
  source: 'ai' | 'local-fallback'
  generation: MissionRuntimeGenerationMetadata
  brief: AiMissionStudioBrief
  runtimeScene: MissionRuntimeSceneRecord
  quality: AiMissionStudioQualityReport
  validation: {
    valid: boolean
    issues: string[]
  }
}

type DraftOptions = {
  sceneAsset?: SceneAssetRecord | null
  nextId: string
  order: number
  lessonId?: string
  parentMissionTitle?: string
}

const fallbackBackground = '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png'
const missionStudioPromptVersion = 'mission-studio-mock-v1'

export const defaultAiMissionStudioBrief: AiMissionStudioBrief = {
  world: 'Airport Survival',
  mission: 'Airport Arrival',
  sceneAssetId: '',
  level: 'A1',
  skill: 'Speaking',
  grammarTarget: 'Present Simple',
  learningOutcome: 'Student should be able to explain the purpose of a trip.',
  learningIntent:
    'O aluno deve conseguir explicar de forma clara e confiante o propósito de uma viagem para um agente de imigração utilizando uma frase simples em inglês.',
  confidenceGoal: 'Reduzir a hesitação ao responder uma figura de autoridade.',
  pressureLevel: 'Low',
  failureMode: 'Responder de forma vaga ou escolher uma resposta incompatível com a pergunta.',
  recoveryStyle: 'Gentil e encorajador.',
  emotionalTone: 'Leve tensão.',
  scenario: 'Immigration Officer',
  realLifeTransfer: 'Pode ser reutilizado em aeroportos, entrevistas de visto, consulados e controle de fronteira.',
}

const compact = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const buildMetric = (label: string, value: string, why: string): AiMissionStudioMetric => ({ label, value, why })

const shuffleDraftItems = <T,>(items: T[]) => {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

const createQualityReport = (brief: AiMissionStudioBrief): AiMissionStudioQualityReport => ({
  linguisticQuality: {
    grammarCoverage: buildMetric(
      'Grammar Coverage',
      '92%',
      `A cena força o uso de ${brief.grammarTarget} em uma resposta curta e funcional.`,
    ),
    vocabularyDifficulty: buildMetric(
      'Vocabulary Difficulty',
      brief.level,
      'Vocabulário limitado a frases de sobrevivência e chunks reutilizáveis.',
    ),
    estimatedDuration: buildMetric('Estimated Duration', '2 min', 'O flow possui uma escuta curta, uma decisão e feedback sem alongar a tensão.'),
    listeningLoad: buildMetric('Listening Load', 'Medium', 'O NPC usa uma pergunta realista, mas curta o suficiente para o nível.'),
    speakingLoad: buildMetric('Speaking Load', 'Low', 'A resposta esperada pode ser resolvida com uma frase simples e clara.'),
    learningOutcomeCoverage: buildMetric('Learning Outcome Coverage', 'High', brief.learningOutcome),
  },
  confidenceImpact: {
    anxietyReduction: buildMetric('Anxiety Reduction', 'High', brief.confidenceGoal),
    recoverySupport: buildMetric('Recovery Support', 'High', `Feedback ${brief.recoveryStyle.toLowerCase()} para evitar sensação de punição.`),
    speakingConfidenceImpact: buildMetric(
      'Speaking Confidence Impact',
      'High',
      'A cena reforça respostas curtas, corretas e naturais sem penalizar pequenos erros.',
    ),
    emotionalSafety: buildMetric('Emotional Safety', 'High', `Tom emocional: ${brief.emotionalTone}.`),
    realWorldTransfer: buildMetric('Real World Transfer', 'High', brief.realLifeTransfer),
  },
})

export const createLocalAiMissionDraft = (
  brief: AiMissionStudioBrief,
  options: DraftOptions,
  source: AiMissionStudioDraft['source'] = 'local-fallback',
): AiMissionStudioDraft => {
  const asset = options.sceneAsset
  const background =
    asset?.heroBackgroundImageUrl ||
    asset?.backgroundImageUrl ||
    asset?.imageUrlDesktop ||
    asset?.imageUrl ||
    fallbackBackground
  const mobileBackground =
    asset?.imageUrlMobile ||
    asset?.mobileImageUrl ||
    asset?.imageUrlDesktop ||
    background
  const character = compact(brief.scenario, 'Immigration Officer')
  const generation: MissionRuntimeGenerationMetadata = {
    provider: source === 'ai' ? 'mock' : 'local-fallback',
    model: source === 'ai' ? 'mock-mission-studio-v1' : 'local-template',
    promptVersion: missionStudioPromptVersion,
    generatedAt: new Date().toISOString(),
  }
  const runtimeScene: MissionRuntimeSceneRecord = {
    id: options.nextId,
    sceneAssetId: brief.sceneAssetId || asset?.id || '',
    lessonId: options.lessonId || '',
    missionTitle: compact(options.parentMissionTitle, compact(brief.mission, 'Airport Arrival')),
    chapter: 'Chapter 1',
    sceneNumber: 1,
    sceneTotal: 1,
    title: compact(brief.mission, 'Airport Arrival'),
    subtitle: brief.learningIntent,
    character: character.toUpperCase(),
    dialogue: character,
    question: "What's the purpose of your trip?",
    questionTranslation: 'Qual é o propósito da sua viagem?',
    backgroundImageUrl: background,
    backgroundImageUrlMobile: mobileBackground,
    backgroundFocalX: asset?.focalPointX ?? 56,
    backgroundFocalY: asset?.focalPointY ?? 52,
    backgroundOffsetX: 0,
    backgroundOffsetY: 0,
    backgroundScale: 104,
    companionImageUrl: '/Images/Mascote/Sparklingo.png',
    companionScale: 92,
    companionOffsetX: 0,
    companionOffsetY: -55,
    companionGlowStrength: 54,
    feedbackCompanionPositiveImageUrl: '/Images/Mascote/spark-happy.png',
    feedbackCompanionRetryImageUrl: '/Images/Mascote/spark-try-again.png',
    storyFeedbackCompanionPositiveImageUrl: '/Images/Mascote/spark-happy.png',
    storyFeedbackCompanionRetryImageUrl: '/Images/Mascote/spark-try-again.png',
    audioUrl: '',
    promptAudioIconUrl: '',
    answerAudioIconUrl: '',
    feedbackIconUrl: '',
    rewardIconUrl: '',
    rewardChestIconUrl: '',
    xpReward: 25,
    emotionalFeedbackTitle: 'That sounded natural.',
    emotionalFeedbackBody: 'Resposta clara, simples e natural para a imigração.',
    emotionalFeedbackTone: 'celebration',
    nextSceneId: '',
    active: true,
    publicationStatus: 'draft',
    source,
    generation,
    provenance: [
      createMissionRuntimeProvenanceEvent(
        'created',
        source === 'ai' ? 'ai-mission-studio' : 'local-fallback',
        'Scene Draft criada pelo AI Mission Studio.',
      ),
    ],
    order: options.order,
    answers: shuffleDraftItems([
      {
        id: 'answer-tourism',
        text: "I'm here for tourism.",
        translation: 'Estou aqui para turismo.',
        audioUrl: '',
        isCorrect: true,
        feedbackTitle: 'Nice choice.',
        feedbackBody: 'You answered clearly and matched the officer’s question.',
        xpReward: 25,
      },
      {
        id: 'answer-study',
        text: "I'm here to study English.",
        translation: 'Estou aqui para estudar inglês.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Almost there.',
        feedbackBody: 'This is a clear sentence, but it does not match the travel purpose in this scene.',
        xpReward: 15,
      },
      {
        id: 'answer-vague',
        text: "I'm here.",
        translation: 'Estou aqui.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Keep going.',
        feedbackBody: 'The officer needs one clear purpose. Try adding tourism, business or study.',
        xpReward: 10,
      },
    ]),
  }

  return {
    source,
    generation,
    brief,
    runtimeScene,
    quality: createQualityReport(brief),
    validation: validateAiMissionDraft(runtimeScene),
  }
}

export const validateAiMissionDraft = (scene: MissionRuntimeSceneRecord) => {
  const issues: string[] = []
  if (!scene.title.trim()) issues.push('A cena precisa de título.')
  if (!scene.question.trim()) issues.push('A pergunta principal é obrigatória.')
  if (!scene.answers.length) issues.push('A cena precisa de respostas.')
  if (!scene.answers.some((answer) => answer.isCorrect)) issues.push('Pelo menos uma resposta precisa estar correta.')
  if (!scene.backgroundImageUrl.trim()) issues.push('A cena precisa de background desktop.')
  if (scene.answers.some((answer) => !answer.text.trim())) issues.push('Todas as respostas precisam de texto.')
  return { valid: issues.length === 0, issues }
}

const normalizeDraft = (
  payload: Partial<AiMissionStudioDraft> | null | undefined,
  brief: AiMissionStudioBrief,
  options: DraftOptions,
): AiMissionStudioDraft => {
  const fallback = createLocalAiMissionDraft(brief, options)
  const runtimeScene = payload?.runtimeScene
    ? {
        ...fallback.runtimeScene,
        ...payload.runtimeScene,
        id: options.nextId,
        sceneAssetId: brief.sceneAssetId || payload.runtimeScene.sceneAssetId || fallback.runtimeScene.sceneAssetId,
        lessonId: options.lessonId || payload.runtimeScene.lessonId || fallback.runtimeScene.lessonId,
        missionTitle: compact(options.parentMissionTitle, payload.runtimeScene.missionTitle || fallback.runtimeScene.missionTitle),
        active: true,
        order: options.order,
        answers: Array.isArray(payload.runtimeScene.answers) && payload.runtimeScene.answers.length
          ? payload.runtimeScene.answers.map((answer, index) => ({
              ...fallback.runtimeScene.answers[Math.min(index, fallback.runtimeScene.answers.length - 1)],
              ...answer,
              id: answer.id || `answer-${index + 1}`,
            }))
          : fallback.runtimeScene.answers,
      }
    : fallback.runtimeScene

  const runtimeSceneWithShuffledAnswers = {
    ...runtimeScene,
    answers: shuffleDraftItems(runtimeScene.answers),
  }
  const validation = validateAiMissionDraft(runtimeSceneWithShuffledAnswers)
  return {
    source: payload?.source === 'ai' ? 'ai' : fallback.source,
    generation: runtimeSceneWithShuffledAnswers.generation ?? fallback.generation,
    brief,
    runtimeScene: runtimeSceneWithShuffledAnswers,
    quality: payload?.quality ?? fallback.quality,
    validation,
  }
}

export const generateAiMissionStudioDraft = async (
  brief: AiMissionStudioBrief,
  options: DraftOptions,
): Promise<AiMissionStudioDraft> => {
  try {
    const { functions } = requireFirebase()
    const generateDraft = httpsCallable<
      {
        brief: AiMissionStudioBrief
        sceneAsset: SceneAssetRecord | null
        defaults: {
          nextId: string
          order: number
          lessonId: string
          parentMissionTitle: string
        }
      },
      {
        ok: boolean
        draft?: Partial<AiMissionStudioDraft>
        error?: string
      }
    >(functions, 'generateMissionStudioDraft')

    const result = await generateDraft({
      brief,
      sceneAsset: options.sceneAsset ?? null,
      defaults: {
        nextId: options.nextId,
        order: options.order,
        lessonId: options.lessonId || '',
        parentMissionTitle: options.parentMissionTitle || '',
      },
    })

    const json = result.data
    if (!json?.ok) throw new Error(json?.error || 'A geração da cena falhou.')
    return normalizeDraft(json.draft, brief, options)
  } catch (error) {
    console.warn('[ai-mission-studio] usando fallback local', error)
    return createLocalAiMissionDraft(brief, options)
  }
}
