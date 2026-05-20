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

export type LessonTone = 'sky' | 'violet' | 'mint'
export type FilterKey = 'Todos' | 'Gramática' | 'Vocabulário' | 'Listening' | 'Reading' | 'Speaking'
export type Difficulty = 'Fácil' | 'Médio'
export type ExerciseKind = 'multiple-choice' | 'drag-fill' | 'ordering'

export type LessonCatalogItem = {
  id: string
  category: string
  title: string
  blurb: string
  image: string
  tone: LessonTone
  progress: number
}

export type QuizCatalogItem = {
  id: string
  lessonId: string
  tag: FilterKey
  title: string
  difficulty: Difficulty
  reward: number
  kind: ExerciseKind
  order: number
  active: boolean
}

export type QuizQuestionItem = {
  id: string
  quizId: string
  lessonId: string
  tag: FilterKey
  kind: ExerciseKind
  difficulty: Difficulty
  kicker: string
  title: string
  prompt: string
  art: string
  artAlt: string
  reward: number
  active: boolean
  options?: string[]
  correct?: string
  explanation: string
  sentenceBefore?: string
  sentenceAfter?: string
  scrambled?: string[]
  solution?: string[]
}

export type AchievementCatalogItem = {
  id: string
  title: string
  icon: 'headphones' | 'star' | 'target'
  description: string
  xpReward: number
}

export const defaultLessonsCatalog: LessonCatalogItem[] = [
  {
    id: 'lesson-airport',
    category: 'Vocabulário',
    title: 'At the Airport',
    blurb: 'Palavras visuais, objetos reais e micro-histórias para memorizar sem esforço.',
    image: '/pollinations/airport-card.png',
    tone: 'sky',
    progress: 60,
  },
  {
    id: 'lesson-present-simple',
    category: 'Gramática',
    title: 'Present Simple',
    blurb: 'Regra rápida, exemplos vivos e desafios curtos que fixam o padrão.',
    image: '/pollinations/grammar-card.png',
    tone: 'violet',
    progress: 40,
  },
  {
    id: 'lesson-daily-routines',
    category: 'Listening',
    title: 'Daily Routines',
    blurb: 'Áudios curtos e repetição inteligente para treinar ouvido e confiança.',
    image: '/pollinations/listening-card.png',
    tone: 'mint',
    progress: 20,
  },
]

export const defaultQuizCatalog: QuizCatalogItem[] = [
  { id: 'q1', lessonId: 'lesson-present-simple', tag: 'Gramática', title: 'Forma correta', difficulty: 'Fácil', reward: 25, kind: 'multiple-choice', order: 1, active: true },
  { id: 'q2', lessonId: 'lesson-airport', tag: 'Vocabulário', title: 'Complete a frase', difficulty: 'Médio', reward: 35, kind: 'drag-fill', order: 2, active: true },
  { id: 'q3', lessonId: 'lesson-daily-routines', tag: 'Listening', title: 'What did you hear?', difficulty: 'Fácil', reward: 30, kind: 'multiple-choice', order: 3, active: true },
  { id: 'q4', lessonId: 'lesson-present-simple', tag: 'Reading', title: 'Futuro com if', difficulty: 'Médio', reward: 35, kind: 'multiple-choice', order: 4, active: true },
  { id: 'q5', lessonId: 'lesson-present-simple', tag: 'Speaking', title: 'Monte a frase', difficulty: 'Médio', reward: 40, kind: 'ordering', order: 5, active: true },
  { id: 'q6', lessonId: 'lesson-airport', tag: 'Vocabulário', title: 'Happy means...', difficulty: 'Fácil', reward: 30, kind: 'multiple-choice', order: 6, active: true },
]

export const defaultQuizQuestions: QuizQuestionItem[] = [
  {
    id: 'q1',
    quizId: 'q1',
    lessonId: 'lesson-present-simple',
    tag: 'Gramática',
    kind: 'multiple-choice',
    difficulty: 'Fácil',
    kicker: '1. Múltipla escolha',
    title: 'Forma correta',
    prompt: 'What is the correct form?',
    art: '/pollinations/airport-card.png',
    artAlt: 'Ilustração colorida de cenário escolar',
    options: ['go', 'goes', 'going', 'gone'],
    correct: 'goes',
    explanation: 'Com he, she e it, usamos o verbo no present simple com "s".',
    reward: 25,
    active: true,
  },
  {
    id: 'q2',
    quizId: 'q2',
    lessonId: 'lesson-airport',
    tag: 'Vocabulário',
    kind: 'drag-fill',
    difficulty: 'Médio',
    kicker: '2. Arraste e solte',
    title: 'Complete a frase',
    prompt: 'Complete the sentence.',
    art: '/pollinations/mountain-card.png',
    artAlt: 'Ilustração vibrante de montanhas',
    options: ['swim', 'to swim', 'swimming', 'swam'],
    correct: 'swimming',
    explanation: 'Depois de "enjoy", o verbo costuma ficar no gerúndio.',
    sentenceBefore: 'I enjoy',
    sentenceAfter: 'in the mountains.',
    reward: 35,
    active: true,
  },
  {
    id: 'q3',
    quizId: 'q3',
    lessonId: 'lesson-daily-routines',
    tag: 'Listening',
    kind: 'multiple-choice',
    difficulty: 'Fácil',
    kicker: '3. Ouça e escolha',
    title: 'What did you hear?',
    prompt: 'Listen to the audio and choose the answer.',
    art: '/pollinations/dog-card.png',
    artAlt: 'Cachorro cartunesco com fones de ouvido',
    options: ['It is a cat.', 'It is a dog.', 'It is a bird.'],
    correct: 'It is a dog.',
    explanation: 'O áudio desta demo é ilustrativo, mas o estado da questão já responde como produto real.',
    reward: 30,
    active: true,
  },
  {
    id: 'q4',
    quizId: 'q4',
    lessonId: 'lesson-present-simple',
    tag: 'Reading',
    kind: 'multiple-choice',
    difficulty: 'Médio',
    kicker: '4. Complete com a palavra correta',
    title: 'Futuro com if',
    prompt: 'Fill in the blanks with the correct word.',
    art: '/pollinations/storm-card.png',
    artAlt: 'Nuvem estilizada com relâmpago',
    options: ['will stay', 'stay', 'stayed', 'stays'],
    correct: 'will stay',
    explanation: 'Em frases com if no presente, a oração principal costuma usar will.',
    reward: 35,
    active: true,
  },
  {
    id: 'q5',
    quizId: 'q5',
    lessonId: 'lesson-present-simple',
    tag: 'Speaking',
    kind: 'ordering',
    difficulty: 'Médio',
    kicker: '5. Ordene as palavras',
    title: 'Monte a frase',
    prompt: 'Put the words in the correct order.',
    art: '/pollinations/grammar-card.png',
    artAlt: 'Caderno e lápis estilizados',
    scrambled: ['you', 'Where', 'are', 'from', '?'],
    solution: ['Where', 'are', 'you', 'from', '?'],
    explanation: 'Em perguntas com o verbo to be, a ordem correta é interrogativo + verbo + sujeito.',
    reward: 40,
    active: true,
  },
  {
    id: 'q6',
    quizId: 'q6',
    lessonId: 'lesson-airport',
    tag: 'Vocabulário',
    kind: 'multiple-choice',
    difficulty: 'Fácil',
    kicker: '6. Encontre o par',
    title: 'Happy means...',
    prompt: 'Match the word to its meaning.',
    art: '/pollinations/listening-card.png',
    artAlt: 'Headphone brilhante em fundo azul',
    options: ['Grande', 'Rápido', 'Bonito', 'Feliz'],
    correct: 'Feliz',
    explanation: 'Aqui a ideia é consolidar vocabulário com feedback instantâneo.',
    reward: 30,
    active: true,
  },
]

export const defaultAchievementCatalog: AchievementCatalogItem[] = [
  { id: 'achievement-audio', title: 'Audio streak', icon: 'headphones', description: 'Complete 3 desafios de áudio.', xpReward: 20 },
  { id: 'achievement-star', title: 'Perfect combo', icon: 'star', description: 'Acerte 5 exercícios em sequência.', xpReward: 30 },
  { id: 'achievement-target', title: 'Mission focus', icon: 'target', description: 'Conclua uma sessão inteira sem sair da run.', xpReward: 25 },
]

const getCollectionDocs = async <T>(path: string, fallback: T[]) => {
  try {
    const { db } = requireFirebase()
    const snapshot = await getDocs(collection(db, path))
    if (snapshot.empty) return fallback

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Omit<T, 'id'>),
    })) as T[]
  } catch {
    return fallback
  }
}

const upsertCatalogDoc = async (collectionName: string, id: string, payload: DocumentData) => {
  const { db } = requireFirebase()
  await setDoc(doc(db, collectionName, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export const getLessonsCatalog = () => getCollectionDocs<LessonCatalogItem>('lessons', defaultLessonsCatalog)
export const getQuizCatalog = () => getCollectionDocs<QuizCatalogItem>('quizzes', defaultQuizCatalog)
export const getQuizQuestions = () => getCollectionDocs<QuizQuestionItem>('quizQuestions', defaultQuizQuestions)
export const getAchievementCatalog = () => getCollectionDocs<AchievementCatalogItem>('achievements', defaultAchievementCatalog)

export const upsertLesson = async (lesson: LessonCatalogItem) => {
  await upsertCatalogDoc('lessons', lesson.id, lesson)
}

export const upsertQuiz = async (quiz: QuizCatalogItem) => {
  await upsertCatalogDoc('quizzes', quiz.id, quiz)
}

export const upsertQuizQuestion = async (question: QuizQuestionItem) => {
  await upsertCatalogDoc('quizQuestions', question.id, question)
}

export const upsertAchievement = async (achievement: AchievementCatalogItem) => {
  await upsertCatalogDoc('achievements', achievement.id, achievement)
}

export const deleteLesson = async (lessonId: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'lessons', lessonId))
}

export const deleteQuiz = async (quizId: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'quizzes', quizId))
}

export const deleteQuizQuestion = async (questionId: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'quizQuestions', questionId))
}

export const deleteAchievement = async (achievementId: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, 'achievements', achievementId))
}

export const seedDefaultCatalog = async () => {
  const { db } = requireFirebase()
  const batch = writeBatch(db)

  defaultLessonsCatalog.forEach((lesson) => {
    batch.set(doc(db, 'lessons', lesson.id), { ...lesson, seededAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  })
  defaultQuizCatalog.forEach((quiz) => {
    batch.set(doc(db, 'quizzes', quiz.id), { ...quiz, seededAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  })
  defaultQuizQuestions.forEach((question) => {
    batch.set(doc(db, 'quizQuestions', question.id), { ...question, seededAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  })
  defaultAchievementCatalog.forEach((achievement) => {
    batch.set(doc(db, 'achievements', achievement.id), { ...achievement, seededAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  })

  await batch.commit()
}
