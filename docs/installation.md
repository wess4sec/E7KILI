# Installation

These commands target Windows PowerShell. Install Node.js/npm, Flutter/Dart,
MongoDB, and a Java 17 JDK before use. The SOA Maven Wrapper downloads Maven
3.9.9 on first invocation.

## Backend

```powershell
Set-Location .\backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `.env` locally. Provide `MONGODB_URI`, a strong `JWT_SECRET` of at least
32 UTF-8 bytes, and Gemini configuration if live generation is required. Do
not overwrite an existing `.env` and do not commit it.

Start the backend after MongoDB is available:

```powershell
npm start
```

## SOA

```powershell
Set-Location .\soa
.\mvnw.cmd test
```

The source target is Java 17. To run Spring, set `JWT_SECRET` in the current
PowerShell session to the same value as backend configuration, then:

```powershell
Set-Location .\soa\spring-rest
$env:JWT_SECRET = '<same local value as backend/.env>'
..\mvnw.cmd spring-boot:run
```

For SOAP, install the Maven reactor artifacts and run the Metro endpoint:

```powershell
Set-Location .\soa
.\mvnw.cmd install -DskipTests
Set-Location .\jaxws-soap
..\mvnw.cmd exec:java
```

## Flutter

```powershell
Set-Location .\mobile
flutter pub get
flutter run
```

Android emulator defaults are configured centrally in `mobile/lib/services/api_config.dart`.
Override with `--dart-define=API_BASE_URL=...` and
`--dart-define=SOA_API_BASE_URL=...`; these are endpoint settings, not secret
storage.
