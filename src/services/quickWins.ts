import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'

export type QuickWinCategory =
  | 'phrase'
  | 'listening'
  | 'translation'
  | 'speaking'
  | 'memory'
  | 'shadowing'
  | 'combo'

export type QuickWinIconType = 'message' | 'speaker' | 'star' | 'mic' | 'brain' | 'bolt'
export type QuickWinProgressMode = 'progress' | 'timer'
export type QuickWinCTAType = 'start' | 'continue' | 'replay'
export type QuickWinHoverEffect = 'glow' | 'lift' | 'pulse'
export type QuickWinCinematicStyle = 'violet' | 'emerald' | 'amber' | 'azure' | 'fuchsia'
export type QuickWinMotionPreset = 'breathe' | 'float' | 'drift'
export type QuickWinHeaderIcon = 'zap' | 'sparkles' | 'flame'

export type QuickWinItem = {
  id: string
  title: string
  subtitle: string
  category: QuickWinCategory
  iconType: QuickWinIconType
  iconUrl?: string
  iconGlowColor: string
  accentColor: string
  overlayColor: string
  XPValue: number
  progressMode: QuickWinProgressMode
  progressCurrent: number
  progressTotal: number
  timerSeconds: number
  CTAType: QuickWinCTAType
  CTAButtonLabel: string
  active: boolean
  order: number
  hoverEffect: QuickWinHoverEffect
  cinematicStyle: QuickWinCinematicStyle
  motionPreset: QuickWinMotionPreset
}

export type QuickWinsConfig = {
  title: string
  subtitle: string
  viewAllLabel: string
  headerIconType: QuickWinHeaderIcon
}

const quickWinsCollection = 'quickWins'

export const quickWinCategoryOptions: QuickWinCategory[] = [
  'phrase',
  'listening',
  'translation',
  'speaking',
  'memory',
  'shadowing',
  'combo',
]

export const quickWinIconOptions: QuickWinIconType[] = ['message', 'speaker', 'star', 'mic', 'brain', 'bolt']
export const quickWinProgressModeOptions: QuickWinProgressMode[] = ['progress', 'timer']
export const quickWinCTATypeOptions: QuickWinCTAType[] = ['start', 'continue', 'replay']
export const quickWinHoverEffectOptions: QuickWinHoverEffect[] = ['glow', 'lift', 'pulse']
export const quickWinCinematicStyleOptions: QuickWinCinematicStyle[] = ['violet', 'emerald', 'amber', 'azure', 'fuchsia']
export const quickWinMotionPresetOptions: QuickWinMotionPreset[] = ['breathe', 'float', 'drift']
export const quickWinHeaderIconOptions: QuickWinHeaderIcon[] = ['zap', 'sparkles', 'flame']

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const cleanNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const cleanBoolean = (value: unknown, fallback = true) => (typeof value === 'boolean' ? value : fallback)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const pickEnum = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback

export const defaultQuickWinsConfig: QuickWinsConfig = {
  title: 'Quick Wins',
  subtitle: 'Desafios rápidos para ganhar XP e manter o ritmo!',
  viewAllLabel: 'Ver todas',
  headerIconType: 'zap',
}

export const createEmptyQuickWin = (): QuickWinItem => ({
  id: '',
  title: '',
  subtitle: '',
  category: 'phrase',
  iconType: 'message',
  iconUrl: '',
  iconGlowColor: '#8b5cf6',
  accentColor: '#8b5cf6',
  overlayColor: 'rgba(78, 38, 148, 0.58)',
  XPValue: 10,
  progressMode: 'progress',
  progressCurrent: 0,
  progressTotal: 1,
  timerSeconds: 8,
  CTAType: 'start',
  CTAButtonLabel: 'Entrar',
  active: true,
  order: 1,
  hoverEffect: 'glow',
  cinematicStyle: 'violet',
  motionPreset: 'breathe',
})

export const defaultQuickWinsCatalog: QuickWinItem[] = [
  {
    ...createEmptyQuickWin(),
    id: 'QW-00001',
    title: 'Frase do dia',
    subtitle: 'Complete a frase e ganhe XP!',
    category: 'phrase',
    iconType: 'message',
    iconGlowColor: '#9b6bff',
    accentColor: '#9b6bff',
    overlayColor: 'rgba(76, 40, 154, 0.58)',
    XPValue: 10,
    progressMode: 'progress',
    progressCurrent: 0,
    progressTotal: 1,
    order: 1,
    cinematicStyle: 'violet',
  },
  {
    ...createEmptyQuickWin(),
    id: 'QW-00002',
    title: 'Escuta rápida',
    subtitle: 'Ouça e escolha a opção correta.',
    category: 'listening',
    iconType: 'speaker',
    iconGlowColor: '#3fe49a',
    accentColor: '#29d18a',
    overlayColor: 'rgba(20, 97, 77, 0.54)',
    XPValue: 15,
    progressMode: 'progress',
    progressCurrent: 0,
    progressTotal: 1,
    order: 2,
    cinematicStyle: 'emerald',
  },
  {
    ...createEmptyQuickWin(),
    id: 'QW-00003',
    title: 'Tradução relâmpago',
    subtitle: 'Traduza a frase em 10 segundos!',
    category: 'translation',
    iconType: 'star',
    iconGlowColor: '#ffb347',
    accentColor: '#ffb347',
    overlayColor: 'rgba(129, 74, 18, 0.58)',
    XPValue: 20,
    progressMode: 'timer',
    progressCurrent: 7,
    progressTotal: 10,
    timerSeconds: 8,
    order: 3,
    cinematicStyle: 'amber',
  },
  {
    ...createEmptyQuickWin(),
    id: 'QW-00004',
    title: 'Fale agora',
    subtitle: 'Pronuncie a frase e ganhe XP!',
    category: 'speaking',
    iconType: 'mic',
    iconGlowColor: '#4ea5ff',
    accentColor: '#3c8fff',
    overlayColor: 'rgba(21, 61, 139, 0.56)',
    XPValue: 15,
    progressMode: 'progress',
    progressCurrent: 0,
    progressTotal: 1,
    order: 4,
    cinematicStyle: 'azure',
  },
  {
    ...createEmptyQuickWin(),
    id: 'QW-00005',
    title: 'Desafio mental',
    subtitle: 'Responda e booste seu cérebro!',
    category: 'memory',
    iconType: 'brain',
    iconGlowColor: '#ff5aa5',
    accentColor: '#ff5aa5',
    overlayColor: 'rgba(123, 27, 77, 0.56)',
    XPValue: 25,
    progressMode: 'timer',
    progressCurrent: 10,
    progressTotal: 12,
    timerSeconds: 15,
    CTAType: 'replay',
    CTAButtonLabel: 'Replay',
    order: 5,
    cinematicStyle: 'fuchsia',
  },
]

const sanitizeQuickWin = (item: Partial<QuickWinItem> & Record<string, unknown>): QuickWinItem => ({
  id: cleanString(item.id),
  title: cleanString(item.title),
  subtitle: cleanString(item.subtitle),
  category: pickEnum(item.category, quickWinCategoryOptions, 'phrase'),
  iconType: pickEnum(item.iconType, quickWinIconOptions, 'message'),
  iconUrl: cleanString(item.iconUrl),
  iconGlowColor: cleanString(item.iconGlowColor) || '#8b5cf6',
  accentColor: cleanString(item.accentColor) || '#8b5cf6',
  overlayColor: cleanString(item.overlayColor) || 'rgba(76, 40, 154, 0.58)',
  XPValue: clamp(cleanNumber(item.XPValue, 10), 1, 250),
  progressMode: pickEnum(item.progressMode, quickWinProgressModeOptions, 'progress'),
  progressCurrent: Math.max(0, cleanNumber(item.progressCurrent, 0)),
  progressTotal: Math.max(1, cleanNumber(item.progressTotal, 1)),
  timerSeconds: clamp(cleanNumber(item.timerSeconds, 8), 0, 3600),
  CTAType: pickEnum(item.CTAType, quickWinCTATypeOptions, 'start'),
  CTAButtonLabel: cleanString(item.CTAButtonLabel) || 'Entrar',
  active: cleanBoolean(item.active, true),
  order: Math.max(1, cleanNumber(item.order, 1)),
  hoverEffect: pickEnum(item.hoverEffect, quickWinHoverEffectOptions, 'glow'),
  cinematicStyle: pickEnum(item.cinematicStyle, quickWinCinematicStyleOptions, 'violet'),
  motionPreset: pickEnum(item.motionPreset, quickWinMotionPresetOptions, 'breathe'),
})

const sanitizeQuickWinsConfig = (config: Partial<QuickWinsConfig> & Record<string, unknown>): QuickWinsConfig => ({
  title: cleanString(config.title) || defaultQuickWinsConfig.title,
  subtitle: cleanString(config.subtitle) || defaultQuickWinsConfig.subtitle,
  viewAllLabel: cleanString(config.viewAllLabel) || defaultQuickWinsConfig.viewAllLabel,
  headerIconType: pickEnum(config.headerIconType, quickWinHeaderIconOptions, defaultQuickWinsConfig.headerIconType),
})

const quickWinsConfigRef = () => {
  const { db } = requireFirebase()
  return doc(db, 'platform', 'quickWins')
}

export const getQuickWins = async () => {
  try {
    const { db } = requireFirebase()
    const snapshot = await getDocs(collection(db, quickWinsCollection))
    if (snapshot.empty) return defaultQuickWinsCatalog

    return snapshot.docs
      .map((item) => sanitizeQuickWin({ id: item.id, ...(item.data() as Record<string, unknown>) }))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
  } catch {
    return defaultQuickWinsCatalog
  }
}

export const getQuickWinsConfig = async () => {
  try {
    const snapshot = await getDoc(quickWinsConfigRef())
    if (!snapshot.exists()) return defaultQuickWinsConfig

    return sanitizeQuickWinsConfig(snapshot.data() as Partial<QuickWinsConfig> & Record<string, unknown>)
  } catch {
    return defaultQuickWinsConfig
  }
}

export const saveQuickWinsConfig = async (config: QuickWinsConfig) => {
  const safeConfig = sanitizeQuickWinsConfig(config)
  const { db } = requireFirebase()
  await setDoc(
    doc(db, 'platform', 'quickWins'),
    {
      ...safeConfig,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export const upsertQuickWin = async (item: QuickWinItem) => {
  const safeItem = sanitizeQuickWin(item as QuickWinItem & Record<string, unknown>)
  const { db } = requireFirebase()
  await setDoc(
    doc(db, quickWinsCollection, safeItem.id),
    {
      ...safeItem,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export const deleteQuickWin = async (id: string) => {
  const { db } = requireFirebase()
  await deleteDoc(doc(db, quickWinsCollection, id))
}

export const seedDefaultQuickWins = async () => {
  const { db } = requireFirebase()
  const batch = writeBatch(db)

  defaultQuickWinsCatalog.forEach((item) => {
    batch.set(doc(db, quickWinsCollection, item.id), {
      ...sanitizeQuickWin(item),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  batch.set(
    quickWinsConfigRef(),
    {
      ...sanitizeQuickWinsConfig(defaultQuickWinsConfig),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  await batch.commit()
}
