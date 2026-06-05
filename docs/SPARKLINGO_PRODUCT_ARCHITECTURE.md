# SparkLingo — Product Architecture & Vision

## Core Vision

SparkLingo is NOT a traditional English course platform.

It is:
- cinematic
- emotional
- adaptive
- AI-driven
- progression-based
- narrative-first

The goal is to make the student FEEL they are living an adventure while unconsciously learning English.

The experience should feel like:
- Duolingo + Pixar + RPG progression
- emotional storytelling
- immersive missions
- adaptive AI coach
- conversational confidence simulator

---

# IMPORTANT PRINCIPLE

## SparkLingo is NOT:
- a list of lessons
- a grammar dashboard
- a quiz management system

## SparkLingo IS:
- a world-based learning journey
- a mission engine
- a cinematic educational experience
- an AI-generated adaptive language universe

---

# Current Problem Identified

The current architecture is becoming:

- too CMS-heavy
- too table-oriented
- too fragmented
- too focused on quizzes/questions

This creates the risk of:
- losing immersion
- becoming a traditional LMS
- overwhelming content management
- breaking frontend consistency

---

# Strategic Direction

## DO NOT REBUILD EVERYTHING

The current frontend is already:
- beautiful
- cinematic
- emotionally immersive
- high quality

The strategy is:

# EVOLVE AROUND THE CURRENT FRONTEND

NOT rewrite it.

---

# Core Hierarchy (NEW)

```txt
WORLD
 └─ MISSION
      └─ SCENE
            └─ EXPERIENCES
                   ├─ speaking
                   ├─ listening
                   ├─ dragdrop
                   ├─ quiz
                   ├─ emotional_feedback
                   └─ checkpoints
```

---

# Explanation of Each Layer

## WORLD

Represents the universe/theme.

Examples:
- Airport Survival
- Coffee Shop Confidence
- London Streets
- First Job Interview
- Hotel Check-In
- Travel Emergency

The WORLD defines:
- emotional atmosphere
- visual identity
- soundtrack style
- narrative tension
- progression fantasy

---

## MISSION

Represents a playable learning journey.

Example:

WORLD: Airport Survival
MISSION: You missed your flight in London

The mission contains:
- scenes
- emotional progression
- objectives
- grammar goals
- vocabulary goals
- XP structure

---

## SCENE

Represents a cinematic moment.

Examples:
- Immigration officer asks a question
- Looking for departure gate
- Asking for help
- Buying coffee at airport

A scene is:
- visual
- emotional
- contextual
- short
- interactive

---

## EXPERIENCES

Experiences are:
- micro-interactions
- learning moments
- challenges
- adaptive exercises

Examples:
- speaking challenge
- repeat phrase
- choose answer
- emotional correction
- listening reaction
- drag and drop
- pronunciation retry

---

# CRITICAL PRODUCT DECISION

## Scene Assets are NOT the product.

They are only:
- visual backgrounds
- cinematic environments
- emotional visual support

Scene Assets should become:

# A VISUAL LIBRARY

NOT the core structure.

---

# Mission Runtime

Mission Runtime is GOOD.

It should become:
- the orchestration engine
- progression controller
- emotional flow system
- interaction runtime

Mission Runtime controls:
- dialogues
- scene order
- XP
- emotional feedback
- branching
- transitions

---

# Lessons / Quizzes / Questions

IMPORTANT:

These should gradually STOP being top-level entities.

Because the student should never feel:
- "I'm taking a grammar test"
- "I'm doing a quiz"
- "I'm answering a question"

Instead:
- "I'm surviving at the airport"
- "I'm talking to someone"
- "I'm solving a problem"
- "I'm progressing in a journey"

Lessons, quizzes and questions should become:

# EXPERIENCE TYPES

inside runtime.

---

# Future Admin Architecture

The admin should eventually become:

## WORLDS
Create emotional universes.

## MISSIONS
Create adventures inside worlds.

## AI EXPERIENCE GENERATOR

Inputs:

```txt
Level: A1
Theme: Airport
Grammar: Present Simple
Skill: Speaking
Emotion: Light Anxiety
Scenes: 5
```

The AI generates:
- scenes
- dialogues
- quizzes
- interactions
- speaking prompts
- emotional feedback
- checkpoints
- XP rewards
- progression

---

# IMPORTANT AI STRATEGY

## DO NOT generate everything live during runtime.

That would create:
- latency
- instability
- high costs
- inconsistent pedagogy
- frontend unpredictability

---

# Correct AI Strategy

## HYBRID GENERATION

Flow:

1. AI generates structured draft JSON
2. Save validated structured experience
3. Frontend renders static validated JSON
4. Runtime AI handles:
   - emotional feedback
   - pronunciation correction
   - adaptive encouragement
   - dynamic hints
   - conversation reactions

---

# Frontend Protection Strategy

The frontend MUST remain decoupled from pedagogy.

The frontend should ONLY render structured data.

Example:

```json
{
  "type": "multiple_choice",
  "npc": "Immigration Officer",
  "question": "What's the purpose of your trip?",
  "answers": [
    "I'm here for tourism.",
    "I'm here to study English.",
    "I'm here on vacation."
  ]
}
```

This allows:
- AI-generated content
- stable frontend
- reusable components
- scalability
- multi-provider AI

---

# OpenRouter Strategy

OpenRouter SHOULD be used.

Recommended models:

## Fast generation
- DeepSeek
- Gemini Flash
- Qwen

## Premium generation
- Claude Sonnet
- GPT-4.1

---

# IMPORTANT DEVELOPMENT STRATEGY

NEVER ask Codex to:

```txt
Refactor everything.
```

Instead:

# EVOLVE IN PHASES

---

# PHASE 1 — CURRENT MOMENT

Goal:
- preserve frontend
- preserve immersion
- preserve runtime visuals
- create schemas
- create adapters
- create hierarchy

WITHOUT changing current UI.

---

# PHASE 2 — AI EXPERIENCE GENERATOR

Create:
- structured AI generation
- mission JSON generation
- world-based generation

Still without changing frontend visuals.

---

# PHASE 3 — EXPERIENCE UNIFICATION

Gradually migrate:
- lessons
- quizzes
- questions

into:

# Experiences

inside runtime.

---

# PRODUCT NORTH STAR

The student should feel:

"I'm living an adventure in English."

NOT:

"I'm studying grammar."

Grammar becomes:
- invisible
- contextual
- emotional
- narrative-driven

---

# Final Strategic Reminder

LESS CMS.
MORE SYSTEM.

LESS TABLES.
MORE EXPERIENCES.

LESS MANUAL CONTENT.
MORE AI-GENERATED WORLDS.

LESS LESSON FEELING.
MORE ADVENTURE FEELING.

---

# Current Status

The project IS on the right path.

The visual quality and immersion level are already significantly above most educational products.

The next challenge is:

# organizing the architecture before scaling content.
