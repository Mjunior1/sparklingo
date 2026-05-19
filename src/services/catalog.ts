import { collection, getDocs } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type LessonTone = 'sky' | 'violet' | 'mint'

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
  tag: string
  title: string
  difficulty: string
  reward: number
}

export type AchievementCatalogItem = {
  id: string
  title: string
  icon: 'headphones' | 'star' | 'target'
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
  { id: 'q1', tag: 'Gramática', title: 'Forma correta', difficulty: 'Fácil', reward: 25 },
  { id: 'q2', tag: 'Vocabulário', title: 'Complete a frase', difficulty: 'Médio', reward: 35 },
  { id: 'q3', tag: 'Listening', title: 'What did you hear?', difficulty: 'Fácil', reward: 30 },
  { id: 'q4', tag: 'Reading', title: 'Futuro com if', difficulty: 'Médio', reward: 35 },
  { id: 'q5', tag: 'Speaking', title: 'Monte a frase', difficulty: 'Médio', reward: 40 },
  { id: 'q6', tag: 'Vocabulário', title: 'Happy means...', difficulty: 'Fácil', reward: 30 },
]

export const defaultAchievementCatalog: AchievementCatalogItem[] = [
  { id: 'achievement-audio', title: 'Audio streak', icon: 'headphones' },
  { id: 'achievement-star', title: 'Perfect combo', icon: 'star' },
  { id: 'achievement-target', title: 'Mission focus', icon: 'target' },
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

export const getLessonsCatalog = () => getCollectionDocs<LessonCatalogItem>('lessons', defaultLessonsCatalog)
export const getQuizCatalog = () => getCollectionDocs<QuizCatalogItem>('quizzes', defaultQuizCatalog)
export const getAchievementCatalog = () => getCollectionDocs<AchievementCatalogItem>('achievements', defaultAchievementCatalog)
