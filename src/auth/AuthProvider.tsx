/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured, requireFirebase } from '../lib/firebase'
import { getPlatformConfig, type PlatformConfig } from '../services/platform'
import { ensureUserProfile, type UserProfile } from '../services/profiles'

type AuthMode = 'login' | 'signup'
type AuthStatus = 'loading' | 'signed_out' | 'signed_in'

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  profile: UserProfile | null
  platformConfig: PlatformConfig | null
  firebaseReady: boolean
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const loadSessionData = async (user: User) => {
  const [profile, platformConfig] = await Promise.all([
    ensureUserProfile(user),
    getPlatformConfig(),
  ])

  return { profile, platformConfig }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setStatus('signed_out')
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null)
        setProfile(null)
        setStatus('signed_out')
        return
      }

      setUser(nextUser)
      const session = await loadSessionData(nextUser)
      setProfile(session.profile)
      setPlatformConfig(session.platformConfig)
      setStatus('signed_in')
    })

    return unsubscribe
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { auth: firebaseAuth } = requireFirebase()
    const result = await signInWithPopup(firebaseAuth, googleProvider)
    const session = await loadSessionData(result.user)
    setUser(result.user)
    setProfile(session.profile)
    setPlatformConfig(session.platformConfig)
    setStatus('signed_in')
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { auth: firebaseAuth } = requireFirebase()
    const result = await signInWithEmailAndPassword(firebaseAuth, email, password)
    const [existingProfile, platform] = await Promise.all([
      ensureUserProfile(result.user),
      getPlatformConfig(),
    ])
    setUser(result.user)
    setProfile(existingProfile)
    setPlatformConfig(platform)
    setStatus('signed_in')
  }, [])

  const signUpWithPassword = useCallback(async (name: string, email: string, password: string) => {
    const { auth: firebaseAuth } = requireFirebase()
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    if (name.trim()) {
      await updateProfile(result.user, { displayName: name.trim() })
    }

    const session = await loadSessionData(result.user)

    setUser(result.user)
    setProfile(session.profile)
    setPlatformConfig(session.platformConfig)
    setStatus('signed_in')
  }, [])

  const signOut = useCallback(async () => {
    const { auth: firebaseAuth } = requireFirebase()
    await firebaseSignOut(firebaseAuth)
    setUser(null)
    setProfile(null)
    setStatus('signed_out')
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    profile,
    platformConfig,
    firebaseReady: isFirebaseConfigured,
    authMode,
    setAuthMode,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  }), [
    authMode,
    platformConfig,
    profile,
    signInWithGoogle,
    signInWithPassword,
    signOut,
    signUpWithPassword,
    status,
    user,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa ser usado dentro de AuthProvider.')
  return context
}
