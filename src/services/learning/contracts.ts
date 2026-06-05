import type {
  DifficultyLevel,
  ExperienceRecord,
  ExperienceType,
  MissionRecord,
  SceneRecord,
  WorldRecord,
} from './types'

export type RuntimeAnswerOption = {
  id: string
  text: string
  translation?: string
  audioUrl?: string
  isCorrect?: boolean
  feedbackTitle?: string
  feedbackBody?: string
  xpReward?: number
}

export type RuntimeAudioTrack = {
  url: string
  transcript?: string
  voice?: string
}

export type RuntimeChoiceFeedback = {
  title: string
  body: string
  tone?: string
  xpReward?: number
}

export type MultipleChoiceExperiencePayload = {
  npc: string
  question: string
  translation?: string
  answers: RuntimeAnswerOption[]
  audio?: RuntimeAudioTrack
}

export type ListeningExperiencePayload = {
  npc: string
  prompt: string
  translation?: string
  audio: RuntimeAudioTrack
  answers: RuntimeAnswerOption[]
}

export type SpeakingExperiencePayload = {
  npc: string
  prompt: string
  translation?: string
  expectedPhrases?: string[]
  audio?: RuntimeAudioTrack
}

export type DragDropExperiencePayload = {
  prompt: string
  translation?: string
  tokens: string[]
  solution: string[]
}

export type RepeatExperiencePayload = {
  prompt: string
  translation?: string
  audio: RuntimeAudioTrack
}

export type MemoryExperiencePayload = {
  prompt: string
  translation?: string
  pairs: Array<{
    id: string
    front: string
    back: string
  }>
}

export type PronunciationExperiencePayload = {
  prompt: string
  translation?: string
  targetPhrase: string
  phoneticHint?: string
  audio?: RuntimeAudioTrack
}

export type EmotionalFeedbackExperiencePayload = {
  companion?: string
  title: string
  body: string
  tone: string
  xpReward?: number
}

export type ExperiencePayloadMap = {
  multiple_choice: MultipleChoiceExperiencePayload
  listening: ListeningExperiencePayload
  speaking: SpeakingExperiencePayload
  dragdrop: DragDropExperiencePayload
  repeat: RepeatExperiencePayload
  memory: MemoryExperiencePayload
  pronunciation: PronunciationExperiencePayload
  emotional_feedback: EmotionalFeedbackExperiencePayload
}

export type ExperiencePayloadByType<T extends ExperienceType> = ExperiencePayloadMap[T]

export type RuntimeExperienceContract<T extends ExperienceType = ExperienceType> = {
  id: string
  worldId: string
  missionId: string
  sceneId: string
  type: T
  xpReward: number
  difficulty: DifficultyLevel
  duration: number
  aiGenerated: boolean
  adaptiveEnabled: boolean
  emotionalContext: string
  payload: ExperiencePayloadByType<T>
  meta?: {
    legacyQuestionId?: string
    legacyRuntimeSceneId?: string
  }
}

export type RuntimeSceneContract = {
  world: Pick<WorldRecord, 'id' | 'title' | 'slug'>
  mission: Pick<MissionRecord, 'id' | 'title' | 'slug' | 'worldId'>
  scene: Pick<SceneRecord, 'id' | 'title' | 'npc' | 'emotion' | 'environment'>
  experiences: RuntimeExperienceContract[]
  nextSceneId?: string
}

export const buildRuntimeContract = <T extends ExperienceType>(
  experience: ExperienceRecord,
  payload: ExperiencePayloadByType<T>,
  context: {
    worldId: string
    missionId: string
    sceneId: string
  },
): RuntimeExperienceContract<T> => ({
  id: experience.id,
  worldId: context.worldId,
  missionId: context.missionId,
  sceneId: context.sceneId,
  type: experience.type as T,
  xpReward: experience.xpReward,
  difficulty: experience.difficulty,
  duration: experience.duration,
  aiGenerated: experience.aiGenerated,
  adaptiveEnabled: experience.adaptiveEnabled,
  emotionalContext: experience.emotionalContext,
  payload,
  meta: {
    legacyQuestionId: experience.legacyQuestionId,
    legacyRuntimeSceneId: experience.legacyRuntimeSceneId,
  },
})
