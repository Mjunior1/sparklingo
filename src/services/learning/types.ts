import type { SceneAssetCategory } from '../sceneAssets'

export type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'mixed'
export type ExperienceType =
  | 'speaking'
  | 'listening'
  | 'dragdrop'
  | 'repeat'
  | 'memory'
  | 'multiple_choice'
  | 'pronunciation'
  | 'emotional_feedback'

export type MissionRuntimeMode = 'legacy-catalog' | 'runtime-scenes' | 'native'

export type DifficultyRange = {
  min: DifficultyLevel
  max: DifficultyLevel
}

export type WorldStatus = 'active' | 'inactive'

export type WorldRecord = {
  id: string
  title: string
  subtitle: string
  slug: string
  description: string
  cinematicTone: string
  emotionalTone: string
  difficultyRange: DifficultyRange
  recommendedLevel: DifficultyLevel
  visualIdentity: string
  soundtrackStyle: string
  progressionFantasy: string
  status: WorldStatus
  coverImage: string
  mobileCoverImage: string
  order: number
  xpMultiplier: number
}

export type MissionRecord = {
  id: string
  worldId: string
  title: string
  subtitle: string
  slug: string
  description: string
  emotionalContext: string
  practicalGoal: string
  recommendedLevel: DifficultyLevel
  progressionOrder: number
  status: WorldStatus
  coverImage: string
  mobileCoverImage: string
  sceneAssetId: string
  runtimeMode: MissionRuntimeMode
  legacyLessonId?: string
  legacyMissionTitle?: string
}

export type SceneRecord = {
  id: string
  missionId: string
  title: string
  emotion: string
  environment: string
  sceneAssetId: string
  npc: string
  difficulty: DifficultyLevel
  progressionOrder: number
  backgroundAudio: string
  tensionLevel: number
  legacyRuntimeSceneId?: string
}

export type ExperienceRecord = {
  id: string
  sceneId: string
  type: ExperienceType
  xpReward: number
  difficulty: DifficultyLevel
  duration: number
  payload: Record<string, unknown>
  aiGenerated: boolean
  adaptiveEnabled: boolean
  emotionalContext: string
  progressionOrder: number
  legacyQuestionId?: string
  legacyRuntimeSceneId?: string
}

export type SceneExperienceBundle = {
  scene: SceneRecord
  experiences: ExperienceRecord[]
}

export type MissionExperienceBundle = {
  world: WorldRecord
  mission: MissionRecord
  scenes: SceneExperienceBundle[]
}

const defaultDifficultyRange: DifficultyRange = {
  min: 'A1',
  max: 'B1',
}

const validDifficultyLevels: DifficultyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'mixed']
const validWorldStatuses: WorldStatus[] = ['active', 'inactive']
const validExperienceTypes: ExperienceType[] = [
  'speaking',
  'listening',
  'dragdrop',
  'repeat',
  'memory',
  'multiple_choice',
  'pronunciation',
  'emotional_feedback',
]
const validRuntimeModes: MissionRuntimeMode[] = ['legacy-catalog', 'runtime-scenes', 'native']

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const cleanNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const pickEnum = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const createLearningSlug = (value: string, fallback = 'item') => {
  const slug = slugify(cleanString(value))
  return slug || fallback
}

export const sanitizeDifficultyRange = (value: unknown): DifficultyRange => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultDifficultyRange

  const raw = value as Partial<Record<keyof DifficultyRange, unknown>>
  return {
    min: pickEnum(raw.min, validDifficultyLevels, defaultDifficultyRange.min),
    max: pickEnum(raw.max, validDifficultyLevels, defaultDifficultyRange.max),
  }
}

export const sanitizeWorldRecord = (world: Partial<WorldRecord> & Record<string, unknown>): WorldRecord => ({
  id: cleanString(world.id),
  title: cleanString(world.title),
  subtitle: cleanString(world.subtitle),
  slug: createLearningSlug(cleanString(world.slug) || cleanString(world.title), 'world'),
  description: cleanString(world.description),
  cinematicTone: cleanString(world.cinematicTone),
  emotionalTone: cleanString(world.emotionalTone),
  difficultyRange: sanitizeDifficultyRange(world.difficultyRange),
  recommendedLevel: pickEnum(world.recommendedLevel, validDifficultyLevels, 'A1'),
  visualIdentity: cleanString(world.visualIdentity),
  soundtrackStyle: cleanString(world.soundtrackStyle),
  progressionFantasy: cleanString(world.progressionFantasy),
  status: pickEnum(world.status, validWorldStatuses, 'active'),
  coverImage: cleanString(world.coverImage),
  mobileCoverImage: cleanString(world.mobileCoverImage) || cleanString(world.coverImage),
  order: Math.max(1, cleanNumber(world.order, 1)),
  xpMultiplier: clamp(cleanNumber(world.xpMultiplier, 1), 0.25, 10),
})

export const sanitizeMissionRecord = (mission: Partial<MissionRecord> & Record<string, unknown>): MissionRecord => ({
  id: cleanString(mission.id),
  worldId: cleanString(mission.worldId),
  title: cleanString(mission.title),
  subtitle: cleanString(mission.subtitle),
  slug: createLearningSlug(cleanString(mission.slug) || cleanString(mission.title), 'mission'),
  description: cleanString(mission.description),
  emotionalContext: cleanString(mission.emotionalContext),
  practicalGoal: cleanString(mission.practicalGoal),
  recommendedLevel: pickEnum(mission.recommendedLevel, validDifficultyLevels, 'A1'),
  progressionOrder: Math.max(1, cleanNumber(mission.progressionOrder, 1)),
  status: pickEnum(mission.status, validWorldStatuses, 'active'),
  coverImage: cleanString(mission.coverImage),
  mobileCoverImage: cleanString(mission.mobileCoverImage) || cleanString(mission.coverImage),
  sceneAssetId: cleanString(mission.sceneAssetId),
  runtimeMode: pickEnum(mission.runtimeMode, validRuntimeModes, 'legacy-catalog'),
  legacyLessonId: cleanString(mission.legacyLessonId) || undefined,
  legacyMissionTitle: cleanString(mission.legacyMissionTitle) || undefined,
})

export const sanitizeSceneRecord = (scene: Partial<SceneRecord> & Record<string, unknown>): SceneRecord => ({
  id: cleanString(scene.id),
  missionId: cleanString(scene.missionId),
  title: cleanString(scene.title),
  emotion: cleanString(scene.emotion),
  environment: cleanString(scene.environment),
  sceneAssetId: cleanString(scene.sceneAssetId),
  npc: cleanString(scene.npc),
  difficulty: pickEnum(scene.difficulty, validDifficultyLevels, 'A1'),
  progressionOrder: Math.max(1, cleanNumber(scene.progressionOrder, 1)),
  backgroundAudio: cleanString(scene.backgroundAudio),
  tensionLevel: clamp(cleanNumber(scene.tensionLevel, 0.5), 0, 1),
  legacyRuntimeSceneId: cleanString(scene.legacyRuntimeSceneId) || undefined,
})

export const sanitizeExperienceRecord = (
  experience: Partial<ExperienceRecord> & Record<string, unknown>,
): ExperienceRecord => ({
  id: cleanString(experience.id),
  sceneId: cleanString(experience.sceneId),
  type: pickEnum(experience.type, validExperienceTypes, 'multiple_choice'),
  xpReward: Math.max(0, cleanNumber(experience.xpReward, 0)),
  difficulty: pickEnum(experience.difficulty, validDifficultyLevels, 'A1'),
  duration: Math.max(0, cleanNumber(experience.duration, 0)),
  payload:
    experience.payload && typeof experience.payload === 'object' && !Array.isArray(experience.payload)
      ? (experience.payload as Record<string, unknown>)
      : {},
  aiGenerated: typeof experience.aiGenerated === 'boolean' ? experience.aiGenerated : false,
  adaptiveEnabled: typeof experience.adaptiveEnabled === 'boolean' ? experience.adaptiveEnabled : false,
  emotionalContext: cleanString(experience.emotionalContext),
  progressionOrder: Math.max(1, cleanNumber(experience.progressionOrder, 1)),
  legacyQuestionId: cleanString(experience.legacyQuestionId) || undefined,
  legacyRuntimeSceneId: cleanString(experience.legacyRuntimeSceneId) || undefined,
})

export const worldCollection = 'worlds'
export const sceneCollection = 'scenes'
export const experienceCollection = 'experiences'

export const defaultWorldsCatalog: WorldRecord[] = [
  {
    id: 'world-airport-survival',
    title: 'Airport Survival',
    subtitle: 'Urgency, wayfinding and practical confidence under pressure.',
    slug: 'airport-survival',
    description: 'Navigate check-in, immigration, boarding changes and fast travel decisions.',
    cinematicTone: 'sunset urgency',
    emotionalTone: 'hopeful courage',
    difficultyRange: { min: 'A1', max: 'B1' },
    recommendedLevel: 'A1',
    visualIdentity: 'violet sunset terminals',
    soundtrackStyle: 'ambient pulses and travel tension',
    progressionFantasy: 'you keep moving even when plans break',
    status: 'active',
    coverImage: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    mobileCoverImage: '/Images/Airport/HERO_MISSION_AIRPORT_MOBILE_V2.png',
    order: 1,
    xpMultiplier: 1.15,
  },
  {
    id: 'world-coffee-confidence',
    title: 'Coffee Confidence',
    subtitle: 'Warm social exchanges that turn hesitation into ease.',
    slug: 'coffee-confidence',
    description: 'Order, clarify, pay and chat naturally in a cozy cafe setting.',
    cinematicTone: 'warm amber intimacy',
    emotionalTone: 'social courage',
    difficultyRange: { min: 'A1', max: 'B1' },
    recommendedLevel: 'A1',
    visualIdentity: 'soft cafe amber with green accents',
    soundtrackStyle: 'lo-fi acoustic comfort',
    progressionFantasy: 'small talk becomes second nature',
    status: 'active',
    coverImage: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    mobileCoverImage: '/Images/CoffeeShop/sparklingo_scene_coffee_ordering_mobile_v1.png',
    order: 2,
    xpMultiplier: 1.05,
  },
  {
    id: 'world-park-reflection',
    title: 'Park Reflection',
    subtitle: 'Calmer scenes for listening, memory and confidence recovery.',
    slug: 'park-reflection',
    description: 'Practice lightly, reflect, answer naturally and build emotional fluency.',
    cinematicTone: 'green calm',
    emotionalTone: 'reflective confidence',
    difficultyRange: { min: 'A1', max: 'B1' },
    recommendedLevel: 'A1',
    visualIdentity: 'soft greens with sunset gold',
    soundtrackStyle: 'peaceful piano and environmental ambience',
    progressionFantasy: 'quiet moments still move the story forward',
    status: 'active',
    coverImage: '/Images/Park/fox_in_the_park_draw.png',
    mobileCoverImage: '/Images/Park/fox_in_the_park_draw.png',
    order: 3,
    xpMultiplier: 1,
  },
  {
    id: 'world-london-streets',
    title: 'London Streets',
    subtitle: 'Directions, movement and social navigation in a living city.',
    slug: 'london-streets',
    description: 'Ask for help, understand landmarks and keep moving through the city.',
    cinematicTone: 'rain glow city',
    emotionalTone: 'curious momentum',
    difficultyRange: { min: 'A2', max: 'B2' },
    recommendedLevel: 'A2',
    visualIdentity: 'cool city blues with amber streetlight',
    soundtrackStyle: 'urban ambience and subtle beats',
    progressionFantasy: 'the city opens as your language sharpens',
    status: 'inactive',
    coverImage: '',
    mobileCoverImage: '',
    order: 4,
    xpMultiplier: 1.1,
  },
  {
    id: 'world-first-job-interview',
    title: 'First Job Interview',
    subtitle: 'Higher stakes speaking with clarity, confidence and intention.',
    slug: 'first-job-interview',
    description: 'Introduce yourself, describe experience and manage professional tension.',
    cinematicTone: 'focused studio contrast',
    emotionalTone: 'earned confidence',
    difficultyRange: { min: 'B1', max: 'C1' },
    recommendedLevel: 'B1',
    visualIdentity: 'charcoal rooms with elegant highlights',
    soundtrackStyle: 'minimal tense orchestral pads',
    progressionFantasy: 'nerves become presence',
    status: 'inactive',
    coverImage: '',
    mobileCoverImage: '',
    order: 5,
    xpMultiplier: 1.25,
  },
  {
    id: 'world-hotel-check-in',
    title: 'Hotel Check-In',
    subtitle: 'Smooth service interactions, requests and quick problem solving.',
    slug: 'hotel-check-in',
    description: 'Confirm bookings, ask for help and solve practical travel issues.',
    cinematicTone: 'lobby gold dusk',
    emotionalTone: 'steady reassurance',
    difficultyRange: { min: 'A2', max: 'B1' },
    recommendedLevel: 'A2',
    visualIdentity: 'warm lobby light with plum shadows',
    soundtrackStyle: 'soft lounge ambience',
    progressionFantasy: 'you arrive prepared and capable',
    status: 'inactive',
    coverImage: '',
    mobileCoverImage: '',
    order: 6,
    xpMultiplier: 1.1,
  },
]

export const mapSceneAssetCategoryToWorldId = (category: SceneAssetCategory) => {
  if (category === 'Airport') return 'world-airport-survival'
  if (category === 'CoffeeShop') return 'world-coffee-confidence'
  if (category === 'Park') return 'world-park-reflection'
  return 'world-london-streets'
}
