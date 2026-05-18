import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type PlatformConfig = {
  allowEmailAuth: boolean
  allowGoogleAuth: boolean
  onboardingEnabled: boolean
  heroHeadline: string
  heroSubtitle: string
  playCta: string
  supportEmail: string
}

export const defaultPlatformConfig: PlatformConfig = {
  allowEmailAuth: true,
  allowGoogleAuth: true,
  onboardingEnabled: true,
  heroHeadline: 'Transforme minutos em progresso real.',
  heroSubtitle: 'Entre, continue sua jornada e deixe o Spark manter o ritmo da sua aventura.',
  playCta: 'Começar minha aventura',
  supportEmail: 'support@sparklingo.app',
}

const platformDocRef = () => {
  const { db } = requireFirebase()
  return doc(db, 'platform', 'runtime')
}

export const ensurePlatformConfig = async () => {
  const snapshot = await getDoc(platformDocRef())
  if (snapshot.exists()) return snapshot.data() as PlatformConfig

  await setDoc(platformDocRef(), {
    ...defaultPlatformConfig,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return defaultPlatformConfig
}

export const getPlatformConfig = async () => {
  const snapshot = await getDoc(platformDocRef())
  if (!snapshot.exists()) return ensurePlatformConfig()

  return {
    ...defaultPlatformConfig,
    ...(snapshot.data() as Partial<PlatformConfig>),
  }
}
