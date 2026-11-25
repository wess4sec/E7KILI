# Security

## Secrets and configuration

- Keep `backend/.env` local and untracked. Use only safe placeholders in
  `.env.example`.
- Store `GEMINI_API_KEY` only in the Node backend environment.
- Keep the shared `JWT_SECRET` out of source, logs, screenshots, and client
  builds. Spring must receive the exact same local secret as Node.
- Never save real bearer tokens in committed Postman or SoapUI files.

## Authentication and authorization

Node issues HS256 bearer tokens. Spring validates signature, expiration, and a
24-hex `sub`, then forwards the unchanged token to Node. Node remains the
authority for authenticated user and conversation ownership checks on every
proxied operation. SOAP statistics also require a bearer token; `compterMots`
only processes caller-provided text.

## Data boundaries

Flutter and Java do not connect directly to MongoDB or Gemini. Java modules do
not duplicate account or conversation data. API errors are sanitized so raw
provider or backend details are not returned to clients. Request examples use
synthetic IDs and no credentials.

## Deployment

Use HTTPS outside local development, store secrets in the deployment platform's
secret manager, rotate credentials if exposed, restrict CORS and network
access, and avoid logging request bodies, authorization headers, message text,
or provider credentials.
