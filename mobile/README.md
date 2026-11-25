# Application mobile Hkili

L'application Flutter fournit l'accueil, l'inscription, la connexion, le mode
invité, le chat, l'historique et le profil.

L'inscription et la connexion utilisent l'API Node. Pour un compte
authentifié, le chat et l'historique passent par la façade Spring ; les
conversations restent enregistrées par Node dans MongoDB. Le mode invité
utilise un chat local de démonstration conservé uniquement en mémoire pendant
la session, sans persistance locale ni serveur.

Depuis `mobile/`, installez les dépendances et lancez l'application :

```powershell
flutter pub get
flutter run
```

Les contrôles mobiles sont :

```powershell
flutter analyze
flutter test
```

Les adresses des API sont définies dans
`lib/services/api_config.dart` et peuvent être remplacées par les variables
Dart `API_BASE_URL` et `SOA_API_BASE_URL`.
