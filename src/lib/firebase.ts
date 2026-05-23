import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID?.trim() || undefined

export const hasCoreFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId,
)
export const isFirebaseConfigured = hasCoreFirebaseConfig

const firebaseApp = hasCoreFirebaseConfig ? initializeApp(firebaseConfig) : null

export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp
  ? initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    }, firestoreDatabaseId)
  : null
export const functions = firebaseApp ? getFunctions(firebaseApp, 'us-central1') : null
export const googleProvider = new GoogleAuthProvider()

googleProvider.setCustomParameters({
  prompt: 'select_account',
})

export const requireFirebase = () => {
  if (!firebaseApp || !auth || !db || !functions) {
    throw new Error('Firebase não está configurado. Preencha as variáveis VITE_FIREBASE_* antes de usar autenticação.')
  }

  return { firebaseApp, auth, db, functions }
}
