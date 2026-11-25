# Tests et validation

## Commandes automatisées

### Backend Node.js

```powershell
Set-Location .\backend
npm test
```

La suite Node couvre la configuration, l'authentification, les conversations,
la propriété des ressources, les reprises Gemini, les erreurs fournisseur et
les journaux. `npm run diagnose:gemini` effectue une requête réelle au service
Google ; cette commande nécessite une configuration locale et peut consommer
du quota.

### Application Flutter

```powershell
Set-Location .\mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
flutter build web
```

Les tests couvrent les échanges API, l'interface et les erreurs de chat. Les
tests Flutter automatisés n'établissent pas, à eux seuls, la disponibilité du
backend en fonctionnement.

### Modules SOA

```powershell
Set-Location .\soa
.\mvnw.cmd test
.\mvnw.cmd package
```

Les tests Spring utilisent MockMvc et un client Node simulé. Les tests SOAP
vérifient le WSDL produit par Metro, le comptage de mots, l'authentification
et les statistiques à partir de réponses de test. Ils n'appellent ni Gemini
ni MongoDB.

## Résultats de la dernière vérification

| Vérification | Résultat |
| --- | --- |
| `npm test` | 44 réussites, 0 échec |
| `flutter pub get` | Réussi |
| `flutter analyze` | Aucune anomalie |
| `flutter test` | 14 réussites |
| `flutter build apk --debug` | Réussi |
| `flutter build web` | Réussi, avec avertissements Wasm et d'icônes Cupertino |
| `.\mvnw.cmd test` | 14 réussites : 10 Spring et 4 SOAP |
| `.\mvnw.cmd package` | Réussi |

Maven a été exécuté avec le JDK 25 d'IntelliJ et le compilateur ciblait Java
17. Le JDK 17 n'était pas installé. Les services Spring et SOAP de l'essai
réel ont fonctionné avec le JRE 21 d'Eclipse ; l'exécution avec Java 17 reste
à valider.

Les vérifications d'intégration et leurs statuts HTTP sont consignés dans
[docs/soa/testing.md](soa/testing.md). Une requête réelle Spring → Node →
MongoDB → Gemini a généré puis persisté une réponse. Le parcours de l'interface
Flutter n'a pas été vérifié manuellement sur l'émulateur ; il ne faut donc pas
le présenter comme un essai mobile de bout en bout.
