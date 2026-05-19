import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

initializeApp()

const db = getFirestore()

export const syncUserProfileFromProgress = onDocumentWritten('userProgress/{userId}', async (event) => {
  const after = event.data?.after
  if (!after?.exists) return

  const userId = event.params.userId
  const data = after.data() as {
    totalXp?: number
    streakDays?: number
    level?: number
  }

  await db.collection('users').doc(userId).set({
    xp: data.totalXp ?? 0,
    streak: data.streakDays ?? 0,
    level: data.level ?? 1,
    updatedAt: new Date(),
  }, { merge: true })
})
