# AI Gateway Vertical Slice

This slice validates the first end-to-end AI flow without integrating a paid or external provider yet.

## Flow

```txt
AI Mission Studio Admin
  -> Firebase Callable Function: generateMissionStudioDraft
  -> AI Gateway: generateAIText()
  -> Provider Registry
  -> MockAIProvider
  -> normalized draft response
  -> Runtime Preview
  -> Save Draft
  -> Publish
  -> Student Runtime consumes published scenes only
```

## Current Provider

Only `MockAIProvider` is enabled.

It returns deterministic JSON through the same gateway contract that OpenRouter or another model provider will use later.

No API tokens are required for this slice.

## Function

Callable export:

```txt
generateMissionStudioDraft
```

Responsibilities:

- Requires an authenticated Firebase user.
- Receives the Mission Studio brief from the Admin.
- Calls the AI Gateway using `provider: "mock"`.
- Builds a Mission Runtime compatible draft.
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

## Provider Replacement Path

To add OpenRouter later:

1. Add `openRouterAiProvider.ts` implementing `MissionAIProvider`.
2. Register it in `providerRegistry.ts`.
3. Add the provider name to `AIGatewayProviderName`.
4. Read `OPENROUTER_API_KEY` from Firebase Secrets inside the real provider or its function wrapper.
5. Keep the frontend unchanged.

The Admin and Mission Studio should continue calling `generateMissionStudioDraft`; only backend provider selection changes. The publishing loop remains unchanged.

## Why This Exists

This intentionally avoids building a generic AI platform before product use. The architecture is validated by a concrete feature first: Mission Studio draft generation.
