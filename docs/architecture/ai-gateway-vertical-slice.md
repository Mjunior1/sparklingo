# AI Gateway Vertical Slice

This slice validates the first end-to-end AI flow used by the Admin AI Mission Studio.

## Flow

```txt
AI Mission Studio Admin
  -> Firebase Callable Function: generateMissionStudioDraft
  -> AI Gateway: generateAIText()
  -> Provider Registry
  -> OpenRouterAIProvider
  -> generated draft JSON
  -> Runtime Preview
  -> Save Draft
  -> Publish
  -> Student Runtime consumes published scenes only
```

## Current Provider

`OpenRouterAIProvider` is the primary provider for Mission Studio.

`MockAIProvider` remains available as a development fallback and should not be treated as production generation.

The Firebase Functions secret `OPENROUTER_API_KEY` is required for real generation.

## Function

Callable export:

```txt
generateMissionStudioDraft
```

Responsibilities:

- Requires an authenticated Firebase user.
- Receives the Mission Studio brief from the Admin.
- Calls the AI Gateway using `provider: "openrouter"`.
- Maps generated JSON into a Mission Runtime compatible draft.
- Returns quality metrics and schema validation status.

## Editorial Publishing Loop

Mission Runtime scenes now have an explicit editorial status:

- `draft`: saved in the CMS, visible to editors, hidden from the student journey.
- `published`: available to Home, Adventure, and Mission Runtime.
- `archived`: retained for history, hidden from the student journey.

AI Mission Studio always creates `draft` scenes first. Editors can preview with the real `MissionRuntime`, save the draft, publish it, archive it, or delete it from the Mission Runtime list.

Existing legacy scenes without editorial history are normalized as `published` for backwards compatibility.

## Metadata And Provenance

Generated scenes include minimal generation metadata:

- `source`
- `generation.provider`
- `generation.model`
- `generation.promptVersion`
- `generation.generatedAt`

Scenes also keep a lightweight provenance trail:

- `created`
- `edited`
- `published`
- `archived`

This is intentionally not a full versioning system yet. It is enough to validate the editorial loop and to know how a scene entered production.

## Gateway Responsibilities

`functions/src/ai/gateway/aiGateway.ts` owns:

- request validation
- provider selection
- latency measurement
- normalized response
- success/error telemetry

## OpenRouter Configuration

Configure the provider secret before deploying Functions:

```bash
firebase functions:secrets:set OPENROUTER_API_KEY --project sparklingo-d59aa
firebase deploy --only functions --project sparklingo-d59aa
```

The Admin and Mission Studio continue calling `generateMissionStudioDraft`; provider details stay server-side.

## Why This Exists

This intentionally avoids building a generic AI platform before product use. The architecture is validated by a concrete feature first: Mission Studio draft generation.
