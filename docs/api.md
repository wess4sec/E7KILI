# Hkili API

The backend exposes a versioned JSON REST API (`/api/v1`).

## Conventions

- The mobile client communicates with the backend over HTTP using JSON.
- All requests requiring authentication must include the `Authorization: Bearer <token>` header.
- The backend owns persistence and communicates with MongoDB; clients never connect to the database directly.
- All request bodies and error responses use standard JSON envelopes.

## Backend setup

Create `backend/.env` from `backend/.env.example` if it does not already exist,
then replace the placeholder values. The backend loads `.env` on startup;
non-empty environment variables supplied by the deployment take precedence.
Never commit `.env`. MongoDB and JWT configuration are required to start the
API. Gemini configuration is optional for non-AI requests, but an actual valid
Google Gemini API key is required for AI replies. An empty key disables AI
responses and an explicit AI request returns a diagnostic `503`.

The backend calls Google's `generateContent` REST API using Node.js `fetch`;
there is no separate Gemini SDK dependency.

Run `npm run diagnose:gemini` from `backend/` to list models available to the
configured key, verify `generateContent` support, and make a minimal real text
generation request. It reports per-attempt model, HTTP status, provider code,
and fallback usage. It never prints the key and shows only a short generated
response after success. Provider HTTP 500/503 failures are retried up to two
times with exponential backoff and jitter; a valid `Retry-After` header takes
precedence. If the primary remains unavailable, the configured fallback is
tried. HTTP 429 quota errors and authentication failures are not retried or
sent to the fallback.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | HTTP port; defaults to `3000` |
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `MONGODB_URI` | Yes | MongoDB connection URI |
| `JWT_SECRET` | Yes | HMAC secret of at least 32 UTF-8 bytes |
| `JWT_EXPIRES_IN` | No | JWT duration such as `1h` |
| `BCRYPT_ROUNDS` | No | bcrypt cost from `10` to `14`; defaults to `12` |
| `GEMINI_API_KEY` | No | Google Gemini API key; empty/missing disables AI replies |
| `GEMINI_MODEL` | No | Gemini model identifier; defaults to `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODEL` | No | Fallback model identifier; defaults to `gemini-3.6-flash` (or `gemini-3.8-flash` when that is the primary) and must differ from the primary |

Use the [Google AI Studio API keys page](https://aistudio.google.com/apikey) to
obtain a valid key. Replace the safe placeholder in `.env.example`; do not
paste credentials into source code, Flutter configuration, logs, or support
messages. The configured key is sent to Google in the `x-goog-api-key` request
header and is never returned to the mobile client.

---

## Health

### `GET /api/v1/health`

Returns process liveness. It does not check MongoDB or external service availability.

**Success response — `200 OK`**

```json
{
  "status": "ok"
}
```

---

## Authentication

### `POST /api/v1/auth/register`

Registers a new user account and returns a signed JWT access token.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```
- `email`: required, valid format, max 254 chars.
- `password`: required, min 8 characters, max 72 UTF-8 bytes.
- `name`: optional, 1 to 80 characters.

**Success response — `201 Created`**
```json
{
  "user": {
    "id": "6740b01c38e91d0e12345678",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2026-11-22T14:00:00.000Z",
    "updatedAt": "2026-11-22T14:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `POST /api/v1/auth/login`

Authenticates existing credentials and returns a JWT access token.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success response — `200 OK`**
```json
{
  "user": {
    "id": "6740b01c38e91d0e12345678",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2026-11-22T14:00:00.000Z",
    "updatedAt": "2026-11-22T14:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `GET /api/v1/auth/me`

Retrieves the authenticated user's profile. Requires `Authorization: Bearer <token>`.

**Success response — `200 OK`**
```json
{
  "user": {
    "id": "6740b01c38e91d0e12345678",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2026-11-22T14:00:00.000Z",
    "updatedAt": "2026-11-22T14:00:00.000Z"
  }
}
```

---

## Conversations

All conversation routes require `Authorization: Bearer <token>` and enforce ownership. Accessing another user's conversation returns `403 FORBIDDEN`.

### `POST /api/v1/conversations`

Creates a new conversation for the authenticated user.

**Request body (optional)**
```json
{
  "title": "Discussion sur Carthage"
}
```
*Note: If `title` is omitted, defaults to `"New conversation"`.*

**Success response — `201 Created`**
```json
{
  "conversation": {
    "id": "6740b02a38e91d0e12345679",
    "title": "Discussion sur Carthage",
    "ownerId": "6740b01c38e91d0e12345678",
    "lastMessageAt": null,
    "createdAt": "2026-11-22T14:05:00.000Z",
    "updatedAt": "2026-11-22T14:05:00.000Z"
  }
}
```

### `GET /api/v1/conversations`

Lists conversations owned by the authenticated user in reverse chronological order (`updatedAt: -1, _id: -1`).

**Query parameters**
- `page`: positive integer (default: 1)
- `limit`: positive integer (default: 20, max: 100)

**Success response — `200 OK`**
```json
{
  "conversations": [
    {
      "id": "6740b02a38e91d0e12345679",
      "title": "Discussion sur Carthage",
      "ownerId": "6740b01c38e91d0e12345678",
      "lastMessageAt": "2026-11-22T14:06:00.000Z",
      "createdAt": "2026-11-22T14:05:00.000Z",
      "updatedAt": "2026-11-22T14:06:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### `GET /api/v1/conversations/:id`

Retrieves a conversation details along with its messages in chronological order (`createdAt: 1, _id: 1`).

**Query parameters**
- `page`: positive integer (default: 1)
- `limit`: positive integer (default: 20, max: 100)

**Success response — `200 OK`**
```json
{
  "conversation": {
    "id": "6740b02a38e91d0e12345679",
    "title": "Discussion sur Carthage",
    "ownerId": "6740b01c38e91d0e12345678",
    "lastMessageAt": "2026-11-22T14:06:00.000Z",
    "createdAt": "2026-11-22T14:05:00.000Z",
    "updatedAt": "2026-11-22T14:06:00.000Z"
  },
  "messages": [
    {
      "id": "6740b03f38e91d0e12345680",
      "conversationId": "6740b02a38e91d0e12345679",
      "role": "user",
      "content": "Aaslema Hkili",
      "createdAt": "2026-11-22T14:05:30.000Z",
      "updatedAt": "2026-11-22T14:05:30.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### `PATCH /api/v1/conversations/:id`

Renames an existing conversation.

**Request body**
```json
{
  "title": "Nouveau titre de conversation"
}
```

**Success response — `200 OK`**
```json
{
  "conversation": {
    "id": "6740b02a38e91d0e12345679",
    "title": "Nouveau titre de conversation",
    "ownerId": "6740b01c38e91d0e12345678",
    "lastMessageAt": "2026-11-22T14:06:00.000Z",
    "createdAt": "2026-11-22T14:05:00.000Z",
    "updatedAt": "2026-11-22T14:10:00.000Z"
  }
}
```

### `DELETE /api/v1/conversations/:id`

Deletes a conversation and cascades deletion to all messages associated with it.

**Success response — `200 OK`**
```json
{
  "success": true
}
```

---

## Messages

### `POST /api/v1/conversations/:id/messages`

Sends a message within a conversation.
- When sending a user message (`role: "user"` or omitted) and Gemini is configured, the backend automatically provides up to the 10 most recent conversation messages as history, calls Google Gemini to generate a response, persists both the user message and the assistant reply, and returns the assistant reply in `message`.
- If Gemini generation fails (e.g. rate limit, timeout, provider error), no message is saved, preventing duplicate user messages.
- If raw message insertion is desired without generating an AI reply, pass `"generateReply": false` or `"role": "assistant"`.

**Request body**
```json
{
  "content": "Parle-moi de la médina de Tunis",
  "role": "user"
}
```
- `content`: required string, 1 to 10000 characters.
- `role`: optional, `"user"` or `"assistant"` (default: `"user"`).
- `generateReply`: optional boolean. When `true`, explicitly requests AI generation (returns 503 if Gemini is not configured).

**Success response (AI Reply) — `201 Created`**
```json
{
  "message": {
    "id": "6740b04c38e91d0e12345681",
    "conversationId": "6740b02a38e91d0e12345679",
    "role": "assistant",
    "content": "Aaslema ! La médina de Tunis est un joyau historique fondé au VIIe siècle...",
    "createdAt": "2026-11-22T14:06:01.000Z",
    "updatedAt": "2026-11-22T14:06:01.000Z"
  },
  "userMessage": {
    "id": "6740b04c38e91d0e12345680",
    "conversationId": "6740b02a38e91d0e12345679",
    "role": "user",
    "content": "Parle-moi de la médina de Tunis",
    "createdAt": "2026-11-22T14:06:00.000Z",
    "updatedAt": "2026-11-22T14:06:00.000Z"
  }
}
```
```

### `GET /api/v1/conversations/:id/messages`

Retrieves messages for a conversation in chronological order (`createdAt: 1, _id: 1`).

**Query parameters**
- `page`: positive integer (default: 1)
- `limit`: positive integer (default: 20, max: 100)

**Success response — `200 OK`**
```json
{
  "messages": [
    {
      "id": "6740b03f38e91d0e12345680",
      "conversationId": "6740b02a38e91d0e12345679",
      "role": "user",
      "content": "Aaslema Hkili",
      "createdAt": "2026-11-22T14:05:30.000Z",
      "updatedAt": "2026-11-22T14:05:30.000Z"
    },
    {
      "id": "6740b04c38e91d0e12345681",
      "conversationId": "6740b02a38e91d0e12345679",
      "role": "assistant",
      "content": "Aaslema ! La médina de Tunis est inscrite au patrimoine mondial...",
      "createdAt": "2026-11-22T14:06:00.000Z",
      "updatedAt": "2026-11-22T14:06:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

## Error Responses

All errors use a consistent JSON envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `INVALID_INPUT` | Unknown request field or malformed input object |
| `400` | `INVALID_JSON` | Body is not valid JSON |
| `400` | `INVALID_EMAIL` | Email format is invalid |
| `400` | `INVALID_PASSWORD` | Password does not meet length constraints |
| `400` | `INVALID_TITLE` | Conversation title invalid (length or type) |
| `400` | `INVALID_MESSAGE` | Message content is empty or exceeds 10000 characters |
| `400` | `INVALID_ROLE` | Message role is not `user` or `assistant` |
| `400` | `INVALID_ID` | Resource ID is not a valid 24-character hexadecimal ObjectId |
| `400` | `INVALID_PAGINATION`| `page` or `limit` parameter invalid or exceeds maximum |
| `401` | `AUTHENTICATION_REQUIRED` | Missing `Authorization: Bearer <token>` header |
| `401` | `INVALID_TOKEN` | Bearer token signature or payload is invalid |
| `401` | `TOKEN_EXPIRED` | Bearer token has expired |
| `401` | `INVALID_CREDENTIALS` | Email or password incorrect |
| `403` | `FORBIDDEN` | Access denied (attempting to access another user's conversation) |
| `404` | `NOT_FOUND` | Route or resource (conversation) not found |
| `409` | `EMAIL_ALREADY_REGISTERED` | User email already exists |
| `413` | `PAYLOAD_TOO_LARGE` | Request payload exceeds 16 KiB |
| `422` | `AI_RESPONSE_BLOCKED` | Gemini could not process the prompt; rephrase it |
| `429` | `RATE_LIMIT_EXCEEDED` | Gemini quota or rate limit exceeded |
| `502` | `BAD_GATEWAY` | Gemini provider error or invalid response |
| `502` | `GEMINI_REQUEST_REJECTED` | Gemini rejected the request; check model/API configuration |
| `503` | `SERVICE_UNAVAILABLE` | Gemini is not configured or remains unavailable after bounded retries |
| `503` | `GEMINI_API_KEY_INVALID` | Google rejected the configured API key |
| `503` | `GEMINI_ACCESS_DENIED` | API key permissions or restrictions prevent access |
| `503` | `GEMINI_MODEL_UNAVAILABLE` | Configured model is unavailable to the API key |
| `504` | `GATEWAY_TIMEOUT` | Gemini request timed out |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected internal server error (diagnostics hidden) |
