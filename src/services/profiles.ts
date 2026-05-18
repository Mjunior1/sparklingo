import type { User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type UserProfile = {
  uid: string
  email: string
  displayName: string
  avatarUrl: string
  provider: string
  xp: number
  streak: number
  level: number
  createdAt?: unknown
  updatedAt?: unknown
  lastLoginAt?: unknown
}

const userProfileRef = (uid: string) => {
  const { db } = requireFirebase()
  return doc(db, 'users', uid)
}

const fallbackDisplayName = (user: User) => {
  if (user.displayName?.trim()) return user.displayName
  return user.email?.split('@')[0] ?? 'Learner'
}

export const ensureUserProfile = async (user: User) => {
  const ref = userProfileRef(user.uid)
  const snapshot = await getDoc(ref)

  const baseProfile: UserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: fallbackDisplayName(user),
    avatarUrl: user.photoURL ?? '',
    provider: user.providerData[0]?.providerId ?? 'password',
    xp: 0,
    streak: 0,
    level: 1,
  }

  if (!snapshot.exists()) {
    await setDoc(ref, {
      ...baseProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })

    return baseProfile
  }

  await updateDoc(ref, {
    email: user.email ?? '',
    displayName: fallbackDisplayName(user),
    avatarUrl: user.photoURL ?? '',
    provider: user.providerData[0]?.providerId ?? 'password',
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  })

  return {
    ...baseProfile,
    ...(snapshot.data() as Partial<UserProfile>),
  }
}

export const getUserProfile = async (uid: string) => {
  const snapshot = await getDoc(userProfileRef(uid))
  if (!snapshot.exists()) return null
  return snapshot.data() as UserProfile
}
