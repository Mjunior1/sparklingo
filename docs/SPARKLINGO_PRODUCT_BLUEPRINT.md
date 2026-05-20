# 🟣 SparkLingo — Product Blueprint

## Vision
SparkLingo is not just an English learning platform.
It is a gamified emotional learning experience focused on retention, immersion, micro-progress, dopamine-balanced engagement and AI-assisted educational creation.

The product should feel:
- alive
- premium
- playful
- emotionally rewarding
- modern
- highly visual
- mobile-first

The goal is:
"I will study for 5 minutes"
→ user stays 30+ minutes.

---

# Core Product Pillars

## 1. Emotional Learning
- instant feedback
- celebration moments
- micro-victories
- character companionship
- visual progression

## 2. Gameplay First
Learning should feel like:
- mini games
- quests
- adventures
- progression systems

NOT:
- forms
- EAD platform
- traditional LMS

## 3. AI Assisted Creation
Admins should curate content.
AI should generate:
- lessons
- quizzes
- questions
- variations
- learning paths

## 4. Retention Engine
- streaks
- XP
- combo systems
- daily quests
- achievements
- progression loops
- social features

---

# Product Layers (Roadmap)

# PHASE 0 — Identity & Experience
Status: IN PROGRESS

## Goals
- premium UI
- game feel
- emotional feedback
- interactive exercises
- visual identity
- animated interface

## Deliverables
- Spark mascot
- dashboard journey
- animated cards
- drag/drop interactions
- XP system visuals
- responsive UI
- microinteractions

---

# PHASE 1 — Foundation
Status: NEXT

## Tech Stack
Frontend:
- React
- Vite
- TailwindCSS
- Framer Motion

Backend:
- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Functions
- Firebase Hosting

## Authentication
- Google Login
- Apple Login (future)
- Discord Login (future)

## User Structure
```json
{
  "uid": "",
  "name": "",
  "email": "",
  "photoURL": "",
  "provider": "google",
  "level": "beginner",
  "xp": 0,
  "streak": 0,
  "hearts": 5,
  "createdAt": "",
  "lastLogin": ""
}
```

---

# PHASE 2 — CMS / Admin Refactor
Status: PRIORITY

## Problem
Current admin is:
- too vertical
- too form-heavy
- not scalable
- cognitively exhausting

## Goal
Transform admin into:
- modular CMS
- creative tool
- scalable content engine

## Admin Sidebar
- Dashboard
- Lessons
- Quizzes
- Questions
- Achievements
- Media Library
- Users
- Analytics
- AI Assistant
- Settings

## Architecture
LESSON
└── QUIZZES
    └── QUESTIONS

## IDs
Lessons:
- LS-001

Quizzes:
- QZ-001

Questions:
- QT-MC-001
- QT-DD-001
- QT-LS-001

## UX Rules
- avoid giant forms
- use drawers/modals
- searchable tables
- filters
- preview before publish
- compact operation flow

---

# PHASE 3 — Gameplay Systems

## Systems
- XP persistence
- streak persistence
- achievements
- combo system
- daily missions
- progression map
- hearts/lives system
- level progression

## Feedback
Correct answer:
- bounce animation
- XP particles
- progress animation
- glow
- sound feedback

Wrong answer:
- friendly shake
- emotional support
- quick explanation

---

# PHASE 4 — AI Layer

## Vision
AI is NOT a chatbot.
AI is a pedagogical co-pilot.

## AI Responsibilities
- generate lessons
- generate quizzes
- generate questions
- generate variations
- generate learning paths
- adapt difficulty
- avoid repetition

## Human Responsibilities
- review
- validate
- publish

## AI Flow
AI generates
→ preview screen
→ admin reviews
→ optional edit
→ manual save

## AI Assistant
"Spark AI"

Examples:
- Create 5 beginner quizzes about beach vocabulary.
- Generate listening exercises for airport English.
- Build a complete intermediate work English path.

## AI Rules
- contextual generation
- pedagogical coherence
- structural diversity
- memory/context awareness
- avoid repetitive questions
- adapt by difficulty level

---

# PHASE 5 — Speaking & Pronunciation

## Features
- speech recognition
- pronunciation scoring
- repeat-after-me mode
- AI speaking evaluation
- live speaking quests
- pronunciation heatmap

## Beginner Flow
- visual word
- hear pronunciation
- repeat
- receive score
- retry if needed

---

# PHASE 6 — Social Layer

## Features
- rankings
- friends
- clans
- social streaks
- weekly challenges
- multiplayer missions
- XP races

---

# PHASE 7 — Analytics & Intelligence

## Student Analytics
- weak skills
- retention metrics
- completion rates
- speaking evolution
- learning velocity

## AI Analytics
AI should identify:
- difficult lessons
- repetitive mistakes
- weak grammar areas
- suggested reinforcements

---

# Frontend Principles

## UI Philosophy
- premium
- soft
- emotional
- modern
- animated
- clean
- game-inspired

## Avoid
- enterprise feel
- ERP feeling
- excessive forms
- visual pollution

## Inspirations
- Duolingo
- Monument Valley
- Nintendo polish
- Headspace
- Superhuman
- modern mobile games

---

# Backend Architecture

## Firestore Collections
- users
- lessons
- quizzes
- questions
- achievements
- missions
- streaks
- progress
- analytics
- ai_generations
- media

---

# Retention Engine

## Core Retention Mechanics
- streak system
- daily quests
- XP loops
- progression bars
- rewards
- surprise unlocks
- mascot reactions
- visual evolution

---

# Monetization Ideas

## Free Tier
- limited hearts
- limited AI
- limited speaking

## Premium
- unlimited speaking
- advanced AI tutor
- premium lessons
- advanced analytics
- social features

## Family Plan
- family leaderboard
- shared challenges
- kids mode

---

# Future Ideas

## Future Features
- AI-generated stories
- AI roleplay conversations
- AR pronunciation mode
- Voice adventure mode
- Interactive worlds
- Dynamic difficulty adaptation
- AI emotional companion

---

# Prompt Library

## ADMIN REFACTOR PROMPT
Use the dedicated admin modularization prompt.

## AI LAYER PROMPT
Use the dedicated AI generation prompt.

## GAME FEEL PROMPT
Use the motion/gamefeel enhancement prompt.

---

# Technical Decisions

## Rules
- AI never auto-saves.
- Human validation is mandatory.
- Quiz belongs to a lesson.
- Questions belong to quizzes.
- Mobile-first architecture.
- Motion is part of UX.
- Gameplay > dashboard.
- Emotional retention > information density.

---

# Final Product Goal

SparkLingo should feel like:
- a premium game
- an emotional learning companion
- an AI-powered education engine
- a scalable startup-level product

NOT:
- a traditional LMS
- a static course platform
- a quiz generator.
