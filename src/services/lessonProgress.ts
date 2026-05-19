import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type LessonProgressMap = Record<string, number>

const lessonProgressCollection = (uid: string) => {
  const { db } = requireFirebase()
  return collection(db, 'users', uid, 'lessonProgress')
}

const lessonProgressDoc = (uid: string, lessonId: string) => {
  const { db } = requireFirebase()
  return doc(db, 'users', uid, 'lessonProgress', lessonId)
}

export const getLessonProgressMap = async (uid: string) => {
  try {
    const snapshot = await getDocs(lessonProgressCollection(uid))
    if (snapshot.empty) return {}

    return snapshot.docs.reduce<LessonProgressMap>((acc, lessonDoc) => {
      const data = lessonDoc.data() as { progress?: number }
      acc[lessonDoc.id] = data.progress ?? 0
      return acc
    }, {})
  } catch {
    return {}
  }
}

export const saveLessonProgressMap = async (uid: string, progressMap: LessonProgressMap) => {
  await Promise.all(
    Object.entries(progressMap).map(([lessonId, progress]) =>
      setDoc(lessonProgressDoc(uid, lessonId), {
        progress,
        updatedAt: serverTimestamp(),
      }, { merge: true }),
    ),
  )

  return progressMap
}
