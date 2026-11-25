# Testing

All automated suites isolate remote AI and service dependencies where
appropriate.

## Backend

```powershell
Set-Location .\backend
npm test
```

The Node tests cover configuration, authentication, Mongo-backed conversation
behavior, ownership, Gemini retries/fallback/error handling, and safe logging.
`npm run diagnose:gemini` is different: it contacts Google and needs a valid
local key; it is not part of the mocked test suite.

## Flutter

```powershell
Set-Location .\mobile
flutter analyze
flutter test
flutter build apk --debug
```

Flutter tests cover API parsing/headers, existing screens, and chat errors and
draft retention. A successful widget test does not prove a live backend
connection.

## Java SOA

```powershell
Set-Location .\soa
.\mvnw.cmd test
```

Spring tests use MockMvc and a mocked Node API. SOAP tests publish a local
Metro endpoint, inspect its generated WSDL, and calculate statistics from
mocked real-shaped message data. The tests do not require a Google key or
MongoDB.

## End-to-end

Record a manual end-to-end result separately. It requires MongoDB, Node with
valid configuration, Spring, a Java 17 runtime, an Android emulator, and (for
AI generation) a usable Gemini model/key. Verify a response in Flutter and
confirm its MongoDB persistence before describing this flow as tested.
