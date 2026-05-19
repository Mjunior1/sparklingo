import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type LeaderboardEntry = {
  name: string
  xp: string
  highlighted?: boolean
}

type UserRankingRecord = {
  displayName?: string
  xp?: number
}

export const getWeeklyRanking = async (currentUid?: string | null) => {
  try {
    const { db } = requireFirebase()
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('xp', 'desc'), limit(8)))
    return snapshot.docs.map((userDoc) => {
      const data = userDoc.data() as UserRankingRecord
      return {
        name: data.displayName ?? 'Learner',
        xp: `${data.xp ?? 0} XP`,
        highlighted: currentUid === userDoc.id,
      }
    })
  } catch {
    return []
  }
}
