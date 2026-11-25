# Hkili Technical Audit

## Scope and method

This is the Phase 1, read-only application audit. Source code was inspected
across `mobile/`, `backend/`, and `docs/`; the backend and Flutter automated
checks and an Android debug build were run. The only project file added in this
phase is this audit document. No application source or configuration was
changed.

The contents of `backend/.env` were not read or printed. A live Gemini request
was not made during this audit, to avoid consuming provider quota. Device-level
chat verification was not performed.

## Executive summary

Hkili has a substantial working foundation: authenticated account flows,
conversation CRUD and ownership checks, MongoDB persistence, a Flutter chat
client, and a Gemini REST integration with primary/fallback models and bounded
retries. Current automated checks pass, and the Android debug APK builds.

The main gap is that these checks do not prove the native app can reach the
backend. The default mobile API URLs use plain HTTP, Android's effective debug
target SDK is 36 with no cleartext exception, and iOS has no App Transport
Security exception. In addition, the Android Internet permission appears only
in debug/profile manifests, not the main manifest. Device and release network
behavior therefore require priority verification.

Other high-value follow-ups are production API protections, atomic chat
persistence and retry idempotency, startup/error handling, and correction of
documentation that does not match the implementation.

## Existing functionality

### Flutter mobile

- Welcome, registration, login, and authenticated session restoration.
- JWT storage through `flutter_secure_storage`.
- Guest entry with explicitly labeled mock responses; guest conversations are
  held in application memory and are not persisted across restarts.
- Authenticated chat through the versioned Express API, with a retained draft
  after a failed send.
- Conversation history listing, opening, renaming, and deletion.
- Profile display and logout/token cleanup.
- Responsive layouts use scroll views and maximum content widths; the mascot
  and Hkili color theme are custom.
- Client state is managed locally in widgets/services; no external state
  management package is present.

### Backend

- Express 5 API under `/api/v1`, with centralized validation and error
  responses, 16 KiB JSON body limit, request timing logs, and the
  `X-Powered-By` header disabled.
- Environment-based configuration; `.env` is resolved relative to the backend
  loader, and nonblank process variables take precedence.
- Registration/login with bcrypt password hashes and expiring HS256 bearer
  tokens.
- Mongoose models for users, conversations, and messages; conversation
  pagination, chronological message retrieval, ownership enforcement, rename,
  and delete operations.
- Server-side Google Gemini `generateContent` REST integration, 10-message
  context window, configured primary/fallback model names, bounded retries for
  HTTP 500/503, `Retry-After` support, and distinct 429 handling.
- A `diagnose:gemini` command lists models available to the configured key and
  can perform a minimal real generation request.
- MongoDB connection is required before the server starts listening. The
  health route reports process liveness only; it does not check database or
  Gemini readiness.

## Verification results

Checks run during this audit:

| Command | Result |
| --- | --- |
| `npm test` from `backend/` | Passed: 42 tests, 0 failures. The tests connected to an isolated local `hkili_test_*` MongoDB database; Gemini provider calls were mocked. |
| `flutter analyze` from `mobile/` | Passed: no issues found. |
| `flutter test` from `mobile/` | Passed: 10 tests. UI/API behavior is tested with fakes or a mocked HTTP client, not a live backend. |
| `flutter build apk --debug` from `mobile/` | Passed: Android debug APK built. This is a build check, not an emulator/device test. |
| `npm audit --omit=dev` from `backend/` | Passed: 0 reported vulnerabilities. |
| `flutter pub outdated` from `mobile/` | Found the locked `flutter_secure_storage` 9.2.4 behind 11.2.0; its locked macOS implementation is discontinued. No dependency changes were made. |

Installed versions were Node.js 24.14.1, npm 11.11.0, Flutter 3.47.5, and Dart
3.13.4. `mongod --version` was unavailable on `PATH`, although the local MongoDB
service was reachable by the passing backend integration tests.

Prior project work recorded a successful real generation with the configured
fallback model and later quota/unavailability errors on the primary. That
historical result is not a current provider check. The Gemini diagnostic and a
real mobile-to-Gemini flow were not run in this audit, so current model
availability and end-to-end operation remain unverified.

## Prioritized findings

### P1 — Native API networking is not ready for device verification

`ApiConfig` defaults to `http://10.0.2.2:3000/api/v1` on Android and
`http://127.0.0.1:3000/api/v1` elsewhere. The merged debug manifest targets
SDK 36 and has no `usesCleartextTraffic` or network security configuration.
The main Android manifest does not declare `android.permission.INTERNET`; that
permission is in the debug and profile manifests only. The iOS `Info.plist`
contains no App Transport Security exception. Consequently:

- Plain HTTP is blocked by normal Android/iOS transport policies unless a
  development-only exception is configured.
- The source manifests indicate release builds may omit Internet permission;
  verify the merged release manifest before claiming release networking works.
- Loopback defaults are development-only and are not usable as production API
  addresses on physical devices.

**Recommendation:** Separate development and production API configuration;
use HTTPS outside local development, scope any cleartext exception to debug,
put the Internet permission in the main manifest, and verify on an authorized
emulator/device plus a release manifest/build.

### P1 — Production API abuse protections are absent

No request rate limiting, login/registration throttling, or security-header
middleware was found. This matters particularly for credential guessing and
Gemini-backed requests that can incur provider quota or cost. Request logging
does appropriately avoid bodies and headers, and provider error responses are
sanitized before returning to clients.

**Recommendation:** Before exposing the API publicly, add appropriately scoped
rate limits and security headers, enforce HTTPS at the deployment boundary,
and define operational limits for AI generation.

### P2 — Chat persistence is not atomic or idempotent

`sendUserMessageAndGenerateReply` generates first, then creates the user
message, creates the assistant message, and updates the conversation in
separate database operations. This preserves the intended behavior when
generation fails, but a MongoDB failure between writes can leave a partial
pair. There is no idempotency key, so retrying after a successful server write
whose response was lost can create duplicate pairs. Conversation deletion
also deletes the conversation and messages as separate parallel operations.

The message route accepts `role: "assistant"` from an authenticated client and
persists it directly, allowing a client to add an assistant-authored history
entry without generation. This may be useful for administrative/import
workflows, but it weakens the API's guarantee that assistant messages came
from Gemini.

**Recommendation:** Decide the intended client contract, restrict assistant
message creation if it is not a supported client operation, use MongoDB
transactions where deployment topology permits, and add request idempotency
for chat sends.

### P2 — Client startup and error paths need hardening

- In `AuthService.restoreSession`, the secure-storage token read happens before
  its error handling. A storage exception can escape `_restoreSession` and
  leave the app on its initialization spinner.
- `ApiClient` requests have no explicit client-side timeout. A slow backend or
  provider retry/fallback sequence can leave the UI waiting for an extended
  period.
- `HistoryScreen` includes raw exceptions in open/rename/delete SnackBars.
  Chat errors are mapped to friendly French messages, but history errors are
  inconsistent.
- The chat header always says “En ligne” and is not connected to backend
  readiness.
- Guest messages are in-memory only, while the profile wording says they are
  kept locally; users can lose them when the app restarts.

### P2 — Gemini retry timing and runtime verification

The service retries transient 500/503 responses and uses a fallback, while
avoiding retries for authentication and quota errors. A provider-supplied
`Retry-After` value is not capped, however, so a long value can produce a long
single wait. The configured models are syntax-checked at startup but are not
validated against the live model list until the diagnostic command runs.

Automated tests cover fallback, retry exhaustion, authentication errors,
quota errors, malformed replies, and persistence with mocked Gemini responses.
They do not prove current Google API availability.

**Recommendation:** Bound accepted `Retry-After` waits, expose useful readiness
information without leaking credentials, and run the real diagnostic as a
separate integration check before claiming live AI availability.

### P2 — Android distribution metadata remains template-level

The Android application ID is `com.example.hkili_mobile`, and the release
build is configured to use the debug signing configuration. These are suitable
for development, not store distribution. No release APK was built as part of
this phase.

### P2 — Documentation is incomplete or inconsistent

- Root `README.md` is a short setup overview and lacks the requested project,
  installation, testing, security, screenshots, limitations, and build details.
- `mobile/README.md` says the chat is not connected to the backend, contrary
  to the authenticated code path.
- `docs/architecture.md` says user and assistant messages are persisted
  “atomically”; the service currently performs sequential writes without a
  transaction.
- `docs/` currently contains only `api.md` and `architecture.md`; database,
  installation, testing, security, user-guide, and academic-report documents
  are not present.
- No screenshot assets or verified author/academic details were found in the
  inspected project content.

### P3 — Accessibility and device-level quality are not established

The UI has bounded layouts, scrollable forms, labeled text inputs, and
tooltips on some actions, but no dedicated accessibility tests or manual
screen-reader/contrast review were found. The custom-painted mascot has no
explicit semantic label. Responsive behavior is supported by code structure,
but has not been validated across physical device sizes in this audit.

## Security and repository hygiene

- `backend/.gitignore` excludes `.env` and `.env.*` while allowing
  `.env.example`; the example contains placeholders and no real key.
- The actual `backend/.env` exists, but its values were not inspected.
- There is no repository-root `.git` metadata or root `.gitignore`, so tracked
  files, commit history, remotes, and committed-secret status cannot be
  verified.
- Nested ignores cover the backend dependencies, Flutter build/cache, Android
  local properties, iOS generated files, and the mobile IDE directory. The
  root `.idea/` directory is not covered by a root ignore file and could be
  included if Git is initialized at the workspace root.
- Lockfiles are present for both backend and Flutter. The backend production
  dependency audit reported no advisories; Flutter has outdated locked
  packages noted above.

## Recommended implementation order after audit approval

1. Make native API transport work safely in development and production; verify
   Android release networking and an authorized device flow.
2. Stabilize chat consistency and retry behavior: prevent client-authored
   assistant messages if unsupported, address partial writes, and add
   idempotency.
3. Harden backend exposure and client reliability: rate limits, secure
   deployment transport, request timeouts, safe history errors, and robust
   session restoration.
4. Re-run the live Gemini diagnostic and, only if available, verify a real
   authenticated mobile message through provider response and MongoDB
   persistence.
5. Correct the documentation and then prepare the academic report from
   verified implementation details.
