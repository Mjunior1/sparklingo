import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type StudySessionPayload = {
  uid: string
  startedAt: number
  endedAt: number
  xpEarned: number
  correctCount: number
  wrongCount: number
  comboMax: number
  completedExerciseIds: string[]
}

const studySessionsCollection = () => {
  const { db } = requireFirebase()
  return collection(db, 'studySessions')
}

export const startStudySession = async (uid: string) => {
  const session = await addDoc(studySessionsCollection(), {
    uid,
    status: 'active',
    startedAt: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return session.id
}

export const completeStudySession = async (sessionId: string, payload: StudySessionPayload) => {
  const { db } = requireFirebase()
  await updateDoc(doc(db, 'studySessions', sessionId), {
    ...payload,
    status: 'completed',
    durationSeconds: Math.max(1, Math.round((payload.endedAt - payload.startedAt) / 1000)),
    updatedAt: serverTimestamp(),
    endedAtServer: serverTimestamp(),
  })
}
