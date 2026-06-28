# Firebase Functions Gen2 Backend

This document defines the first backend foundation for SparkLingo using Firebase Functions Gen2.

## Current Boundary

Firebase Functions is the official backend layer for secure APIs, AI orchestration, privileged Firestore operations, and future pronunciation assessment.

Railway remains responsible for runtime TTS because it currently uses a persistent `/data` volume for generated audio cache. If TTS moves to Firebase later, the cache should move to Firebase Storage or Cloud Storage rather than local function filesystem.

## Folder Structure

```txt
functions/
  src/
    index.ts
    config/
      runtime.ts
      secrets.ts
    http/
      v1/
        healthCheck.ts
    providers/
      index.ts
      types.ts
shared/
  contracts/
    api.ts
```

## API Versioning

New HTTP APIs should live under `functions/src/http/v1`.

Callable functions may remain exported directly from `functions/src/index.ts` when they are app-only operations, but public HTTP APIs should use versioned modules.

## Provider Abstraction

External services must be wrapped behind provider interfaces before use by application logic.

Current contracts:

- `AIProvider`
- `SpeechAssessmentProvider`

This prevents direct coupling to OpenRouter, Azure Speech, or any future provider. Runtime/application code should depend on provider interfaces, not SDK-specific implementations.

## Shared Types

Shared DTOs and API response types live in `shared/contracts`.

The first infrastructure slice keeps Function runtime code self-contained under `functions/src` so Firebase deploy emits `functions/lib/index.js` predictably.

Use `shared/contracts` as the source of truth for frontend/backend DTOs, but avoid importing runtime code from `shared` into Functions until Firebase deploy packaging is intentionally configured for shared modules.

## Secrets

Production secrets must be stored in Firebase/Google Secret Manager, not in `.env` files.

Configured placeholders:

```bash
firebase functions:secrets:set OPENROUTER_API_KEY
firebase functions:secrets:set AZURE_SPEECH_KEY
firebase functions:secrets:set AZURE_SPEECH_REGION
```

Secrets are defined in `functions/src/config/secrets.ts`.

Do not commit real credentials.

## Local Development

```bash
cd functions
npm install
npm run build
npm run lint
npm run serve
```

## Deploy

Firebase Functions Gen2 requires the Firebase project to be on the Blaze plan because deployment uses Cloud Build and Artifact Registry.

```bash
cd functions
npm run deploy
```

Or from the repository root:

```bash
firebase deploy --only functions
```

The Firebase project is configured in `.firebaserc`.

## Health Check

The first Gen2 HTTP function is:

```txt
healthCheck
```

It validates the Functions runtime, region config, build pipeline, and deploy path.

Expected response:

```json
{
  "ok": true,
  "service": "sparklingo-functions",
  "version": "v1",
  "region": "us-central1",
  "timestamp": "..."
}
```

## Responsibility Split

Frontend remains responsible for:

- Cinematic UI rendering
- Runtime pacing and visual state
- Client-side interaction state
- Safe Firestore reads/writes allowed by rules

Firebase Functions should own:

- External API keys
- AI generation calls
- Pronunciation assessment calls
- Privileged Firestore mutations
- Audit/cost logs
- Provider failover
- Schema validation before production writes

## Migration Plan

1. Normalize Firebase Functions Gen2 with Node 20, TypeScript, linting, and `healthCheck`.
2. Add provider interfaces before implementing any provider-specific service.
3. Validate the first vertical AI flow with Mission Studio, AI Gateway, and `MockAIProvider`.
4. Add Azure Speech pronunciation assessment behind `SpeechAssessmentProvider`.
5. Keep Railway TTS isolated until a Storage-backed Firebase cache is explicitly designed.
