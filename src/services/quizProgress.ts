import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type QuizProgressItem = {
  quizId: string
  lessonId: string
  skillId: string
  completed: boolean
  attempts: number
  correct: boolean
  xpEarned: number
}

const quizProgressRef = (uid: string, quizId: string) => {
  const { db } = requireFirebase()
  return doc(db, 'users', uid, 'quizProgress', quizId)
}

export const saveQuizProgress = async (uid: string, item: QuizProgressItem) => {
  const snapshot = await getDoc(quizProgressRef(uid, item.quizId))
  const previousAttempts = snapshot.exists() ? ((snapshot.data() as { attempts?: number }).attempts ?? 0) : 0

  await setDoc(quizProgressRef(uid, item.quizId), {
    ...item,
    attempts: Math.max(item.attempts, previousAttempts),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}
