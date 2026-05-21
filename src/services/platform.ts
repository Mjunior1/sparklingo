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

const cleanString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const cleanBoolean = (value: unknown, fallback = false) => typeof value === 'boolean' ? value : fallback

const sanitizePlatformConfig = (config: Partial<PlatformConfig>): PlatformConfig => ({
  allowEmailAuth: cleanBoolean(config.allowEmailAuth, defaultPlatformConfig.allowEmailAuth),
  allowGoogleAuth: cleanBoolean(config.allowGoogleAuth, defaultPlatformConfig.allowGoogleAuth),
  onboardingEnabled: cleanBoolean(config.onboardingEnabled, defaultPlatformConfig.onboardingEnabled),
  heroHeadline: cleanString(config.heroHeadline, defaultPlatformConfig.heroHeadline),
  heroSubtitle: cleanString(config.heroSubtitle, defaultPlatformConfig.heroSubtitle),
  playCta: cleanString(config.playCta, defaultPlatformConfig.playCta),
  supportEmail: cleanString(config.supportEmail, defaultPlatformConfig.supportEmail),
})

const platformDocRef = () => {
  const { db } = requireFirebase()
  return doc(db, 'platform', 'runtime')
}

export const getPlatformConfig = async () => {
  try {
    const snapshot = await getDoc(platformDocRef())
    if (!snapshot.exists()) return defaultPlatformConfig

    return sanitizePlatformConfig({
      ...defaultPlatformConfig,
      ...(snapshot.data() as Partial<PlatformConfig>),
    })
  } catch {
    return defaultPlatformConfig
  }
}

export const savePlatformConfig = async (config: PlatformConfig) => {
  const payload = sanitizePlatformConfig(config)
  const { db } = requireFirebase()

  await setDoc(doc(db, 'platform', 'runtime'), {
    ...payload,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}
