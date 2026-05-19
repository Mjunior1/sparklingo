import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type SkillProgressItem = {
  skillId: string
  xpEarned: number
  completedQuizzes: number
  accuracy: number
}

const skillProgressRef = (uid: string, skillId: string) => {
  const { db } = requireFirebase()
  return doc(db, 'users', uid, 'skillProgress', skillId)
}

export const saveSkillProgress = async (uid: string, item: SkillProgressItem) => {
  const snapshot = await getDoc(skillProgressRef(uid, item.skillId))
  const current = snapshot.exists() ? snapshot.data() as Partial<SkillProgressItem> : {}

  await setDoc(skillProgressRef(uid, item.skillId), {
    skillId: item.skillId,
    xpEarned: item.xpEarned,
    completedQuizzes: Math.max(item.completedQuizzes, current.completedQuizzes ?? 0),
    accuracy: item.accuracy,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}
