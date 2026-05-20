import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type UserProgress = {
  uid: string
  totalXp: number
  streakDays: number
  level: number
  completedExerciseIds: string[]
  choiceAnswers: Record<string, string | null>
  dragFillAnswers: Record<string, string | null>
  orderWordMap: Record<string, string[]>
  dragFillAnswer?: string | null
  orderWords?: string[]
  activityDays: string[]
  updatedAt?: unknown
  lastCompletedAt?: unknown
}

export type UserProgressPayload = Pick<
  UserProgress,
  'totalXp' | 'completedExerciseIds' | 'choiceAnswers' | 'dragFillAnswers' | 'orderWordMap'
>

const defaultOrderWords = ['you', 'Where', 'are', 'from', '?']

export const defaultUserProgress = (uid: string): UserProgress => ({
  uid,
  totalXp: 0,
  streakDays: 0,
  level: 1,
  completedExerciseIds: [],
  choiceAnswers: {},
  dragFillAnswers: {},
  orderWordMap: {},
  dragFillAnswer: null,
  orderWords: defaultOrderWords,
  activityDays: [],
})

const progressRef = (uid: string) => {
  const { db } = requireFirebase()
  return doc(db, 'userProgress', uid)
}

const dateKey = () => new Date().toISOString().slice(0, 10)

const computeStreakDays = (activityDays: string[]) => {
  if (activityDays.length === 0) return 0

  const sortedUnique = [...new Set(activityDays)].sort().reverse()
  const cursor = new Date(`${dateKey()}T00:00:00`)
  let streak = 0

  for (const day of sortedUnique) {
    const candidate = new Date(`${day}T00:00:00`)
    if (candidate.getTime() === cursor.getTime()) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    break
  }

  return streak
}

export const getUserProgress = async (uid: string) => {
  const snapshot = await getDoc(progressRef(uid))
  if (!snapshot.exists()) return defaultUserProgress(uid)

  const data = snapshot.data() as Partial<UserProgress>
  return {
    ...defaultUserProgress(uid),
    ...data,
    dragFillAnswers: data.dragFillAnswers ?? {},
    orderWordMap: data.orderWordMap ?? {},
  }
}

export const saveUserProgress = async (uid: string, payload: UserProgressPayload) => {
  const current = await getUserProgress(uid)
  const today = dateKey()
  const nextActivityDays = payload.completedExerciseIds.length > 0
    ? [...new Set([...current.activityDays, today])]
    : current.activityDays
  const streakDays = computeStreakDays(nextActivityDays)
  const level = Math.max(1, Math.floor(payload.totalXp / 120) + 1)

  const nextProgress: UserProgress = {
    ...current,
    ...payload,
    streakDays,
    level,
    activityDays: nextActivityDays,
    dragFillAnswer: Object.values(payload.dragFillAnswers)[0] ?? null,
    orderWords: Object.values(payload.orderWordMap)[0] ?? current.orderWords ?? defaultOrderWords,
  }

  await setDoc(progressRef(uid), {
    ...nextProgress,
    updatedAt: serverTimestamp(),
    lastCompletedAt: payload.completedExerciseIds.length > 0 ? serverTimestamp() : current.lastCompletedAt ?? null,
  }, { merge: true })

  return nextProgress
}
