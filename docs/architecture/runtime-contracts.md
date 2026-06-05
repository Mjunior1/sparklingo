# Runtime Contracts

This document defines the universal contract that the frontend should eventually render.

## Principle

The frontend renders experiences.

It should not need to know:

- quiz internals
- question database shapes
- grammar rules
- AI prompt logic

## Scene contract

```json
{
  "world": {
    "id": "world-airport-survival",
    "title": "Airport Survival",
    "slug": "airport-survival"
  },
  "mission": {
    "id": "mission-lesson-airport",
    "title": "Airport Arrival",
    "slug": "airport-arrival",
    "worldId": "world-airport-survival"
  },
  "scene": {
    "id": "scene-RT-00001",
    "title": "Airport Arrival",
    "npc": "IMMIGRATION OFFICER",
    "emotion": "recovery",
    "environment": "Airport Arrival"
  },
  "experiences": []
}
```

## Multiple choice experience

```json
{
  "id": "experience-RT-00001-prompt",
  "worldId": "world-airport-survival",
  "missionId": "mission-lesson-airport",
  "sceneId": "scene-RT-00001",
  "type": "multiple_choice",
  "xpReward": 25,
  "difficulty": "A1",
  "duration": 45,
  "aiGenerated": false,
  "adaptiveEnabled": true,
  "emotionalContext": "You just landed. The airport feels bigger than expected.",
  "payload": {
    "npc": "IMMIGRATION OFFICER",
    "question": "What's the purpose of your trip?",
    "translation": "Qual é o propósito da sua viagem?",
    "answers": [
      {
        "id": "airport-a1",
        "text": "I'm here for tourism.",
        "translation": "Estou aqui para turismo.",
        "isCorrect": false
      },
      {
        "id": "airport-a3",
        "text": "I'm here on vacation.",
        "translation": "Estou aqui de férias.",
        "isCorrect": true
      }
    ]
  }
}
```

## Emotional feedback experience

```json
{
  "id": "experience-RT-00001-feedback",
  "worldId": "world-airport-survival",
  "missionId": "mission-lesson-airport",
  "sceneId": "scene-RT-00001",
  "type": "emotional_feedback",
  "xpReward": 25,
  "difficulty": "A1",
  "duration": 12,
  "aiGenerated": false,
  "adaptiveEnabled": true,
  "emotionalContext": "Tente usar uma frase mais completa. Você conseguiu!",
  "payload": {
    "companion": "/Images/Mascote/Sparklingo.png",
    "title": "Boa tentativa!",
    "body": "Tente usar uma frase mais completa. Você conseguiu!",
    "tone": "recovery",
    "xpReward": 25
  }
}
```

## Experience types

Supported architectural types:

- `multiple_choice`
- `listening`
- `speaking`
- `dragdrop`
- `repeat`
- `memory`
- `pronunciation`
- `emotional_feedback`

## Legacy adapter strategy

Current adapters build these contracts from:

- `missionRuntimeScenes`
- `quizQuestions`
- `quizzes`
- `lessons`

This keeps the present product working while enabling a future engine that is fully scene-driven and experience-driven.
