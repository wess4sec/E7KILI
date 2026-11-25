# Installation

Les commandes ci-dessous sont prévues pour Windows PowerShell. Les prérequis
sont Node.js/npm, Flutter/Dart, MongoDB et un JDK 17. Le Maven Wrapper inclus
télécharge Maven 3.9.9 lors de sa première utilisation.

## Backend Node.js

Depuis la racine du dépôt :

```powershell
Set-Location .\backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Configurez `.env` localement avec `MONGODB_URI`, un `JWT_SECRET` robuste d'au
moins 32 octets UTF-8 et les paramètres Gemini si la génération est nécessaire.
Ne remplacez pas un fichier `.env` existant et ne l'ajoutez pas à Git.

Démarrez le backend après la base MongoDB :

```powershell
npm start
```

## Modules SOA

Exécutez les tests Maven depuis `soa/` :

```powershell
Set-Location .\soa
.\mvnw.cmd test
```

La source Java cible la version 17. Avant de lancer Spring, installez les
modules partagés du réacteur, puis configurez `JWT_SECRET` dans le terminal
avec la même valeur que celle de Node. Pour éviter de l'inscrire dans les
fichiers du dépôt, saisissez-la dans l'invite sécurisée :

```powershell
Set-Location .\soa
.\mvnw.cmd -pl spring-rest -am install -DskipTests
Set-Location .\spring-rest
$secret = Read-Host 'Saisir le JWT_SECRET configuré pour Node' -AsSecureString
$env:JWT_SECRET = [System.Net.NetworkCredential]::new('', $secret).Password
Remove-Variable secret
$env:NODE_API_BASE_URL = 'http://127.0.0.1:3000/api/v1'
..\mvnw.cmd spring-boot:run
```

Pour SOAP, installez le réacteur et démarrez Metro :

```powershell
Set-Location .\soa
.\mvnw.cmd install -DskipTests
Set-Location .\jaxws-soap
$env:NODE_API_BASE_URL = 'http://127.0.0.1:3000/api/v1'
..\mvnw.cmd exec:java
```

## Application Flutter

```powershell
Set-Location .\mobile
flutter pub get
flutter run
```

Les adresses de l'émulateur Android sont configurées dans
`mobile/lib/services/api_config.dart`. Les variables Dart
`API_BASE_URL` et `SOA_API_BASE_URL` permettent de les remplacer ; elles
contiennent uniquement des adresses de services.

Pour exécuter Flutter Web sur la même machine que les services, forcez les
adresses locales autorisées par les configurations CORS actuelles :

```powershell
Set-Location .\mobile
flutter run -d chrome `
  --dart-define=API_BASE_URL=http://localhost:3000/api/v1 `
  --dart-define=SOA_API_BASE_URL=http://localhost:8081
```

Sans ces options, la configuration Web utilise l'adresse de développement
`192.168.100.116`, qui peut ne pas correspondre à l'adresse de la machine.
