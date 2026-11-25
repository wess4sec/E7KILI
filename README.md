# Hkili

Hkili is a Tunisian-inspired conversational assistant built as a Flutter +
Express + MongoDB monorepo. The backend handles authentication, conversation
history, and optional Gemini AI responses. The mobile app uses the backend for
authenticated chat; guest mode remains local mock behavior.

## Repository layout

| Directory | Purpose |
| --- | --- |
| `mobile/` | Flutter client for Android and iOS. |
| `backend/` | Node.js/Express API, MongoDB persistence, authentication, and Gemini integration. |
| `docs/` | Architecture and API documentation. |

## Prerequisites

- Flutter SDK with Dart
- Node.js 22.9 or later and npm
- MongoDB (local or hosted)
- A Google Gemini API key for AI responses (optional for starting the API)

## Backend setup

Start MongoDB, then configure `backend/.env`. Use `backend/.env.example` as a
reference; create `.env` only if it does not already exist. Set a MongoDB URI,
a unique `JWT_SECRET` of at least 32 bytes, and a valid `GEMINI_API_KEY` if AI
responses are needed. Never commit or share `.env`.

```shell
cd backend
npm ci
npm start
```

For development with Node's watch mode, run `npm run dev`. The backend loads
`.env` itself; non-empty environment variables take precedence. An empty
`GEMINI_API_KEY` disables AI replies and is reported safely at startup.

The health endpoint is available at
`http://localhost:3000/api/v1/health`. Run backend tests with `npm test`; test
fixtures use isolated local `hkili_test_*` MongoDB databases.
To check Gemini with one minimal request, run `npm run diagnose:gemini` from
`backend/` after setting a valid API key. The diagnostic checks the models
available to that key, validates `generateContent` support, then tests the
configured primary and (when needed) fallback model. It reports model and
provider status without exposing the key; a short generated response is shown
only after a successful request.

## Mobile

```shell
cd mobile
flutter pub get
flutter run
```

## Documentation

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
