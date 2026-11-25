# Hkili Mobile

The Flutter prototype includes a welcome screen, a local mock chat, and
Accueil / Historique / Profil navigation. The chat is not connected to the
backend: messages exist only in memory and replies come from
`MockChatService`.

Run locally with:

```shell
flutter pub get
flutter run -d <device-id>
```

Run the mobile checks with `flutter analyze` and `flutter test`.
