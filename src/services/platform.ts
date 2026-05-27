import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type PlatformConfig = {
  allowEmailAuth: boolean
  allowGoogleAuth: boolean
  onboardingEnabled: boolean
  heroHeadline: string
  heroSubheadline: string
  heroCTA: string
  heroMascotImageUrl: string
  heroAmbientBackgroundUrl: string
  heroOverlayStrength: number
  heroGlowColor: string
  supportEmail: string
}

export const defaultPlatformConfig: PlatformConfig = {
  allowEmailAuth: true,
  allowGoogleAuth: true,
  onboardingEnabled: true,
  heroHeadline: 'Continue\nyour\nadventure',
  heroSubheadline: 'Entre, continue sua jornada e deixe o Spark manter o ritmo da sua aventura.',
  heroCTA: 'Começar minha aventura',
  heroMascotImageUrl: '/Images/Mascote/Sparklingo.png',
  heroAmbientBackgroundUrl: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
  heroOverlayStrength: 58,
  heroGlowColor: '#8f58ff',
  supportEmail: 'support@sparklingo.app',
}

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const cleanBoolean = (value: unknown, fallback = true) => (typeof value === 'boolean' ? value : fallback)
const cleanNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const sanitizePlatformConfig = (config: Partial<PlatformConfig> & Record<string, unknown>): PlatformConfig => {
  const legacyHeroSubtitle = cleanString(config.heroSubtitle)
  const legacyPlayCta = cleanString(config.playCta)

  return {
    allowEmailAuth: cleanBoolean(config.allowEmailAuth, defaultPlatformConfig.allowEmailAuth),
    allowGoogleAuth: cleanBoolean(config.allowGoogleAuth, defaultPlatformConfig.allowGoogleAuth),
    onboardingEnabled: cleanBoolean(config.onboardingEnabled, defaultPlatformConfig.onboardingEnabled),
    heroHeadline: cleanString(config.heroHeadline) || defaultPlatformConfig.heroHeadline,
    heroSubheadline:
      cleanString(config.heroSubheadline) ||
      legacyHeroSubtitle ||
      defaultPlatformConfig.heroSubheadline,
    heroCTA: cleanString(config.heroCTA) || legacyPlayCta || defaultPlatformConfig.heroCTA,
    heroMascotImageUrl:
      cleanString(config.heroMascotImageUrl) || defaultPlatformConfig.heroMascotImageUrl,
    heroAmbientBackgroundUrl:
      cleanString(config.heroAmbientBackgroundUrl) || defaultPlatformConfig.heroAmbientBackgroundUrl,
    heroOverlayStrength: clamp(
      cleanNumber(config.heroOverlayStrength, defaultPlatformConfig.heroOverlayStrength),
      0,
      100,
    ),
    heroGlowColor: cleanString(config.heroGlowColor) || defaultPlatformConfig.heroGlowColor,
    supportEmail: cleanString(config.supportEmail) || defaultPlatformConfig.supportEmail,
  }
}

const platformDocRef = () => {
  const { db } = requireFirebase()
  return doc(db, 'platform', 'runtime')
}

export const getPlatformConfig = async () => {
  try {
    const snapshot = await getDoc(platformDocRef())
    if (!snapshot.exists()) return defaultPlatformConfig

    return sanitizePlatformConfig(snapshot.data() as Partial<PlatformConfig> & Record<string, unknown>)
  } catch {
    return defaultPlatformConfig
  }
}

export const savePlatformConfig = async (config: PlatformConfig) => {
  const { db } = requireFirebase()
  const safeConfig = sanitizePlatformConfig(config)
  await setDoc(
    doc(db, 'platform', 'runtime'),
    {
      ...safeConfig,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
