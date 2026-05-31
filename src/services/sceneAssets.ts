import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type SceneAssetCategory = 'Airport' | 'CoffeeShop' | 'Park' | 'General'
export type SceneAssetFocalPoint = 'center' | 'center-left' | 'center-right' | 'top' | 'bottom'
export type SceneAssetOverlayStyle = 'cinematic-violet' | 'midnight-glass' | 'ember-glow' | 'aurora-soft'

export type SceneAssetSafeArea = {
  x: number
  y: number
  width: number
  height: number
}

export type SceneAssetRecord = {
  id: string
  title: string
  slug: string
  category: SceneAssetCategory
  chapter: string
  mission: string
  emotionalTone: string
  missionCardDescription: string
  heroBackgroundImageUrl: string
  backgroundImageUrl: string
  imageUrl: string
  mobileImageUrl: string
  imageUrlDesktop: string
  imageUrlMobile: string
  recommendedAspectRatio: string
  focalPoint: SceneAssetFocalPoint
  focalPointX: number
  focalPointY: number
  overlayOpacity: number
  overlayColor: string
  overlayIntensity: number
  brightness: number
  blurIntensity: number
  textSafeArea: SceneAssetSafeArea
  characterSafeArea: SceneAssetSafeArea
  cinematicStyle: SceneAssetOverlayStyle
  uiOverlayStyle: SceneAssetOverlayStyle
  progressionOrder: number
  featuredHero: boolean
  showInHero: boolean
  active: boolean
}

const assetCollection = 'sceneAssets'

const validCategories: SceneAssetCategory[] = ['Airport', 'CoffeeShop', 'Park', 'General']
const validFocalPoints: SceneAssetFocalPoint[] = ['center', 'center-left', 'center-right', 'top', 'bottom']
const validOverlayStyles: SceneAssetOverlayStyle[] = ['cinematic-violet', 'midnight-glass', 'ember-glow', 'aurora-soft']

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const cleanNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const normalizeSceneAssetPath = (value: string) =>
  value
    .replace('/Images/coffee shop/', '/Images/CoffeeShop/')
    .replace('/Images/coffee%20shop/', '/Images/CoffeeShop/')
    .replace('/Images/Airport/MISSION SCENE â€” AIRPORT IMMIGRATION.png', '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png')

const safeArea = (x: number, y: number, width: number, height: number): SceneAssetSafeArea => ({
  x,
  y,
  width,
  height,
})

const cleanSafeArea = (value: unknown, fallback: SceneAssetSafeArea): SceneAssetSafeArea => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback

  const raw = value as Partial<Record<keyof SceneAssetSafeArea, unknown>>
  return {
    x: clamp(cleanNumber(raw.x, fallback.x), 0, 100),
    y: clamp(cleanNumber(raw.y, fallback.y), 0, 100),
    width: clamp(cleanNumber(raw.width, fallback.width), 0, 100),
    height: clamp(cleanNumber(raw.height, fallback.height), 0, 100),
  }
}

const focalPointToXY = (focalPoint: SceneAssetFocalPoint) => {
  if (focalPoint === 'center-left') return { x: 34, y: 50 }
  if (focalPoint === 'center-right') return { x: 66, y: 50 }
  if (focalPoint === 'top') return { x: 50, y: 20 }
  if (focalPoint === 'bottom') return { x: 50, y: 78 }
  return { x: 50, y: 50 }
}

const pickEnum = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback

export const defaultSceneAssetDraft: SceneAssetRecord = {
  id: '',
  title: '',
  slug: '',
  category: 'Airport',
  chapter: 'Chapter 1',
  mission: '',
  emotionalTone: 'urgent wonder',
  missionCardDescription: 'Follow the next scene and keep moving through your journey.',
  heroBackgroundImageUrl: '',
  backgroundImageUrl: '',
  imageUrl: '',
  mobileImageUrl: '',
  imageUrlDesktop: '',
  imageUrlMobile: '',
  recommendedAspectRatio: '9:16',
  focalPoint: 'center-right',
  focalPointX: 66,
  focalPointY: 48,
  overlayOpacity: 58,
  overlayColor: '#090d24',
  overlayIntensity: 58,
  brightness: 96,
  blurIntensity: 10,
  textSafeArea: safeArea(8, 10, 38, 56),
  characterSafeArea: safeArea(44, 16, 42, 70),
  cinematicStyle: 'cinematic-violet',
  uiOverlayStyle: 'cinematic-violet',
  progressionOrder: 1,
  featuredHero: false,
  showInHero: true,
  active: true,
}

export const defaultSceneAssetsCatalog: SceneAssetRecord[] = [
  {
    ...defaultSceneAssetDraft,
    id: 'SA-00001',
    title: 'Airport Arrival Hero',
    slug: 'airport-arrival-hero',
    category: 'Airport',
    chapter: 'Chapter 1',
    mission: 'Airport Arrival',
    emotionalTone: 'hopeful urgency',
    missionCardDescription: 'Pedir ajuda e entender o próximo passo no aeroporto.',
    heroBackgroundImageUrl: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    backgroundImageUrl: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    imageUrl: '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png',
    mobileImageUrl: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    imageUrlDesktop: '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png',
    imageUrlMobile: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    focalPoint: 'center-right',
    focalPointX: 66,
    focalPointY: 48,
    overlayOpacity: 62,
    overlayColor: '#090d24',
    overlayIntensity: 62,
    brightness: 98,
    blurIntensity: 8,
    textSafeArea: safeArea(8, 11, 34, 56),
    characterSafeArea: safeArea(44, 14, 42, 72),
    cinematicStyle: 'cinematic-violet',
    uiOverlayStyle: 'cinematic-violet',
    progressionOrder: 1,
    featuredHero: true,
    showInHero: true,
    active: true,
  },
  {
    ...defaultSceneAssetDraft,
    id: 'SA-00002',
    title: 'Coffee Counter Scene',
    slug: 'coffee-counter-scene',
    category: 'CoffeeShop',
    chapter: 'Chapter 2',
    mission: 'Coffee Shop Confidence',
    emotionalTone: 'warm social courage',
    missionCardDescription: 'Peça seu café e converse como um nativo.',
    heroBackgroundImageUrl: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    backgroundImageUrl: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    imageUrl: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    mobileImageUrl: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    imageUrlDesktop: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    imageUrlMobile: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    focalPoint: 'center-left',
    focalPointX: 34,
    focalPointY: 50,
    overlayOpacity: 48,
    overlayColor: '#1b101d',
    overlayIntensity: 48,
    brightness: 102,
    blurIntensity: 6,
    textSafeArea: safeArea(9, 12, 38, 52),
    characterSafeArea: safeArea(8, 18, 44, 68),
    cinematicStyle: 'ember-glow',
    uiOverlayStyle: 'ember-glow',
    progressionOrder: 2,
    featuredHero: false,
    showInHero: true,
    active: true,
  },
  {
    ...defaultSceneAssetDraft,
    id: 'SA-00003',
    title: 'Park Reflection Scene',
    slug: 'park-reflection-scene',
    category: 'Park',
    chapter: 'Chapter 3',
    mission: 'Park Reflection',
    emotionalTone: 'calm confidence',
    missionCardDescription: 'Peça seu sorvete favorito e aproveite o passeio no parque.',
    heroBackgroundImageUrl: '/Images/Park/fox_in_the_park_draw.png',
    backgroundImageUrl: '/Images/Park/fox_in_the_park_draw.png',
    imageUrl: '/Images/Park/fox_in_the_park_draw.png',
    mobileImageUrl: '/Images/Park/fox_in_the_park_draw.png',
    imageUrlDesktop: '/Images/Park/fox_in_the_park_draw.png',
    imageUrlMobile: '/Images/Park/fox_in_the_park_draw.png',
    recommendedAspectRatio: '4:5',
    focalPoint: 'center-left',
    focalPointX: 34,
    focalPointY: 50,
    overlayOpacity: 34,
    overlayColor: '#0a1620',
    overlayIntensity: 34,
    brightness: 106,
    blurIntensity: 4,
    textSafeArea: safeArea(10, 10, 36, 48),
    characterSafeArea: safeArea(6, 18, 44, 70),
    cinematicStyle: 'aurora-soft',
    uiOverlayStyle: 'aurora-soft',
    progressionOrder: 3,
    featuredHero: false,
    showInHero: true,
    active: true,
  },
]

const sanitizeSceneAsset = (asset: SceneAssetRecord | (Partial<SceneAssetRecord> & Record<string, unknown>)): SceneAssetRecord => {
  const focalPoint = pickEnum(asset.focalPoint, validFocalPoints, 'center')
  const fallbackXY = focalPointToXY(focalPoint)
  const heroBackgroundImageUrl = normalizeSceneAssetPath(
    cleanString(asset.heroBackgroundImageUrl) ||
      cleanString(asset.backgroundImageUrl) ||
      cleanString(asset.imageUrlDesktop) ||
      cleanString(asset.imageUrl),
  )
  const imageUrl = normalizeSceneAssetPath(cleanString(asset.imageUrl) || cleanString(asset.imageUrlDesktop))
  const mobileImageUrl = normalizeSceneAssetPath(
    cleanString(asset.mobileImageUrl) ||
      cleanString(asset.imageUrlMobile) ||
      imageUrl ||
      heroBackgroundImageUrl,
  )
  const cinematicStyle = pickEnum(
    asset.cinematicStyle ?? asset.uiOverlayStyle,
    validOverlayStyles,
    'cinematic-violet',
  )
  const overlayOpacity = clamp(cleanNumber(asset.overlayOpacity ?? asset.overlayIntensity, 55), 0, 100)

  return {
    id: cleanString(asset.id),
    title: cleanString(asset.title),
    slug: cleanString(asset.slug),
    category: pickEnum(asset.category, validCategories, 'General'),
    chapter: cleanString(asset.chapter),
    mission: cleanString(asset.mission),
    emotionalTone: cleanString(asset.emotionalTone),
    missionCardDescription: cleanString(asset.missionCardDescription),
    heroBackgroundImageUrl,
    backgroundImageUrl: heroBackgroundImageUrl,
    imageUrl,
    mobileImageUrl,
    imageUrlDesktop: imageUrl || heroBackgroundImageUrl,
    imageUrlMobile: mobileImageUrl || heroBackgroundImageUrl,
    recommendedAspectRatio: cleanString(asset.recommendedAspectRatio) || '9:16',
    focalPoint,
    focalPointX: clamp(cleanNumber(asset.focalPointX, fallbackXY.x), 0, 100),
    focalPointY: clamp(cleanNumber(asset.focalPointY, fallbackXY.y), 0, 100),
    overlayOpacity,
    overlayColor: cleanString(asset.overlayColor) || '#090d24',
    overlayIntensity: overlayOpacity,
    brightness: clamp(cleanNumber(asset.brightness, 100), 40, 140),
    blurIntensity: clamp(cleanNumber(asset.blurIntensity, 8), 0, 24),
    textSafeArea: cleanSafeArea(asset.textSafeArea, defaultSceneAssetDraft.textSafeArea),
    characterSafeArea: cleanSafeArea(asset.characterSafeArea, defaultSceneAssetDraft.characterSafeArea),
    cinematicStyle,
    uiOverlayStyle: cinematicStyle,
    progressionOrder: clamp(cleanNumber(asset.progressionOrder, 1), 1, 999),
    featuredHero: typeof asset.featuredHero === 'boolean' ? asset.featuredHero : false,
    showInHero: typeof asset.showInHero === 'boolean' ? asset.showInHero : true,
    active: typeof asset.active === 'boolean' ? asset.active : true,
  }
}

const fromSceneDoc = (docData: DocumentData): SceneAssetRecord =>
  sanitizeSceneAsset({
    ...defaultSceneAssetDraft,
    id: cleanString(docData.id),
    title: cleanString(docData.title),
    slug: cleanString(docData.slug),
    category: docData.category as SceneAssetCategory,
    chapter: cleanString(docData.chapter),
    mission: cleanString(docData.mission),
    emotionalTone: cleanString(docData.emotionalTone),
    missionCardDescription: cleanString(docData.missionCardDescription),
    heroBackgroundImageUrl: cleanString(docData.heroBackgroundImageUrl),
    backgroundImageUrl: cleanString(docData.backgroundImageUrl),
    imageUrl: cleanString(docData.imageUrl),
    mobileImageUrl: cleanString(docData.mobileImageUrl),
    imageUrlDesktop: cleanString(docData.imageUrlDesktop),
    imageUrlMobile: cleanString(docData.imageUrlMobile),
    recommendedAspectRatio: cleanString(docData.recommendedAspectRatio),
    focalPoint: docData.focalPoint as SceneAssetFocalPoint,
    focalPointX: cleanNumber(docData.focalPointX, defaultSceneAssetDraft.focalPointX),
    focalPointY: cleanNumber(docData.focalPointY, defaultSceneAssetDraft.focalPointY),
    overlayOpacity: cleanNumber(docData.overlayOpacity, defaultSceneAssetDraft.overlayOpacity),
    overlayColor: cleanString(docData.overlayColor),
    overlayIntensity: cleanNumber(docData.overlayIntensity, defaultSceneAssetDraft.overlayIntensity),
    brightness: cleanNumber(docData.brightness, defaultSceneAssetDraft.brightness),
    blurIntensity: cleanNumber(docData.blurIntensity, defaultSceneAssetDraft.blurIntensity),
    textSafeArea: cleanSafeArea(docData.textSafeArea, defaultSceneAssetDraft.textSafeArea),
    characterSafeArea: cleanSafeArea(docData.characterSafeArea, defaultSceneAssetDraft.characterSafeArea),
    cinematicStyle: docData.cinematicStyle as SceneAssetOverlayStyle,
    uiOverlayStyle: docData.uiOverlayStyle as SceneAssetOverlayStyle,
    progressionOrder: cleanNumber(docData.progressionOrder, defaultSceneAssetDraft.progressionOrder),
    featuredHero: typeof docData.featuredHero === 'boolean' ? docData.featuredHero : false,
    showInHero: typeof docData.showInHero === 'boolean' ? docData.showInHero : true,
    active: Boolean(docData.active),
  })

export const getSceneAssets = async () => {
  const { db } = requireFirebase()
  const snapshot = await getDocs(collection(db, assetCollection))

  return snapshot.docs
    .map((item) =>
      fromSceneDoc({
        id: item.id,
        ...item.data(),
      }),
    )
    .sort((a, b) => a.progressionOrder - b.progressionOrder || a.title.localeCompare(b.title))
}

export const getFeaturedHeroSceneAsset = async () => {
  const assets = await getSceneAssets()
  return assets.find((asset) => asset.active && asset.featuredHero) ?? assets.find((asset) => asset.active) ?? null
}

export const upsertSceneAsset = async (asset: SceneAssetRecord) => {
  const { db } = requireFirebase()
  const sanitized = sanitizeSceneAsset(asset)
  if (!sanitized.id) throw new Error('Defina um id válido para o scene asset.')
  if (!sanitized.title) throw new Error('Defina um título para o scene asset.')
  if (!sanitized.slug) throw new Error('Defina um slug para o scene asset.')
  if (!sanitized.imageUrl && !sanitized.mobileImageUrl && !sanitized.heroBackgroundImageUrl) {
    throw new Error('Informe pelo menos uma URL visual para o scene asset.')
  }

  await setDoc(
    doc(db, assetCollection, sanitized.id),
    {
      ...JSON.parse(JSON.stringify(sanitized)),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export const deleteSceneAsset = async (id: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, assetCollection, id))
}

export const seedDefaultSceneAssets = async () => {
  const { db } = requireFirebase()
  const batch = writeBatch(db)

  defaultSceneAssetsCatalog.forEach((asset) => {
    batch.set(doc(db, assetCollection, asset.id), {
      ...sanitizeSceneAsset(asset),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}
