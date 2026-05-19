import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type ProductEventType =
  | 'login'
  | 'onboarding_completed'
  | 'session_started'
  | 'session_completed'
  | 'quiz_completed'
  | 'quiz_failed'
  | 'drop_off'
  | 'streak_lost'

export const trackProductEvent = async (
  uid: string,
  type: ProductEventType,
  payload: Record<string, unknown> = {},
) => {
  try {
    const { db } = requireFirebase()
    await addDoc(collection(db, 'users', uid, 'events'), {
      type,
      payload,
      createdAt: serverTimestamp(),
    })
  } catch {
    // Telemetry should never break the main product flow.
  }
}
