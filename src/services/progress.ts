import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type EmotionalProgress = {
  confidence: number
  fluency: number
  hesitation: number
  emotionalStreak: number
  speakingConfidence: number
  listeningConfidence: number
  reviewPressure: number
  averageResponseMs: number
  favoriteModes: string[]
  weakSkills: string[]
  recurringErrors: string[]
}

export type UserProgress = {
  uid: string
  totalXp: number
  streakDays: number
  level: number
  completedExerciseIds: string[]
  choiceAnswers: Record<string, string | null>
  dragFillAnswers: Record<string, string | null>
  speakingCompletions: Record<string, boolean>
  orderWordMap: Record<string, string[]>
  dragFillAnswer?: string | null
  orderWords?: string[]
  activityDays: string[]
  recentMissionTheme: string
  recentMissionContext: string
  emotional: EmotionalProgress
  updatedAt?: unknown
  lastCompletedAt?: unknown
}

export type UserProgressPayload = Pick<
  UserProgress,
  | 'totalXp'
  | 'completedExerciseIds'
  | 'choiceAnswers'
  | 'dragFillAnswers'
  | 'speakingCompletions'
  | 'orderWordMap'
  | 'recentMissionTheme'
  | 'recentMissionContext'
  | 'emotional'
>

const defaultOrderWords = ['you', 'Where', 'are', 'from', '?']

const defaultEmotionalProgress = (): EmotionalProgress => ({
  confidence: 18,
  fluency: 12,
  hesitation: 62,
  emotionalStreak: 0,
  speakingConfidence: 10,
  listeningConfidence: 10,
  reviewPressure: 28,
  averageResponseMs: 0,
  favoriteModes: [],
  weakSkills: [],
  recurringErrors: [],
})

export const defaultUserProgress = (uid: string): UserProgress => ({
  uid,
  totalXp: 0,
  streakDays: 0,
  level: 1,
  completedExerciseIds: [],
  choiceAnswers: {},
  dragFillAnswers: {},
  speakingCompletions: {},
  orderWordMap: {},
  dragFillAnswer: null,
  orderWords: defaultOrderWords,
  activityDays: [],
  recentMissionTheme: '',
  recentMissionContext: '',
  emotional: defaultEmotionalProgress(),
})

const progressRef = (uid: string) => {
  const { db } = requireFirebase()
  return doc(db, 'userProgress', uid)
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
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

const sanitizeEmotionalProgress = (value: Partial<EmotionalProgress> | undefined): EmotionalProgress => ({
  confidence: clamp(Number(value?.confidence ?? defaultEmotionalProgress().confidence), 0, 100),
  fluency: clamp(Number(value?.fluency ?? defaultEmotionalProgress().fluency), 0, 100),
  hesitation: clamp(Number(value?.hesitation ?? defaultEmotionalProgress().hesitation), 0, 100),
  emotionalStreak: Math.max(0, Number(value?.emotionalStreak ?? 0)),
  speakingConfidence: clamp(Number(value?.speakingConfidence ?? defaultEmotionalProgress().speakingConfidence), 0, 100),
  listeningConfidence: clamp(Number(value?.listeningConfidence ?? defaultEmotionalProgress().listeningConfidence), 0, 100),
  reviewPressure: clamp(Number(value?.reviewPressure ?? defaultEmotionalProgress().reviewPressure), 0, 100),
  averageResponseMs: Math.max(0, Number(value?.averageResponseMs ?? 0)),
  favoriteModes: Array.isArray(value?.favoriteModes) ? value.favoriteModes.filter((item): item is string => typeof item === 'string') : [],
  weakSkills: Array.isArray(value?.weakSkills) ? value.weakSkills.filter((item): item is string => typeof item === 'string') : [],
  recurringErrors: Array.isArray(value?.recurringErrors) ? value.recurringErrors.filter((item): item is string => typeof item === 'string') : [],
})

export const getUserProgress = async (uid: string) => {
  const snapshot = await getDoc(progressRef(uid))
  if (!snapshot.exists()) return defaultUserProgress(uid)

  const data = snapshot.data() as Partial<UserProgress>
  return {
    ...defaultUserProgress(uid),
    ...data,
    dragFillAnswers: data.dragFillAnswers ?? {},
    speakingCompletions: data.speakingCompletions ?? {},
    orderWordMap: data.orderWordMap ?? {},
    emotional: sanitizeEmotionalProgress(data.emotional),
  }
}

export const saveUserProgress = async (uid: string, payload: UserProgressPayload) => {
  const current = await getUserProgress(uid)
  const today = dateKey()
  const nextActivityDays =
    payload.completedExerciseIds.length > 0 ? [...new Set([...current.activityDays, today])] : current.activityDays
  const streakDays = computeStreakDays(nextActivityDays)
  const level = Math.max(1, Math.floor(payload.totalXp / 120) + 1)

  const nextProgress: UserProgress = {
    ...current,
    ...payload,
    streakDays,
    level,
    activityDays: nextActivityDays,
    emotional: sanitizeEmotionalProgress(payload.emotional),
    speakingCompletions: payload.speakingCompletions ?? current.speakingCompletions ?? {},
    dragFillAnswer: Object.values(payload.dragFillAnswers)[0] ?? null,
    orderWords: Object.values(payload.orderWordMap)[0] ?? current.orderWords ?? defaultOrderWords,
  }

  await setDoc(
    progressRef(uid),
    {
      ...nextProgress,
      updatedAt: serverTimestamp(),
      lastCompletedAt: payload.completedExerciseIds.length > 0 ? serverTimestamp() : current.lastCompletedAt ?? null,
    },
    { merge: true },
  )

  return nextProgress
}
