# SparkLingo Product Roadmap

## Purpose

This document is the official product roadmap for SparkLingo.

Its purpose is to separate:

- bugs that must be fixed immediately
- UX improvements that belong to the next sprint
- architecture work that supports a concrete feature
- long-term product vision that should not be rushed into the current sprint

SparkLingo should not evolve through isolated prompts. It should evolve through a clear product backlog.

---

## Working Model

Manoel acts as the Product Vision owner.

Codex acts as the Tech Lead and implementation partner.

The collaboration rule is:

> Product vision can be broad. Sprint execution must be narrow.

Every new idea should be classified before implementation:

- `Bug`
- `UX Polish`
- `Product Feature`
- `Architecture`
- `Future Vision`

This prevents mixing immediate fixes with long-term ideas in the same development cycle.

---

## Product Principle

SparkLingo is not an LMS, quiz dashboard, or course admin system.

SparkLingo is a cinematic learning journey where the student feels they are inside a story while learning English.

The product should optimize for:

- emotional confidence
- narrative immersion
- practical real-world English
- cinematic pacing
- AI-assisted content creation
- low-friction editorial workflow

---

## Current Strategic Focus

The core infrastructure is now strong enough.

The next phase should prioritize product value over more generic architecture.

Rule:

> No new infrastructure should be introduced unless it supports a concrete product feature.

Recommended allocation:

- 80% product experience and editor workflow
- 20% infrastructure improvements required by those features

---

# Official Backlog

## Epic 1 — Runtime Experience

Goal:
Make the student runtime feel consistent, cinematic, readable, and pedagogically clear.

### Next Sprint

- Fix Home vs Runtime scene count inconsistency.
- Make the question prompt more horizontal and easier to read.
- Simplify XP rules:
  - correct answer receives scene/question XP
  - wrong answer receives 0 XP
  - no per-answer XP unless a future adaptive system requires it

### Later

- Improve runtime support for varied interaction types.
- Refine mobile-first runtime pacing.
- Add stronger emotional state transitions.

Status: `Next Sprint`

---

## Epic 2 — Mission Runtime Admin

Goal:
Make the admin easier to operate without turning it into a generic CMS.

### Planned

- Add view toggle:
  - list
  - 2-column grid
  - 4-column grid
- Review the separation between `Mission Runtime` and `Scene Assets`.
- Move visual/media configuration toward `Scene Assets`.
- Keep `Mission Runtime` focused on pedagogy and interaction.
- Deprecate old media fields safely instead of deleting them abruptly.

### Proposed Ownership

`Scene Assets` should own:

- background desktop/mobile
- focal point
- crop/scale/position
- overlay intensity
- brightness/blur
- safe areas
- visual scene composition

`Mission Runtime` should own:

- prompt/question
- answer choices
- correct answer
- skill
- grammar target
- XP reward
- timer
- interaction type
- scene order/progression

Status: `Planned`

---

## Epic 3 — AI Mission Studio

Goal:
Transform AI Mission Studio from a form-based generator into an editorial assistant.

### Current State

AI Mission Studio can generate a draft, validate schema, preview with the real runtime, approve, save, publish, and track generation metadata.

This validates the first editorial loop:

```txt
Brief
  -> AI draft
  -> Runtime preview
  -> Approve & save
  -> Publish
  -> Student runtime
```

### Next Product Direction

Evolve AI Mission Studio into a guided creation experience.

The desired experience is not:

```txt
Editor fills a long form.
```

It is:

```txt
Mission Director guides the editor through mission creation.
```

Status: `Planned`

---

## Epic 4 — Mission Director

Goal:
Create a conversational AI assistant that helps the editor design missions pedagogically and emotionally.

This is the long-term evolution of AI Mission Studio.

### Concept

Mission Director should behave like a specialized pedagogical director for cinematic English learning.

It should ask questions such as:

- What real-world situation do you want to teach?
- What is the student level?
- What grammar target should be reinforced?
- Which skills should be practiced?
- How many scenes should this mission contain?
- What emotional tone should the mission have?
- Which interaction types are allowed?
- Should we review the mission brief before generating?

### Target Flow

```txt
Editor describes the learning goal
  -> Mission Director asks structured questions
  -> Mission Director proposes a mission brief
  -> Editor approves or adjusts the brief
  -> AI generates scenes
  -> Runtime preview validates the experience
  -> Editor publishes
```

### Why This Matters

Most AI content tools are forms with a generate button.

SparkLingo should feel like working with a creative and pedagogical partner.

This is a product differentiator.

Status: `Future Vision`

---

## Epic 5 — Runtime Interaction Types

Goal:
Support varied learning interactions without losing cinematic immersion.

Potential interaction types:

- multiple choice
- speaking
- complete sentence
- order words
- drag words
- matching
- true or false
- multiple select
- fill blanks
- listen and answer
- dialogue
- narrative decision
- logical sequence
- image-to-phrase association
- roleplay

Important:

AI should not generate an interaction type until the runtime can render it properly.

Status: `Blocked by Runtime Engine`

---

## Epic 6 — AI Providers

Goal:
Use real AI providers only when the product flow requires them.

Planned providers:

- OpenRouter for content generation
- Azure Speech for pronunciation assessment
- future AI providers through the provider abstraction layer

Priority rule:

> Real providers improve quality, but publishing flow creates product value.

Status: `Blocked by Product Flow Validation`

---

# Immediate Execution Plan

## Sprint 1 — Runtime Consistency

Scope:

- Fix Home vs Runtime scene count.
- Improve question prompt horizontal layout.
- Simplify XP rule.

Do not include:

- new AI workflows
- new interaction types
- major admin restructuring
- provider integrations

Success criteria:

- Home and Runtime show the same scene total.
- Long questions remain readable and cinematic.
- Wrong answers no longer add XP.
- Correct answers use the scene/question XP.

---

## Sprint 2 — Admin Organization

Scope:

- Add Mission Runtime view toggle.
- Deprecate misplaced media fields from Runtime UI.
- Clarify Scene Assets vs Runtime ownership.
- Keep backward compatibility with existing documents.

Success criteria:

- Editor can browse runtime scenes more comfortably.
- Runtime editor feels pedagogical, not media-heavy.
- Scene Assets becomes the clear home for visual composition.

---

## Sprint 3 — Mission Brief Assistant

Scope:

- Add a guided briefing layer inside AI Mission Studio.
- Keep generation to one scene initially.
- Do not generate full missions yet.

Success criteria:

- Editor writes less.
- AI asks useful questions.
- Generated scene better respects level, skill, grammar target, and learning intent.

---

# Decision Rules

## When to Implement Now

Implement now if the item:

- fixes a visible bug
- improves the currently used student runtime
- makes editorial publishing more reliable
- reduces confusion without changing architecture

## When to Put in Roadmap

Put in roadmap if the item:

- requires new runtime interaction contracts
- changes content hierarchy
- introduces a new AI workflow
- requires broad admin restructuring
- depends on future provider integrations

## When to Reject or Delay

Delay if the item:

- adds infrastructure without a user-facing feature
- makes the CMS heavier
- risks breaking the cinematic runtime
- introduces generic LMS behavior

---

# Product North Star

For students:

> "I feel like I am living a real English situation, not completing an exercise."

For editors:

> "I feel like I am working with a pedagogical director, not filling a CMS form."

For the product:

> "Every technical system should disappear behind emotion, confidence, and story."

