# Tests et preuves de vérification SOA

## Tests automatisés

Depuis PowerShell :

```powershell
Set-Location .\backend
npm test

Set-Location ..\mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug

Set-Location ..\soa
.\mvnw.cmd test
.\mvnw.cmd package
```

Résultats exécutés sur le dépôt :

| Vérification | Résultat |
| --- | --- |
| Tests Node | 44 réussites, 0 échec |
| Résolution Flutter | Réussie |
| Analyse Flutter | Aucune anomalie |
| Tests Flutter | 14 réussites |
| APK Android debug | Générée |
| Tests Maven | 17 réussites : 11 Spring, 6 SOAP |
| Packaging Maven | Réussi |

Les suites Node, Flutter, l'analyse Flutter, les tests Maven étendus et le
package Maven ont été relancés avec succès. Maven a été exécuté avec le JDK 27
disponible localement, avec une cible de compilation Java 17. Le JDK 17 n'était
pas installé dans l'environnement de validation.

Les suites automatisées simulent les services externes selon le module :
Spring utilise un client Node simulé ; SOAP vérifie les opérations et les
statistiques sur des réponses de test ; Flutter vérifie ses contrats API avec
des clients de test. Elles ne suffisent pas à prouver la disponibilité d'un
fournisseur externe.

## Vérifications d'intégration réellement exécutées

Les essais suivants ont été exécutés avec des comptes temporaires, des
conversations MongoDB réelles et des messages enregistrés sans Gemini.
La génération Gemini live a été sondée séparément :

| Parcours | Résultat observé |
| --- | --- |
| OpenAPI JSON et Swagger UI Spring | HTTP 200 |
| Requête Spring sans jeton ou avec jeton invalide | HTTP 401 |
| WSDL Metro à l'exécution | HTTP 200 |
| SOAP `compterMots` sur deux mots | HTTP 200, résultat `2` |
| Création Node puis lecture de la conversation par Spring | HTTP 200 |
| Statistiques SOAP sur deux messages MongoDB réels | 2 messages, 1 utilisateur, 1 assistant, moyenne `2,50` |
| Identifiant SOAP invalide | Faute SOAP avec statut HTTP 500 |
| Suppression par Spring | HTTP 204 |
| Spring `POST /chat` via Node, MongoDB et Gemini | HTTP 504 sur la sondage live ; aucune réponse simulée |

Une sonde live Gemini peut échouer avec HTTP 504 ou HTTP 429 selon le quota,
le réseau et la disponibilité du fournisseur. Les tests contrôlés vérifient
les chemins Node et Spring sans déclarer une réponse réussie comme réelle.

L'APK a été installée et lancée sur l'émulateur Android. L'interaction avec
l'interface n'a pas été effectuée : aucun parcours utilisateur Flutter de
bout en bout n'est revendiqué. La chaîne réelle vérifiée est Spring → Node →
MongoDB → Gemini.

La collection Postman incluse vérifie l'accès OpenAPI et le rejet des requêtes
métier sans authentification. Elle n'intègre aucun identifiant ni jeton
utilisateur ; les opérations authentifiées ont été vérifiées avec des comptes
temporaires lors des essais live.
