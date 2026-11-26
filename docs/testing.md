# Tests et validation

## Commandes automatisées

### Backend Node.js

La suite d'intégration utilise MongoDB locale sur
`mongodb://127.0.0.1:27017` et crée une base de test au nom aléatoire
`hkili_test_*`, supprimée à la fin de la suite. Elle ne doit pas être exécutée
contre une base de données de production.

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

## Résultats de la dernière campagne enregistrée

| Vérification | Résultat |
| --- | --- |
| `npm test` | 44 réussites, 0 échec |
| `flutter pub get` | Réussi |
| `flutter analyze` | Aucune anomalie |
| `flutter test` | 14 réussites |
| `flutter build apk --debug` | Réussi |
| `flutter build web` | Réussi, avec avertissements Wasm et d'icônes Cupertino |
| `.\mvnw.cmd test` | 17 réussites : 11 Spring et 6 SOAP |
| `.\mvnw.cmd package` | Réussi |

`npm test`, `flutter analyze`, `flutter test` et le package Maven ont été
relancés avec les tests SOA étendus. Les tests Maven donnent 17 réussites.
Le build APK/Web rapporté ci-dessus provient de la campagne antérieure et n'a
pas été rejoué dans cette validation.

Maven a été exécuté avec le JDK 27 disponible localement et le compilateur
ciblait Java 17. Le JDK 17 n'était pas installé ; l'exécution sur un JDK 17
de production reste donc à valider sur l'environnement final.

Les vérifications d'intégration et leurs statuts HTTP sont consignés dans
[docs/soa/testing.md](soa/testing.md). Une requête réelle Spring → Node →
MongoDB → Gemini a généré puis persisté une réponse. Le parcours de l'interface
Flutter n'a pas été vérifié manuellement sur l'émulateur ; il ne faut donc pas
le présenter comme un essai mobile de bout en bout.
