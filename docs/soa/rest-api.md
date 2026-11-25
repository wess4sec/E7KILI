# Spring REST API

The Spring Boot REST façade listens on port `8081` by default. It forwards
requests to the existing Node API and does not own application records.

All routes below require `Authorization: Bearer <existing Hkili JWT>`. Spring
verifies the HS256 signature, expiry, and 24-hex Mongo ObjectId `sub` using the
shared `JWT_SECRET`. Node receives and independently validates the same token,
including conversation ownership.

OpenAPI JSON: `GET /v3/api-docs`
Swagger UI: `GET /swagger-ui.html`

## `POST /chat`

Sends a user message and returns the persisted user/assistant pair after Node
successfully generates the assistant response.

Request:

```json
{
  "message": "Aaslema Hkili",
  "conversationId": "6740b02a38e91d0e12345679",
  "title": "Optional title for a new conversation"
}
```

`message` is required and limited to 10,000 characters. `conversationId` is
optional and must be a 24-character hexadecimal ObjectId. `title` is optional,
maximum 120 characters, and used only when creating a conversation.

Success: `201 Created`

```json
{
  "conversationId": "6740b02a38e91d0e12345679",
  "conversationTitle": "Aaslema Hkili",
  "userMessage": {
    "id": "6740b04c38e91d0e12345680",
    "conversationId": "6740b02a38e91d0e12345679",
    "role": "user",
    "content": "Aaslema Hkili",
    "createdAt": "2026-11-25T16:30:00.000Z"
  },
  "assistantMessage": {
    "id": "6740b04c38e91d0e12345681",
    "conversationId": "6740b02a38e91d0e12345679",
    "role": "assistant",
    "content": "Aaslema !",
    "createdAt": "2026-11-25T16:30:01.000Z"
  }
}
```

The IDs and messages above illustrate the JSON structure; they are not seed
records. A new conversation is created by Node before generation. Node persists
the user and assistant messages only after successful generation. If generation
fails, Flutter retains the unsent draft; a newly created empty conversation may
remain in Node.

## `GET /conversations`

Lists conversations from Node, with query parameters `page` (default `1`) and
`limit` (default `20`, maximum `100`). Returns the Node JSON envelope:

```json
{
  "conversations": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## History compatibility routes

Flutter history also uses these routes:

- `GET /conversations/{id}?page=1&limit=50` returns Node's conversation,
  messages, and pagination envelope.
- `PATCH /conversations/{id}` with `{"title":"Updated title"}` renames through
  Node.

Both require the same bearer token and Node enforces ownership.

## `DELETE /conversations/{id}`

Deletes through Node, which enforces ownership and removes the conversation
and its associated messages. Returns `204 No Content`.

## Errors

Errors use:

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "The AI service is temporarily unavailable"
  }
}
```

The façade maps validation to `400`, authentication to `401`, ownership denial
to `403`, missing records to `404`, rate limits to `429`, Node unavailability
to `503`, timeouts to `504`, and invalid upstream responses to `502`. Raw Node
or Gemini messages are not returned.
