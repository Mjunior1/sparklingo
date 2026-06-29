import { HttpsError, onCall } from 'firebase-functions/v2/https'

import { generateAIText } from '../../ai/gateway/aiGateway'
import { openRouterApiKey } from '../../config/secrets'

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
const missionStudioPromptVersion = 'mission-studio-openrouter-v1'

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
  generatedScene?: Record<string, unknown> | null,
  generationOverride?: Record<string, unknown>,
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
  const generatedAt = new Date().toISOString()
  const generation = {
    provider: 'mock',
    model: 'mock-mission-studio-v1',
    promptVersion: missionStudioPromptVersion,
    generatedAt,
    ...generationOverride,
  }
  const rawAnswers = Array.isArray(generatedScene?.answers) ? generatedScene.answers : []
  const generatedAnswers = rawAnswers
    .filter((answer): answer is Record<string, unknown> => Boolean(answer) && typeof answer === 'object')
    .slice(0, 4)
    .map((answer, index) => ({
      id: cleanString(answer.id, `answer-${index + 1}`),
      text: cleanString(answer.text, index === 0 ? 'I can answer clearly.' : 'I am not sure.'),
      translation: cleanString(answer.translation, 'Resposta em português.'),
      audioUrl: cleanString(answer.audioUrl),
      isCorrect: !!answer.isCorrect,
      feedbackTitle: cleanString(answer.feedbackTitle, answer.isCorrect ? 'Clear answer.' : 'Try again.'),
      feedbackBody: cleanString(answer.feedbackBody, 'Keep the answer natural and connected to the scene.'),
      xpReward: answer.isCorrect ? cleanNumber(answer.xpReward, 25) : 0,
    }))

  return {
    id: cleanString(defaults.nextId, `RT-${Date.now()}`),
    sceneAssetId: brief.sceneAssetId || cleanString(sceneAsset?.id),
    lessonId: cleanString(defaults.lessonId),
    missionTitle: cleanString(defaults.parentMissionTitle, brief.mission),
    chapter: 'Chapter 1',
    sceneNumber: 1,
    sceneTotal: 1,
    title: cleanString(generatedScene?.title, brief.mission),
    subtitle: cleanString(generatedScene?.subtitle, brief.learningIntent),
    character: cleanString(generatedScene?.character, brief.scenario).toUpperCase(),
    dialogue: cleanString(generatedScene?.dialogue, brief.scenario),
    question: cleanString(generatedScene?.question, "What's the purpose of your trip?"),
    questionTranslation: cleanString(generatedScene?.questionTranslation, 'Qual é o propósito da sua viagem?'),
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
    xpReward: cleanNumber(generatedScene?.xpReward, 25),
    emotionalFeedbackTitle: cleanString(generatedScene?.emotionalFeedbackTitle, 'That sounded natural.'),
    emotionalFeedbackBody: cleanString(generatedScene?.emotionalFeedbackBody, 'Resposta clara, simples e natural para a cena.'),
    emotionalFeedbackTone: cleanString(generatedScene?.emotionalFeedbackTone, 'celebration'),
    nextSceneId: '',
    active: true,
    publicationStatus: 'draft',
    source: 'ai',
    generation,
    provenance: [
      {
        type: 'created',
        at: generatedAt,
        by: 'ai-mission-studio',
        note: 'Scene Draft criada pelo AI Mission Studio.',
      },
    ],
    order: cleanNumber(defaults.order, 1),
    answers: generatedAnswers.length >= 2 && generatedAnswers.some((answer) => answer.isCorrect) ? generatedAnswers : [
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

const extractJson = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  }
}

const buildSystemPrompt = () => [
  'You are SparkLingo Mission Studio, an editorial AI that generates ONE playable cinematic English-learning scene.',
  'Return only valid JSON. No markdown.',
  'The JSON must contain: runtimeScene and quality.',
  'runtimeScene must contain: title, subtitle, character, dialogue, question, questionTranslation, xpReward, emotionalFeedbackTitle, emotionalFeedbackBody, emotionalFeedbackTone, answers.',
  'answers must contain 3 or 4 items with: id, text, translation, isCorrect, feedbackTitle, feedbackBody, xpReward.',
  'Only correct answers may receive XP. Incorrect answers must have xpReward 0.',
  'Do not reuse generic immigration-purpose content unless the brief specifically asks for it.',
  'Adapt vocabulary, complexity, question and answers to the requested level, skill, grammar target, learning outcome and emotional design.',
  'For B2, use more nuanced and context-rich language than A1/A2.',
  'For Writing, make the interaction feel like choosing or composing a written response, not a speaking drill.',
].join('\n')

const buildUserPrompt = (brief: Required<Brief>) => JSON.stringify({
  task: 'Generate one SparkLingo Mission Runtime Scene Draft.',
  brief,
  outputRules: {
    language: 'English for original text, Brazilian Portuguese for translations.',
    sceneCount: 1,
    keepItCinematic: true,
    noSchoolExerciseTone: true,
    noRepeatedDefaultQuestion: true,
  },
})

export const generateMissionStudioDraft = onCall({ secrets: [openRouterApiKey] }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login para gerar cenas no AI Mission Studio.')
  }

  const brief = normalizeBrief((request.data?.brief ?? {}) as Brief)
  const sceneAsset = (request.data?.sceneAsset ?? null) as SceneAssetInput | null
  const defaults = (request.data?.defaults ?? {}) as DraftDefaults
  const generatedAt = new Date().toISOString()

  const gatewayResponse = await generateAIText({
    feature: 'mission-studio',
    userId: request.auth.uid,
    missionId: brief.mission,
    provider: 'openrouter',
    model: 'gpt-4.1-mini',
    input: {
      systemPrompt: buildSystemPrompt(),
      userPrompt: buildUserPrompt(brief),
      jsonMode: true,
    },
    metadata: {
      level: brief.level,
      skill: brief.skill,
      grammarTarget: brief.grammarTarget,
      sceneAssetId: brief.sceneAssetId || null,
    },
  })

  const parsed = extractJson(gatewayResponse.text) as Record<string, unknown> | null
  const runtimePayload = parsed?.runtimeScene && typeof parsed.runtimeScene === 'object'
    ? parsed.runtimeScene as Record<string, unknown>
    : parsed
  const generation = {
    provider: gatewayResponse.provider,
    model: gatewayResponse.model,
    promptVersion: missionStudioPromptVersion,
    generatedAt,
  }
  const runtimeScene = buildRuntimeScene(brief, sceneAsset, defaults, runtimePayload, generation)
  const quality = parsed?.quality && typeof parsed.quality === 'object'
    ? parsed.quality
    : buildQualityReport(brief)

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
      generation,
      brief,
      runtimeScene,
      quality,
      validation: {
        valid: true,
        issues: [],
      },
    },
  }
})
