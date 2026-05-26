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
  imageUrlDesktop: string
  imageUrlMobile: string
  recommendedAspectRatio: string
  focalPoint: SceneAssetFocalPoint
  overlayIntensity: number
  brightness: number
  blurIntensity: number
  textSafeArea: SceneAssetSafeArea
  characterSafeArea: SceneAssetSafeArea
  uiOverlayStyle: SceneAssetOverlayStyle
  progressionOrder: number
  active: boolean
}

const assetCollection = 'sceneAssets'

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const cleanNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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

const safeArea = (x: number, y: number, width: number, height: number): SceneAssetSafeArea => ({
  x,
  y,
  width,
  height,
})

const validCategories: SceneAssetCategory[] = ['Airport', 'CoffeeShop', 'Park', 'General']
const validFocalPoints: SceneAssetFocalPoint[] = ['center', 'center-left', 'center-right', 'top', 'bottom']
const validOverlayStyles: SceneAssetOverlayStyle[] = ['cinematic-violet', 'midnight-glass', 'ember-glow', 'aurora-soft']

export const defaultSceneAssetDraft: SceneAssetRecord = {
  id: '',
  title: '',
  slug: '',
  category: 'Airport',
  chapter: 'Chapter 1',
  mission: '',
  emotionalTone: 'urgent wonder',
  imageUrlDesktop: '',
  imageUrlMobile: '',
  recommendedAspectRatio: '9:16',
  focalPoint: 'center-right',
  overlayIntensity: 58,
  brightness: 96,
  blurIntensity: 10,
  textSafeArea: safeArea(8, 10, 38, 56),
  characterSafeArea: safeArea(44, 16, 42, 70),
  uiOverlayStyle: 'cinematic-violet',
  progressionOrder: 1,
  active: true,
}

export const defaultSceneAssetsCatalog: SceneAssetRecord[] = [
  {
    id: 'SA-00001',
    title: 'Airport Arrival Hero',
    slug: 'airport-arrival-hero',
    category: 'Airport',
    chapter: 'Chapter 1',
    mission: 'Airport Arrival',
    emotionalTone: 'hopeful urgency',
    imageUrlDesktop: '/Images/Airport/MISSION SCENE — AIRPORT IMMIGRATION.png',
    imageUrlMobile: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    recommendedAspectRatio: '9:16',
    focalPoint: 'center-right',
    overlayIntensity: 62,
    brightness: 98,
    blurIntensity: 8,
    textSafeArea: safeArea(7, 10, 36, 58),
    characterSafeArea: safeArea(42, 12, 44, 72),
    uiOverlayStyle: 'cinematic-violet',
    progressionOrder: 1,
    active: true,
  },
  {
    id: 'SA-00002',
    title: 'Coffee Counter Scene',
    slug: 'coffee-counter-scene',
    category: 'CoffeeShop',
    chapter: 'Chapter 2',
    mission: 'Coffee Shop Confidence',
    emotionalTone: 'warm social courage',
    imageUrlDesktop: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    imageUrlMobile: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    recommendedAspectRatio: '9:16',
    focalPoint: 'center-left',
    overlayIntensity: 48,
    brightness: 102,
    blurIntensity: 6,
    textSafeArea: safeArea(8, 9, 40, 54),
    characterSafeArea: safeArea(8, 18, 44, 70),
    uiOverlayStyle: 'ember-glow',
    progressionOrder: 2,
    active: true,
  },
  {
    id: 'SA-00003',
    title: 'Park Reflection Scene',
    slug: 'park-reflection-scene',
    category: 'Park',
    chapter: 'Chapter 3',
    mission: 'Park Reflection',
    emotionalTone: 'calm confidence',
    imageUrlDesktop: '/Images/Park/fox_in_the_park_draw.png',
    imageUrlMobile: '/Images/Park/fox_in_the_park_draw.png',
    recommendedAspectRatio: '4:5',
    focalPoint: 'center-left',
    overlayIntensity: 34,
    brightness: 106,
    blurIntensity: 4,
    textSafeArea: safeArea(10, 10, 36, 48),
    characterSafeArea: safeArea(6, 18, 44, 70),
    uiOverlayStyle: 'aurora-soft',
    progressionOrder: 3,
    active: true,
  },
]

const sanitizeSceneAsset = (asset: SceneAssetRecord): SceneAssetRecord => ({
  id: cleanString(asset.id),
  title: cleanString(asset.title),
  slug: cleanString(asset.slug),
  category: validCategories.includes(asset.category) ? asset.category : 'General',
  chapter: cleanString(asset.chapter),
  mission: cleanString(asset.mission),
  emotionalTone: cleanString(asset.emotionalTone),
  imageUrlDesktop: cleanString(asset.imageUrlDesktop),
  imageUrlMobile: cleanString(asset.imageUrlMobile),
  recommendedAspectRatio: cleanString(asset.recommendedAspectRatio) || '9:16',
  focalPoint: validFocalPoints.includes(asset.focalPoint) ? asset.focalPoint : 'center',
  overlayIntensity: clamp(cleanNumber(asset.overlayIntensity, 55), 0, 100),
  brightness: clamp(cleanNumber(asset.brightness, 100), 40, 140),
  blurIntensity: clamp(cleanNumber(asset.blurIntensity, 8), 0, 24),
  textSafeArea: cleanSafeArea(asset.textSafeArea, defaultSceneAssetDraft.textSafeArea),
  characterSafeArea: cleanSafeArea(asset.characterSafeArea, defaultSceneAssetDraft.characterSafeArea),
  uiOverlayStyle: validOverlayStyles.includes(asset.uiOverlayStyle) ? asset.uiOverlayStyle : 'cinematic-violet',
  progressionOrder: clamp(cleanNumber(asset.progressionOrder, 1), 1, 999),
  active: typeof asset.active === 'boolean' ? asset.active : true,
})

const fromSceneDoc = (docData: DocumentData): SceneAssetRecord => sanitizeSceneAsset({
  ...defaultSceneAssetDraft,
  id: cleanString(docData.id),
  title: cleanString(docData.title),
  slug: cleanString(docData.slug),
  category: docData.category as SceneAssetCategory,
  chapter: cleanString(docData.chapter),
  mission: cleanString(docData.mission),
  emotionalTone: cleanString(docData.emotionalTone),
  imageUrlDesktop: cleanString(docData.imageUrlDesktop),
  imageUrlMobile: cleanString(docData.imageUrlMobile),
  recommendedAspectRatio: cleanString(docData.recommendedAspectRatio),
  focalPoint: docData.focalPoint as SceneAssetFocalPoint,
  overlayIntensity: cleanNumber(docData.overlayIntensity, 55),
  brightness: cleanNumber(docData.brightness, 100),
  blurIntensity: cleanNumber(docData.blurIntensity, 8),
  textSafeArea: cleanSafeArea(docData.textSafeArea, defaultSceneAssetDraft.textSafeArea),
  characterSafeArea: cleanSafeArea(docData.characterSafeArea, defaultSceneAssetDraft.characterSafeArea),
  uiOverlayStyle: docData.uiOverlayStyle as SceneAssetOverlayStyle,
  progressionOrder: cleanNumber(docData.progressionOrder, 1),
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

export const upsertSceneAsset = async (asset: SceneAssetRecord) => {
  const { db } = requireFirebase()
  const sanitized = sanitizeSceneAsset(asset)
  if (!sanitized.id) throw new Error('Defina um id válido para o scene asset.')
  if (!sanitized.title) throw new Error('Defina um título para o scene asset.')
  if (!sanitized.slug) throw new Error('Defina um slug para o scene asset.')
  if (!sanitized.imageUrlDesktop && !sanitized.imageUrlMobile) {
    throw new Error('Informe pelo menos uma URL de imagem para o scene asset.')
  }

  await setDoc(
    doc(db, assetCollection, sanitized.id),
    {
      ...sanitized,
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
