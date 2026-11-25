# SOA Testing and Verification

## Automated tests

Run the Maven reactor tests from PowerShell:

```powershell
Set-Location .\soa
.\mvnw.cmd test
```

Spring tests cover Bearer JWT validation, forwarding to Node, chat response
mapping, validation, ownership errors, delete, and OpenAPI generation. SOAP
tests publish a local Metro endpoint and verify runtime WSDL, word counting,
token requirements, and statistics calculated from mocked Node conversation
messages.

The tests intentionally mock the Node boundary. They do not access MongoDB or
Google Gemini and are not an end-to-end availability test.

## Flutter checks

```powershell
Set-Location .\mobile
flutter analyze
flutter test
```

Flutter tests cover the Spring chat contract, bearer header, continued
conversation ID, existing UI flows, readable unavailable errors, and retaining
the composer draft after a failed request.

## Node checks

```powershell
Set-Location .\backend
npm test
npm run diagnose:gemini
```

The Gemini diagnostic is a real external API request; it requires local backend
environment configuration. Do not copy its API key or provider headers into a
test fixture or report.

## Full integration checklist

When a JDK 17 runtime, MongoDB, Node environment, valid Gemini configuration,
and Android emulator are available:

1. Run Node and confirm `GET /api/v1/health`.
2. Start Spring with the same `JWT_SECRET` as Node.
3. Start SOAP and confirm `GET /soap/hkili?wsdl`.
4. Sign in through Flutter; verify login continues to use Node.
5. Send an authenticated message, then inspect history after a reload.
6. Confirm the assistant message is only present after successful generation.
7. Test history, rename, and deletion; verify ownership using another test
   account.
8. Use SoapUI with the same account's token to call `statistiques`.
9. Run a real Gemini diagnostic separately and record its actual result.

Do not treat mocked tests or a successful service startup as proof that the
complete Gemini/MongoDB/mobile path works.
