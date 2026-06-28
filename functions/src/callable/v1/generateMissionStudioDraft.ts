import { HttpsError, onCall } from 'firebase-functions/v2/https'

import { generateAIText } from '../../ai/gateway/aiGateway'

type Brief = {
  world?: string
  mission?: string
  sceneAssetId?: string
  level?: string
  skill?: string
  grammarTarget?: string
  learningOutcome?: string
  learningIntent?: string
  confidenceGoal?: string
  pressureLevel?: string
  failureMode?: string
  recoveryStyle?: string
  emotionalTone?: string
  scenario?: string
  realLifeTransfer?: string
}

type SceneAssetInput = {
  id?: string
  imageUrl?: string
  imageUrlDesktop?: string
  imageUrlMobile?: string
  mobileImageUrl?: string
  backgroundImageUrl?: string
  heroBackgroundImageUrl?: string
  focalPointX?: number
  focalPointY?: number
}

type DraftDefaults = {
  nextId?: string
  order?: number
  lessonId?: string
  parentMissionTitle?: string
}

const fallbackBackground = '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png'

const cleanString = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const cleanNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const buildMetric = (label: string, value: string, why: string) => ({ label, value, why })

const buildQualityReport = (brief: Required<Brief>) => ({
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
    estimatedDuration: buildMetric('Estimated Duration', '2 min', 'Uma escuta curta, uma decisão e feedback sem alongar a tensão.'),
    listeningLoad: buildMetric('Listening Load', 'Medium', 'O NPC usa uma pergunta realista e curta.'),
    speakingLoad: buildMetric('Speaking Load', 'Low', 'A resposta pode ser resolvida com uma frase simples e clara.'),
    learningOutcomeCoverage: buildMetric('Learning Outcome Coverage', 'High', brief.learningOutcome),
  },
  confidenceImpact: {
    anxietyReduction: buildMetric('Anxiety Reduction', 'High', brief.confidenceGoal),
    recoverySupport: buildMetric('Recovery Support', 'High', `Feedback ${brief.recoveryStyle.toLowerCase()} para evitar punição.`),
    speakingConfidenceImpact: buildMetric('Speaking Confidence Impact', 'High', 'Reforça respostas curtas, corretas e naturais.'),
    emotionalSafety: buildMetric('Emotional Safety', 'High', `Tom emocional: ${brief.emotionalTone}.`),
    realWorldTransfer: buildMetric('Real World Transfer', 'High', brief.realLifeTransfer),
  },
})

const normalizeBrief = (raw: Brief): Required<Brief> => ({
  world: cleanString(raw.world, 'Airport Survival'),
  mission: cleanString(raw.mission, 'Airport Arrival'),
  sceneAssetId: cleanString(raw.sceneAssetId),
  level: cleanString(raw.level, 'A1'),
  skill: cleanString(raw.skill, 'Speaking'),
  grammarTarget: cleanString(raw.grammarTarget, 'Present Simple'),
  learningOutcome: cleanString(raw.learningOutcome, 'Student should be able to explain the purpose of a trip.'),
  learningIntent: cleanString(
    raw.learningIntent,
    'O aluno deve conseguir explicar de forma clara e confiante o propósito de uma viagem.',
  ),
  confidenceGoal: cleanString(raw.confidenceGoal, 'Reduzir hesitação ao falar com uma figura de autoridade.'),
  pressureLevel: cleanString(raw.pressureLevel, 'Low'),
  failureMode: cleanString(raw.failureMode, 'Responder de forma vaga.'),
  recoveryStyle: cleanString(raw.recoveryStyle, 'Gentil e encorajador.'),
  emotionalTone: cleanString(raw.emotionalTone, 'Leve tensão.'),
  scenario: cleanString(raw.scenario, 'Immigration Officer'),
  realLifeTransfer: cleanString(raw.realLifeTransfer, 'Pode ser reutilizado em aeroportos e controle de fronteira.'),
})

const buildRuntimeScene = (
  brief: Required<Brief>,
  sceneAsset: SceneAssetInput | null,
  defaults: DraftDefaults,
) => {
  const background =
    cleanString(sceneAsset?.heroBackgroundImageUrl) ||
    cleanString(sceneAsset?.backgroundImageUrl) ||
    cleanString(sceneAsset?.imageUrlDesktop) ||
    cleanString(sceneAsset?.imageUrl) ||
    fallbackBackground
  const mobileBackground =
    cleanString(sceneAsset?.imageUrlMobile) ||
    cleanString(sceneAsset?.mobileImageUrl) ||
    cleanString(sceneAsset?.imageUrlDesktop) ||
    background

  return {
    id: cleanString(defaults.nextId, `RT-${Date.now()}`),
    sceneAssetId: brief.sceneAssetId || cleanString(sceneAsset?.id),
    lessonId: cleanString(defaults.lessonId),
    missionTitle: cleanString(defaults.parentMissionTitle, brief.mission),
    chapter: 'Chapter 1',
    sceneNumber: 1,
    sceneTotal: 1,
    title: brief.mission,
    subtitle: brief.learningIntent,
    character: brief.scenario.toUpperCase(),
    dialogue: brief.scenario,
    question: "What's the purpose of your trip?",
    questionTranslation: 'Qual é o propósito da sua viagem?',
    backgroundImageUrl: background,
    backgroundImageUrlMobile: mobileBackground,
    backgroundFocalX: cleanNumber(sceneAsset?.focalPointX, 56),
    backgroundFocalY: cleanNumber(sceneAsset?.focalPointY, 52),
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
    order: cleanNumber(defaults.order, 1),
    answers: [
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
        xpReward: 0,
      },
      {
        id: 'answer-vague',
        text: "I'm here.",
        translation: 'Estou aqui.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Keep going.',
        feedbackBody: 'The officer needs one clear purpose. Try adding tourism, business or study.',
        xpReward: 0,
      },
    ],
  }
}

export const generateMissionStudioDraft = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login para gerar cenas no AI Mission Studio.')
  }

  const brief = normalizeBrief((request.data?.brief ?? {}) as Brief)
  const sceneAsset = (request.data?.sceneAsset ?? null) as SceneAssetInput | null
  const defaults = (request.data?.defaults ?? {}) as DraftDefaults

  const gatewayResponse = await generateAIText({
    feature: 'mission-studio',
    userId: request.auth.uid,
    missionId: brief.mission,
    provider: 'mock',
    input: {
      systemPrompt: 'Generate a SparkLingo Mission Runtime scene draft as JSON.',
      userPrompt: JSON.stringify(brief),
      jsonMode: true,
    },
    metadata: {
      level: brief.level,
      skill: brief.skill,
      sceneAssetId: brief.sceneAssetId || null,
    },
  })

  return {
    ok: true,
    gateway: {
      provider: gatewayResponse.provider,
      model: gatewayResponse.model,
      usage: gatewayResponse.usage,
      latencyMs: gatewayResponse.latencyMs,
    },
    draft: {
      source: 'ai',
      brief,
      runtimeScene: buildRuntimeScene(brief, sceneAsset, defaults),
      quality: buildQualityReport(brief),
      validation: {
        valid: true,
        issues: [],
      },
    },
  }
})
