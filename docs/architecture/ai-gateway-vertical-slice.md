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
  -> Runtime Preview / Approve & Save
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

The Admin and Mission Studio should continue calling `generateMissionStudioDraft`; only backend provider selection changes.

## Why This Exists

This intentionally avoids building a generic AI platform before product use. The architecture is validated by a concrete feature first: Mission Studio draft generation.
