import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type MissionRuntimeFeedbackTone = 'encouraging' | 'celebration' | 'recovery' | 'calm'

export type MissionRuntimeAnswerRecord = {
  id: string
  text: string
  translation: string
  audioUrl: string
  isCorrect: boolean
  feedbackTitle: string
  feedbackBody: string
  xpReward: number
}

export type MissionRuntimeSceneRecord = {
  id: string
  sceneAssetId: string
  lessonId: string
  missionTitle: string
  chapter: string
  sceneNumber: number
  sceneTotal: number
  title: string
  subtitle: string
  character: string
  dialogue: string
  question: string
  questionTranslation: string
  backgroundImageUrl: string
  backgroundImageUrlMobile: string
  backgroundFocalX: number
  backgroundFocalY: number
  backgroundOffsetX: number
  backgroundOffsetY: number
  backgroundScale: number
  companionImageUrl: string
  companionScale: number
  companionOffsetX: number
  companionOffsetY: number
  companionGlowStrength: number
  audioUrl: string
  promptAudioIconUrl: string
  answerAudioIconUrl: string
  feedbackIconUrl: string
  rewardIconUrl: string
  rewardChestIconUrl: string
  xpReward: number
  emotionalFeedbackTitle: string
  emotionalFeedbackBody: string
  emotionalFeedbackTone: MissionRuntimeFeedbackTone
  nextSceneId: string
  active: boolean
  order: number
  answers: MissionRuntimeAnswerRecord[]
}

const missionRuntimeCollection = 'missionRuntimeScenes'

export const missionRuntimeFeedbackToneOptions: MissionRuntimeFeedbackTone[] = [
  'encouraging',
  'celebration',
  'recovery',
  'calm',
]

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const cleanBoolean = (value: unknown, fallback = true) => (typeof value === 'boolean' ? value : fallback)
const cleanNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const pickEnum = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback

const createEmptyAnswer = (id = 'answer-1'): MissionRuntimeAnswerRecord => ({
  id,
  text: '',
  translation: '',
  audioUrl: '',
  isCorrect: false,
  feedbackTitle: '',
  feedbackBody: '',
  xpReward: 25,
})

export const createEmptyMissionRuntimeScene = (): MissionRuntimeSceneRecord => ({
  id: '',
  sceneAssetId: '',
  lessonId: '',
  missionTitle: '',
  chapter: 'Chapter 1',
  sceneNumber: 1,
  sceneTotal: 5,
  title: '',
  subtitle: '',
  character: 'IMMIGRATION OFFICER',
  dialogue: '',
  question: '',
  questionTranslation: '',
  backgroundImageUrl: '',
  backgroundImageUrlMobile: '',
  backgroundFocalX: 50,
  backgroundFocalY: 50,
  backgroundOffsetX: 0,
  backgroundOffsetY: 0,
  backgroundScale: 104,
  companionImageUrl: '',
  companionScale: 100,
  companionOffsetX: 0,
  companionOffsetY: 0,
  companionGlowStrength: 56,
  audioUrl: '',
  promptAudioIconUrl: '',
  answerAudioIconUrl: '',
  feedbackIconUrl: '',
  rewardIconUrl: '',
  rewardChestIconUrl: '',
  xpReward: 25,
  emotionalFeedbackTitle: 'Boa tentativa!',
  emotionalFeedbackBody: 'Continue. Você está entrando no ritmo da missão.',
  emotionalFeedbackTone: 'encouraging',
  nextSceneId: '',
  active: true,
  order: 1,
  answers: [
    createEmptyAnswer('answer-1'),
    createEmptyAnswer('answer-2'),
    { ...createEmptyAnswer('answer-3'), isCorrect: true },
  ],
})

const sanitizeMissionRuntimeAnswer = (
  answer: Partial<MissionRuntimeAnswerRecord> & Record<string, unknown>,
  index: number,
): MissionRuntimeAnswerRecord => ({
  id: cleanString(answer.id) || `answer-${index + 1}`,
  text: cleanString(answer.text),
  translation: cleanString(answer.translation),
  audioUrl: cleanString(answer.audioUrl),
  isCorrect: cleanBoolean(answer.isCorrect, false),
  feedbackTitle: cleanString(answer.feedbackTitle),
  feedbackBody: cleanString(answer.feedbackBody),
  xpReward: clamp(cleanNumber(answer.xpReward, 25), 0, 250),
})

const sanitizeMissionRuntimeScene = (
  scene: Partial<MissionRuntimeSceneRecord> & Record<string, unknown>,
): MissionRuntimeSceneRecord => {
  const rawAnswers = Array.isArray(scene.answers) ? scene.answers : []
  const safeAnswers = rawAnswers.length
    ? rawAnswers.map((answer, index) =>
        sanitizeMissionRuntimeAnswer(answer as Partial<MissionRuntimeAnswerRecord> & Record<string, unknown>, index),
      )
    : createEmptyMissionRuntimeScene().answers

  const safeQuestion = cleanString(scene.question)
  const safeDialogue = cleanString(scene.dialogue)

  return {
    id: cleanString(scene.id),
    sceneAssetId: cleanString(scene.sceneAssetId),
    lessonId: cleanString(scene.lessonId),
    missionTitle: cleanString(scene.missionTitle),
    chapter: cleanString(scene.chapter) || 'Chapter 1',
    sceneNumber: clamp(cleanNumber(scene.sceneNumber, 1), 1, 99),
    sceneTotal: clamp(cleanNumber(scene.sceneTotal, 5), 1, 99),
    title: cleanString(scene.title),
    subtitle: cleanString(scene.subtitle),
    character: cleanString(scene.character) || 'CHARACTER',
    dialogue: safeDialogue,
    question: safeQuestion,
    questionTranslation: cleanString(scene.questionTranslation),
    backgroundImageUrl: cleanString(scene.backgroundImageUrl),
    backgroundImageUrlMobile:
      cleanString(scene.backgroundImageUrlMobile) || cleanString(scene.backgroundImageUrl),
    backgroundFocalX: clamp(cleanNumber(scene.backgroundFocalX, 50), 0, 100),
    backgroundFocalY: clamp(cleanNumber(scene.backgroundFocalY, 50), 0, 100),
    backgroundOffsetX: clamp(cleanNumber(scene.backgroundOffsetX, 0), -60, 60),
    backgroundOffsetY: clamp(cleanNumber(scene.backgroundOffsetY, 0), -60, 60),
    backgroundScale: clamp(cleanNumber(scene.backgroundScale, 104), 70, 160),
    companionImageUrl: cleanString(scene.companionImageUrl),
    companionScale: clamp(cleanNumber(scene.companionScale, 100), 50, 180),
    companionOffsetX: clamp(cleanNumber(scene.companionOffsetX, 0), -60, 60),
    companionOffsetY: clamp(cleanNumber(scene.companionOffsetY, 0), -60, 60),
    companionGlowStrength: clamp(cleanNumber(scene.companionGlowStrength, 56), 0, 100),
    audioUrl: cleanString(scene.audioUrl),
    promptAudioIconUrl: cleanString(scene.promptAudioIconUrl),
    answerAudioIconUrl: cleanString(scene.answerAudioIconUrl),
    feedbackIconUrl: cleanString(scene.feedbackIconUrl),
    rewardIconUrl: cleanString(scene.rewardIconUrl),
    rewardChestIconUrl: cleanString(scene.rewardChestIconUrl),
    xpReward: clamp(cleanNumber(scene.xpReward, 25), 0, 500),
    emotionalFeedbackTitle: cleanString(scene.emotionalFeedbackTitle) || 'Boa tentativa!',
    emotionalFeedbackBody:
      cleanString(scene.emotionalFeedbackBody) || 'Continue. Você está entrando no ritmo da missão.',
    emotionalFeedbackTone: pickEnum(
      scene.emotionalFeedbackTone,
      missionRuntimeFeedbackToneOptions,
      'encouraging',
    ),
    nextSceneId: cleanString(scene.nextSceneId),
    active: cleanBoolean(scene.active, true),
    order: Math.max(1, cleanNumber(scene.order, 1)),
    answers: safeAnswers,
  }
}

export const defaultMissionRuntimeScenes: MissionRuntimeSceneRecord[] = [
  {
    ...createEmptyMissionRuntimeScene(),
    id: 'RT-00001',
    sceneAssetId: 'SA-00001',
    missionTitle: 'Airport Arrival',
    chapter: 'Chapter 1',
    sceneNumber: 1,
    sceneTotal: 5,
    title: 'Airport Arrival',
    subtitle: 'You just landed. The airport feels bigger than expected.',
    character: 'IMMIGRATION OFFICER',
    dialogue: 'Immigration Officer',
    question: "What's the purpose of your trip?",
    questionTranslation: 'Qual é o propósito da sua viagem?',
    backgroundImageUrl: '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png',
    backgroundImageUrlMobile: '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png',
    backgroundFocalX: 72,
    backgroundFocalY: 48,
    backgroundOffsetX: 12,
    backgroundOffsetY: -2,
    backgroundScale: 122,
    companionImageUrl: '/Images/Mascote/Sparklingo.png',
    companionScale: 96,
    companionOffsetX: 9,
    companionOffsetY: 6,
    companionGlowStrength: 54,
    xpReward: 25,
    emotionalFeedbackTitle: 'Boa tentativa!',
    emotionalFeedbackBody: 'Tente usar uma frase mais completa. Você conseguiu!',
    emotionalFeedbackTone: 'recovery',
    nextSceneId: 'RT-00002',
    order: 1,
    answers: [
      {
        id: 'airport-a1',
        text: "I'm here for tourism.",
        translation: 'Estou aqui para turismo.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Quase lá.',
        feedbackBody: 'Funciona, mas soa um pouco menos natural para esta cena.',
        xpReward: 15,
      },
      {
        id: 'airport-a2',
        text: "I'm here to study English.",
        translation: 'Estou aqui para estudar inglês.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Boa tentativa!',
        feedbackBody: 'A frase está correta, mas não combina com o contexto desta missão.',
        xpReward: 18,
      },
      {
        id: 'airport-a3',
        text: "I'm here on vacation.",
        translation: 'Estou aqui de férias.',
        audioUrl: '',
        isCorrect: true,
        feedbackTitle: 'That sounded natural.',
        feedbackBody: 'Resposta clara, simples e natural para a imigração.',
        xpReward: 25,
      },
    ],
  },
  {
    ...createEmptyMissionRuntimeScene(),
    id: 'RT-00002',
    sceneAssetId: 'SA-00001',
    missionTitle: 'Airport Arrival',
    chapter: 'Chapter 1',
    sceneNumber: 2,
    sceneTotal: 5,
    title: 'Airport Arrival',
    subtitle: 'You need to explain where you are coming from.',
    character: 'IMMIGRATION OFFICER',
    dialogue: 'Immigration Officer',
    question: 'Where are you flying from?',
    questionTranslation: 'De onde você está vindo?',
    backgroundImageUrl: '/Images/Airport/departures.png',
    backgroundImageUrlMobile: '/Images/Airport/departures.png',
    backgroundFocalX: 74,
    backgroundFocalY: 46,
    backgroundOffsetX: 14,
    backgroundOffsetY: -4,
    backgroundScale: 124,
    companionImageUrl: '/Images/Mascote/Sparklingo.png',
    companionScale: 96,
    companionOffsetX: 9,
    companionOffsetY: 6,
    companionGlowStrength: 54,
    xpReward: 25,
    emotionalFeedbackTitle: 'Ótimo!',
    emotionalFeedbackBody: 'Resposta natural e confiante. Continue assim.',
    emotionalFeedbackTone: 'celebration',
    nextSceneId: 'RT-00003',
    order: 2,
    answers: [
      {
        id: 'airport-b1',
        text: "I'm flying from New York.",
        translation: 'Estou voando de Nova York.',
        audioUrl: '',
        isCorrect: true,
        feedbackTitle: 'Great confidence.',
        feedbackBody: 'Você respondeu com precisão e soou muito natural.',
        xpReward: 25,
      },
      {
        id: 'airport-b2',
        text: 'My flight is tomorrow.',
        translation: 'Meu voo é amanhã.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Boa tentativa.',
        feedbackBody: 'A frase está correta, mas não responde à pergunta.',
        xpReward: 12,
      },
      {
        id: 'airport-b3',
        text: "I'm going to the city center.",
        translation: 'Estou indo para o centro da cidade.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Continue.',
        feedbackBody: 'Esse destino pode vir depois. Primeiro responda a origem do voo.',
        xpReward: 10,
      },
    ],
  },
  {
    ...createEmptyMissionRuntimeScene(),
    id: 'RT-00003',
    sceneAssetId: 'SA-00001',
    missionTitle: 'Airport Arrival',
    chapter: 'Chapter 1',
    sceneNumber: 3,
    sceneTotal: 5,
    title: 'Airport Arrival',
    subtitle: 'You made it through. Time to breathe and move to the next checkpoint.',
    character: 'SPARK COMPANION',
    dialogue: 'Spark Companion',
    question: 'Ready for the next checkpoint?',
    questionTranslation: 'Pronto para o próximo checkpoint?',
    backgroundImageUrl: '/Images/Airport/checkin.png',
    backgroundImageUrlMobile: '/Images/Airport/checkin.png',
    backgroundFocalX: 76,
    backgroundFocalY: 48,
    backgroundOffsetX: 12,
    backgroundOffsetY: -3,
    backgroundScale: 122,
    companionImageUrl: '/Images/Mascote/Sparklingo.png',
    companionScale: 98,
    companionOffsetX: 8,
    companionOffsetY: 4,
    companionGlowStrength: 56,
    xpReward: 30,
    emotionalFeedbackTitle: 'Nice recovery.',
    emotionalFeedbackBody: 'Você está encontrando o ritmo da missão.',
    emotionalFeedbackTone: 'encouraging',
    nextSceneId: '',
    order: 3,
    answers: [
      {
        id: 'airport-c1',
        text: "Yes, let's continue.",
        translation: 'Sim, vamos continuar.',
        audioUrl: '',
        isCorrect: true,
        feedbackTitle: 'Checkpoint unlocked.',
        feedbackBody: 'Excelente. A missão continua com mais confiança.',
        xpReward: 30,
      },
      {
        id: 'airport-c2',
        text: 'I need a minute.',
        translation: 'Preciso de um minuto.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Tudo bem.',
        feedbackBody: 'Mesmo pausando, você continua dentro da jornada.',
        xpReward: 16,
      },
    ],
  },
  {
    ...createEmptyMissionRuntimeScene(),
    id: 'RT-00004',
    sceneAssetId: 'SA-00002',
    missionTitle: 'Coffee Shop Confidence',
    chapter: 'Chapter 2',
    sceneNumber: 1,
    sceneTotal: 3,
    title: 'Coffee Shop Confidence',
    subtitle: 'Warm light, quick choices and a chance to sound natural.',
    character: 'BARISTA',
    dialogue: 'Barista',
    question: 'What can I get for you today?',
    questionTranslation: 'O que posso pegar para você hoje?',
    backgroundImageUrl: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    backgroundImageUrlMobile: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    backgroundFocalX: 72,
    backgroundFocalY: 48,
    backgroundOffsetX: 10,
    backgroundOffsetY: -4,
    backgroundScale: 120,
    companionImageUrl: '/Images/Mascote/Sparklingo.png',
    companionScale: 94,
    companionOffsetX: 8,
    companionOffsetY: 6,
    companionGlowStrength: 42,
    xpReward: 20,
    emotionalFeedbackTitle: 'Boa tentativa!',
    emotionalFeedbackBody: 'Pequenas escolhas rápidas também constroem confiança.',
    emotionalFeedbackTone: 'calm',
    nextSceneId: '',
    order: 4,
    answers: [
      {
        id: 'coffee-a1',
        text: "I'd like a latte, please.",
        translation: 'Eu gostaria de um latte, por favor.',
        audioUrl: '',
        isCorrect: true,
        feedbackTitle: 'Soou natural.',
        feedbackBody: 'Pedido claro, educado e muito funcional.',
        xpReward: 20,
      },
      {
        id: 'coffee-a2',
        text: 'Coffee.',
        translation: 'Café.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Você consegue melhor.',
        feedbackBody: 'Está entendível, mas dá para soar mais completo e natural.',
        xpReward: 10,
      },
    ],
  },
  {
    ...createEmptyMissionRuntimeScene(),
    id: 'RT-00005',
    sceneAssetId: 'SA-00003',
    missionTitle: 'Park Reflection',
    chapter: 'Chapter 3',
    sceneNumber: 1,
    sceneTotal: 3,
    title: 'Park Reflection',
    subtitle: 'A calmer scene where speaking feels lighter.',
    character: 'PARK VENDOR',
    dialogue: 'Park Vendor',
    question: 'Which flavor would you like?',
    questionTranslation: 'Qual sabor você gostaria?',
    backgroundImageUrl: '/Images/Park/sparklingo_scene_park_icecream_mobile_v1.png',
    backgroundImageUrlMobile: '/Images/Park/sparklingo_scene_park_icecream_mobile_v1.png',
    backgroundFocalX: 68,
    backgroundFocalY: 48,
    backgroundOffsetX: 8,
    backgroundOffsetY: -3,
    backgroundScale: 116,
    companionImageUrl: '/Images/Mascote/Sparklingo.png',
    companionScale: 94,
    companionOffsetX: 7,
    companionOffsetY: 6,
    companionGlowStrength: 38,
    xpReward: 20,
    emotionalFeedbackTitle: 'Excelente resposta.',
    emotionalFeedbackBody: 'Leve, natural e perfeita para a cena.',
    emotionalFeedbackTone: 'celebration',
    nextSceneId: '',
    order: 5,
    answers: [
      {
        id: 'park-a1',
        text: "I'd like strawberry, please.",
        translation: 'Eu gostaria de morango, por favor.',
        audioUrl: '',
        isCorrect: true,
        feedbackTitle: 'Resposta suave.',
        feedbackBody: 'Você falou com calma e clareza.',
        xpReward: 20,
      },
      {
        id: 'park-a2',
        text: 'Ice cream.',
        translation: 'Sorvete.',
        audioUrl: '',
        isCorrect: false,
        feedbackTitle: 'Continue refinando.',
        feedbackBody: 'Funciona, mas o sabor específico deixa a fala mais natural.',
        xpReward: 10,
      },
    ],
  },
]

const fromMissionRuntimeDoc = (docData: DocumentData) =>
  sanitizeMissionRuntimeScene({
    ...createEmptyMissionRuntimeScene(),
    ...(docData as Partial<MissionRuntimeSceneRecord> & Record<string, unknown>),
    id: cleanString(docData.id),
  })

export const getMissionRuntimeScenes = async () => {
  try {
    const { db } = requireFirebase()
    const snapshot = await getDocs(collection(db, missionRuntimeCollection))
    if (snapshot.empty) return [] as MissionRuntimeSceneRecord[]

    return snapshot.docs
      .map((scene) => fromMissionRuntimeDoc({ id: scene.id, ...(scene.data() as Record<string, unknown>) }))
      .sort((a, b) => a.order - b.order || a.sceneNumber - b.sceneNumber || a.id.localeCompare(b.id))
  } catch {
    return [] as MissionRuntimeSceneRecord[]
  }
}

export const upsertMissionRuntimeScene = async (scene: MissionRuntimeSceneRecord) => {
  const safeScene = sanitizeMissionRuntimeScene(scene as MissionRuntimeSceneRecord & Record<string, unknown>)
  const { db } = requireFirebase()
  await setDoc(
    doc(db, missionRuntimeCollection, safeScene.id),
    {
      ...safeScene,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export const deleteMissionRuntimeScene = async (id: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, missionRuntimeCollection, id))
}

export const seedDefaultMissionRuntimeScenes = async () => {
  const { db } = requireFirebase()
  const batch = writeBatch(db)

  defaultMissionRuntimeScenes.forEach((scene) => {
    batch.set(doc(db, missionRuntimeCollection, scene.id), {
      ...sanitizeMissionRuntimeScene(scene),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}
