import type {
  LessonCatalogItem,
  QuizCatalogItem,
  QuizQuestionItem,
} from '../catalog'
import type { MissionRuntimeAnswerRecord, MissionRuntimeSceneRecord } from '../missionRuntime'
import type { SceneAssetRecord } from '../sceneAssets'
import {
  buildRuntimeContract,
  type EmotionalFeedbackExperiencePayload,
  type ExperiencePayloadMap,
  type MultipleChoiceExperiencePayload,
  type RuntimeSceneContract,
} from './contracts'
import {
  createLearningSlug,
  defaultWorldsCatalog,
  mapSceneAssetCategoryToWorldId,
  sanitizeExperienceRecord,
  sanitizeMissionRecord,
  sanitizeSceneRecord,
  sanitizeWorldRecord,
  type DifficultyLevel,
  type ExperienceRecord,
  type ExperienceType,
  type MissionExperienceBundle,
  type MissionRecord,
  type SceneExperienceBundle,
  type SceneRecord,
  type WorldRecord,
} from './types'

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const includesNormalized = (source: string, query: string) =>
  normalize(source).includes(normalize(query))

const mapLegacyDifficulty = (value: string): DifficultyLevel => {
  if (value === 'Médio') return 'A2'
  return 'A1'
}

const resolveWorldFallbackFromText = (value: string) => {
  const normalized = normalize(value)
  if (normalized.includes('airport')) return 'world-airport-survival'
  if (normalized.includes('coffee')) return 'world-coffee-confidence'
  if (normalized.includes('park')) return 'world-park-reflection'
  if (normalized.includes('hotel')) return 'world-hotel-check-in'
  if (normalized.includes('interview')) return 'world-first-job-interview'
  return 'world-london-streets'
}

export const resolveLegacyWorld = (
  lesson: LessonCatalogItem,
  runtimeScenes: MissionRuntimeSceneRecord[],
  sceneAssets: SceneAssetRecord[],
): WorldRecord => {
  const runtimeMatch =
    runtimeScenes.find((scene) => scene.lessonId === lesson.id) ??
    runtimeScenes.find((scene) => includesNormalized(scene.missionTitle, lesson.missionTitle ?? lesson.title))

  const sceneAssetMatch =
    sceneAssets.find((asset) =>
      runtimeMatch ? includesNormalized(asset.mission, runtimeMatch.missionTitle) : false,
    ) ??
    sceneAssets.find((asset) => includesNormalized(asset.mission, lesson.missionTitle ?? lesson.title))

  const worldId = sceneAssetMatch
    ? mapSceneAssetCategoryToWorldId(sceneAssetMatch.category)
    : resolveWorldFallbackFromText(
        [lesson.title, lesson.missionTitle ?? '', lesson.category, lesson.emotionalContext ?? ''].join(' '),
      )

  return (
    defaultWorldsCatalog.find((world) => world.id === worldId) ??
    defaultWorldsCatalog.find((world) => world.id === 'world-london-streets') ??
    sanitizeWorldRecord(defaultWorldsCatalog[0])
  )
}

export const adaptLessonToMission = (
  lesson: LessonCatalogItem,
  options: {
    worldId: string
    sceneAssetId?: string
    runtimeMode?: MissionRecord['runtimeMode']
  },
): MissionRecord =>
  sanitizeMissionRecord({
    id: `mission-${lesson.id}`,
    worldId: options.worldId,
    title: lesson.missionTitle || lesson.title,
    subtitle: lesson.emotionalContext || lesson.blurb,
    slug: createLearningSlug(lesson.missionTitle || lesson.title, `mission-${lesson.id}`),
    description: lesson.blurb,
    emotionalContext: lesson.emotionalContext || lesson.tensionLabel || '',
    practicalGoal: lesson.practicalGoal || '',
    recommendedLevel: lesson.progress >= 60 ? 'A2' : 'A1',
    progressionOrder: 1,
    status: 'active',
    coverImage:
      lesson.mediaSlots?.heroImageDesktop?.path ||
      lesson.mediaSlots?.thumbnail?.path ||
      lesson.image,
    mobileCoverImage:
      lesson.mediaSlots?.heroImageMobile?.path ||
      lesson.mediaSlots?.thumbnail?.path ||
      lesson.image,
    sceneAssetId: options.sceneAssetId ?? '',
    runtimeMode: options.runtimeMode ?? 'legacy-catalog',
    legacyLessonId: lesson.id,
    legacyMissionTitle: lesson.missionTitle || lesson.title,
  })

export const adaptMissionRuntimeSceneToScene = (
  runtimeScene: MissionRuntimeSceneRecord,
  missionId: string,
): SceneRecord =>
  sanitizeSceneRecord({
    id: `scene-${runtimeScene.id}`,
    missionId,
    title: runtimeScene.title || runtimeScene.question || runtimeScene.character,
    emotion: runtimeScene.emotionalFeedbackTone,
    environment: runtimeScene.missionTitle,
    sceneAssetId: runtimeScene.sceneAssetId,
    npc: runtimeScene.character || runtimeScene.dialogue,
    difficulty: 'A1',
    progressionOrder: runtimeScene.order || runtimeScene.sceneNumber,
    backgroundAudio: runtimeScene.audioUrl,
    tensionLevel: runtimeScene.emotionalFeedbackTone === 'recovery' ? 0.72 : 0.48,
    legacyRuntimeSceneId: runtimeScene.id,
  })

const adaptRuntimeAnswerToChoice = (answer: MissionRuntimeAnswerRecord) => ({
  id: answer.id,
  text: answer.text,
  translation: answer.translation,
  audioUrl: answer.audioUrl,
  isCorrect: answer.isCorrect,
  feedbackTitle: answer.feedbackTitle,
  feedbackBody: answer.feedbackBody,
  xpReward: answer.xpReward,
})

export const adaptMissionRuntimeSceneToExperiences = (
  runtimeScene: MissionRuntimeSceneRecord,
  missionId: string,
): ExperienceRecord[] => {
  const sceneId = `scene-${runtimeScene.id}`

  const promptExperience = sanitizeExperienceRecord({
    id: `experience-${runtimeScene.id}-prompt`,
    sceneId,
    type: 'multiple_choice',
    xpReward: runtimeScene.xpReward,
    difficulty: 'A1',
    duration: 45,
    payload: {
      npc: runtimeScene.character || runtimeScene.dialogue,
      question: runtimeScene.question,
      translation: runtimeScene.questionTranslation,
      answers: runtimeScene.answers.map(adaptRuntimeAnswerToChoice),
      audio: runtimeScene.audioUrl
        ? {
            url: runtimeScene.audioUrl,
          }
        : undefined,
    } satisfies MultipleChoiceExperiencePayload,
    aiGenerated: false,
    adaptiveEnabled: true,
    emotionalContext: runtimeScene.subtitle || runtimeScene.emotionalFeedbackBody,
    progressionOrder: 1,
    legacyRuntimeSceneId: runtimeScene.id,
  })

  const feedbackExperience = sanitizeExperienceRecord({
    id: `experience-${runtimeScene.id}-feedback`,
    sceneId,
    type: 'emotional_feedback',
    xpReward: runtimeScene.xpReward,
    difficulty: 'A1',
    duration: 12,
    payload: {
      companion: runtimeScene.companionImageUrl,
      title: runtimeScene.emotionalFeedbackTitle,
      body: runtimeScene.emotionalFeedbackBody,
      tone: runtimeScene.emotionalFeedbackTone,
      xpReward: runtimeScene.xpReward,
    } satisfies EmotionalFeedbackExperiencePayload,
    aiGenerated: false,
    adaptiveEnabled: true,
    emotionalContext: runtimeScene.emotionalFeedbackBody,
    progressionOrder: 2,
    legacyRuntimeSceneId: runtimeScene.id,
  })

  void missionId
  return [promptExperience, feedbackExperience]
}

const mapQuestionKindToExperienceType = (question: QuizQuestionItem): ExperienceType => {
  if (question.kind === 'listening') return 'listening'
  if (question.kind === 'speaking') return 'speaking'
  if (question.kind === 'ordering' || question.kind === 'drag-fill') return 'dragdrop'
  return 'multiple_choice'
}

const buildQuestionPayload = (
  question: QuizQuestionItem,
  quiz?: QuizCatalogItem,
): ExperiencePayloadMap[ExperienceType] => {
  const type = mapQuestionKindToExperienceType(question)

  if (type === 'listening') {
    return {
      npc: question.kicker || quiz?.storyBeat || '',
      prompt: question.prompt,
      translation: question.contextCue || '',
      audio: {
        url: '',
      },
      answers: (question.options ?? []).map((option, index) => ({
        id: `${question.id}-answer-${index + 1}`,
        text: option,
        isCorrect: option === question.correct,
      })),
    }
  }

  if (type === 'speaking') {
    return {
      npc: question.kicker,
      prompt: question.prompt,
      translation: question.explanation,
      expectedPhrases: question.solution?.length ? question.solution : question.correct ? [question.correct] : [],
    }
  }

  if (type === 'dragdrop') {
    return {
      prompt: question.prompt,
      translation: question.explanation,
      tokens: question.scrambled?.length ? question.scrambled : question.options ?? [],
      solution:
        question.solution?.length
          ? question.solution
          : [question.sentenceBefore, question.correct, question.sentenceAfter].filter(
              (item): item is string => typeof item === 'string' && item.length > 0,
            ),
    }
  }

  return {
    npc: question.kicker || quiz?.storyBeat || '',
    question: question.prompt,
    translation: question.explanation,
    answers: (question.options ?? []).map((option, index) => ({
      id: `${question.id}-answer-${index + 1}`,
      text: option,
      isCorrect: option === question.correct,
    })),
  }
}

export const adaptQuizQuestionToExperience = (
  question: QuizQuestionItem,
  context: {
    sceneId: string
    runtimeSceneId?: string
    quiz?: QuizCatalogItem
    emotionalContext?: string
  },
): ExperienceRecord =>
  sanitizeExperienceRecord({
    id: `experience-${question.id}`,
    sceneId: context.sceneId,
    type: mapQuestionKindToExperienceType(question),
    xpReward: question.reward,
    difficulty: mapLegacyDifficulty(question.difficulty),
    duration: question.kind === 'speaking' ? 30 : 20,
    payload: buildQuestionPayload(question, context.quiz),
    aiGenerated: false,
    adaptiveEnabled: true,
    emotionalContext: context.emotionalContext || question.contextCue || question.explanation,
    progressionOrder: 1,
    legacyQuestionId: question.id,
    legacyRuntimeSceneId: context.runtimeSceneId,
  })

const buildFallbackSceneFromQuiz = (
  lesson: LessonCatalogItem,
  quiz: QuizCatalogItem,
  missionId: string,
): SceneRecord =>
  sanitizeSceneRecord({
    id: `scene-${quiz.id}`,
    missionId,
    title: quiz.title,
    emotion: lesson.emotionalGoal || lesson.emotionalContext || '',
    environment: lesson.missionTitle || lesson.title,
    sceneAssetId: '',
    npc: quiz.storyBeat || lesson.missionTitle || lesson.title,
    difficulty: mapLegacyDifficulty(quiz.difficulty),
    progressionOrder: quiz.order,
    backgroundAudio: '',
    tensionLevel: quiz.difficulty === 'Médio' ? 0.66 : 0.42,
  })

export const buildLegacyMissionBundle = (params: {
  lesson: LessonCatalogItem
  quizzes: QuizCatalogItem[]
  questions: QuizQuestionItem[]
  runtimeScenes: MissionRuntimeSceneRecord[]
  sceneAssets: SceneAssetRecord[]
}): MissionExperienceBundle => {
  const world = resolveLegacyWorld(params.lesson, params.runtimeScenes, params.sceneAssets)

  const matchingSceneAsset =
    params.sceneAssets.find((asset) =>
      includesNormalized(asset.mission, params.lesson.missionTitle ?? params.lesson.title),
    ) ?? null

  const matchingRuntimeScenes = params.runtimeScenes
    .filter(
      (scene) =>
        scene.lessonId === params.lesson.id ||
        includesNormalized(scene.missionTitle, params.lesson.missionTitle ?? params.lesson.title),
    )
    .sort((a, b) => a.order - b.order || a.sceneNumber - b.sceneNumber)

  const mission = adaptLessonToMission(params.lesson, {
    worldId: world.id,
    sceneAssetId: matchingSceneAsset?.id,
    runtimeMode: matchingRuntimeScenes.length ? 'runtime-scenes' : 'legacy-catalog',
  })

  const runtimeBundles: SceneExperienceBundle[] = matchingRuntimeScenes.map((runtimeScene) => {
    const scene = adaptMissionRuntimeSceneToScene(runtimeScene, mission.id)
    const experiences = adaptMissionRuntimeSceneToExperiences(runtimeScene, mission.id)
    return {
      scene,
      experiences,
    }
  })

  if (runtimeBundles.length) {
    return {
      world,
      mission,
      scenes: runtimeBundles,
    }
  }

  const fallbackScenes = params.quizzes
    .filter((quiz) => quiz.lessonId === params.lesson.id && quiz.active)
    .sort((a, b) => a.order - b.order)
    .map((quiz) => {
      const scene = buildFallbackSceneFromQuiz(params.lesson, quiz, mission.id)
      const experiences = params.questions
        .filter((question) => question.quizId === quiz.id && question.active)
        .map((question) =>
          adaptQuizQuestionToExperience(question, {
            sceneId: scene.id,
            quiz,
            emotionalContext: params.lesson.emotionalContext,
          }),
        )

      return {
        scene,
        experiences,
      }
    })

  return {
    world,
    mission,
    scenes: fallbackScenes,
  }
}

export const buildLegacyWorldGraph = (params: {
  lessons: LessonCatalogItem[]
  quizzes: QuizCatalogItem[]
  questions: QuizQuestionItem[]
  runtimeScenes: MissionRuntimeSceneRecord[]
  sceneAssets: SceneAssetRecord[]
}): MissionExperienceBundle[] =>
  params.lessons.map((lesson) =>
    buildLegacyMissionBundle({
      lesson,
      quizzes: params.quizzes,
      questions: params.questions,
      runtimeScenes: params.runtimeScenes,
      sceneAssets: params.sceneAssets,
    }),
  )

export const buildRuntimeSceneContracts = (
  bundle: MissionExperienceBundle,
): RuntimeSceneContract[] =>
  bundle.scenes.map(({ scene, experiences }, index) => ({
    world: {
      id: bundle.world.id,
      title: bundle.world.title,
      slug: bundle.world.slug,
    },
    mission: {
      id: bundle.mission.id,
      title: bundle.mission.title,
      slug: bundle.mission.slug,
      worldId: bundle.mission.worldId,
    },
    scene: {
      id: scene.id,
      title: scene.title,
      npc: scene.npc,
      emotion: scene.emotion,
      environment: scene.environment,
    },
    experiences: experiences.map((experience) =>
      buildRuntimeContract(experience, experience.payload as never, {
        worldId: bundle.world.id,
        missionId: bundle.mission.id,
        sceneId: scene.id,
      }),
    ),
    nextSceneId: bundle.scenes[index + 1]?.scene.id,
  }))
