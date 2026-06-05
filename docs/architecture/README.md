# SparkLingo Learning Architecture

This folder defines the forward-looking content model for SparkLingo without breaking the current product.

## Target hierarchy

```txt
Worlds
 └─ Missions
      └─ Scenes
           └─ Experiences
```

## Why this exists

The current product still stores most learning content as:

- `lessons`
- `quizzes`
- `quizQuestions`
- `missionRuntimeScenes`

That legacy structure remains valid and continues to power the existing UI.

The new architecture adds a cleaner semantic layer:

- `Worlds` describe the emotional and cinematic macro-journey.
- `Missions` describe playable narrative arcs within a world.
- `Scenes` describe specific cinematic moments.
- `Experiences` describe renderable interactions.

## Backward compatibility

Nothing in the current system is removed.

Instead, the new architecture is introduced via adapters:

- `LessonCatalogItem -> MissionRecord`
- `MissionRuntimeSceneRecord -> SceneRecord`
- `QuizQuestionItem -> ExperienceRecord`

That lets the existing catalog and runtime keep working while the platform slowly migrates toward native worlds, scenes and experiences.

## Entity overview

### Worlds

Worlds are macro-contexts such as:

- Airport Survival
- Coffee Confidence
- Park Reflection
- London Streets
- First Job Interview
- Hotel Check-In

Worlds own:

- cinematic tone
- emotional tone
- progression fantasy
- soundtrack identity
- cover assets
- XP multiplier

### Missions

Missions belong to a `worldId`.

Missions are still compatible with legacy lessons through:

- `legacyLessonId`
- `legacyMissionTitle`

### Scenes

Scenes represent cinematic story moments such as:

- Immigration Officer
- Ordering Coffee
- Asking Directions
- Boarding Gate

Scenes can be created natively in the future or adapted from `missionRuntimeScenes`.

### Experiences

Experiences are the renderable interaction unit.

The frontend should eventually care only about:

- `type`
- `payload`
- runtime metadata

The frontend should not need to understand:

- grammar strategy
- AI orchestration
- pedagogical generation internals

## Runtime contract direction

The universal runtime contract lives in:

- [src/services/learning/contracts.ts](../../src/services/learning/contracts.ts)

It standardizes a scene into:

- world
- mission
- scene
- experiences[]

Each experience uses a typed payload per experience type.

## Current implementation files

- [src/services/learning/types.ts](../../src/services/learning/types.ts)
- [src/services/learning/contracts.ts](../../src/services/learning/contracts.ts)
- [src/services/learning/adapters.ts](../../src/services/learning/adapters.ts)

## Future AI generation flow

The planned future flow is:

```txt
World template / progression strategy
  -> Mission generation
  -> Scene generation
  -> Experience JSON generation
  -> Frontend runtime render
```

AI generation should output contracts that conform to the `Experience` runtime schema.

The UI should only render those contracts.

## Migration strategy

1. Keep current UI on legacy data.
2. Normalize legacy data through adapters.
3. Introduce native `worlds`, `scenes`, `experiences` collections gradually.
4. Move runtime screens to consume `RuntimeSceneContract`.
5. Retire direct dependence on legacy `quiz/question` semantics only when all content has migrated.
