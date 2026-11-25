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
| Tests Maven | 14 réussites : 10 Spring, 4 SOAP |
| Packaging Maven | Réussi |

Les suites Node et Flutter ainsi que l'analyse Flutter ont été relancées lors
de l'audit documentaire et ont réussi. Les tests/package Maven et la génération
APK du tableau correspondent à la campagne d'intégration antérieure ; ils
n'ont pas été rejoués dans cet audit.

Les tests Java ont été exécutés avec le JDK 25 d'IntelliJ et le compilateur
ciblait Java 17. Le Java par défaut était la version 8 ; une première
tentative Maven s'est arrêtée avant les tests, car ce runtime ne charge pas
les classes Java 17. Après sélection du JDK 25 dans le processus PowerShell,
les tests et le packaging ont réussi. Le JDK 17 n'était pas installé. Les
processus Spring et SOAP de l'essai réel ont utilisé le JRE 21 d'Eclipse.

Les suites automatisées simulent les services externes selon le module :
Spring utilise un client Node simulé ; SOAP vérifie les opérations et les
statistiques sur des réponses de test ; Flutter vérifie ses contrats API avec
des clients de test. Elles ne suffisent pas à prouver la disponibilité d'un
fournisseur externe.

## Vérifications d'intégration réellement exécutées

Les essais suivants ont utilisé des comptes temporaires, puis supprimé les
comptes, conversations et messages créés :

| Parcours | Résultat observé |
| --- | --- |
| OpenAPI JSON et Swagger UI Spring | HTTP 200 |
| Requête Spring sans jeton ou avec jeton invalide | HTTP 401 |
| WSDL Metro à l'exécution | HTTP 200 |
| SOAP `compterMots` sur trois mots | HTTP 200, résultat `3` |
| Création Node puis lecture de la conversation par Spring | HTTP 200 |
| Lecture de la conversation par un autre compte | HTTP 403 |
| Renommage par Spring et vérification du titre dans la liste | HTTP 200 |
| Suppression par Spring, puis recherche Node | HTTP 204, puis HTTP 404 |
| SOAP `statistiques` sur un message utilisateur enregistré | 1 message total, 1 utilisateur, 0 assistant, moyenne de 3,00 mots |
| Spring `POST /chat` via Node, MongoDB et Gemini | HTTP 201 ; l'historique contenait ensuite 3 messages |

Le parcours `POST /chat` a produit une réponse assistant réelle et l'a
persistée dans la conversation existante. Des sondes Gemini antérieures ont
renvoyé HTTP 504 et HTTP 429 ; la disponibilité du fournisseur est donc
variable, malgré cette réussite ponctuelle.

L'APK a été installée et lancée sur l'émulateur Android. L'interaction avec
l'interface n'a pas été effectuée : aucun parcours utilisateur Flutter de
bout en bout n'est revendiqué. La chaîne réelle vérifiée est Spring → Node →
MongoDB → Gemini.

La collection Postman incluse vérifie l'accès OpenAPI et le rejet des requêtes
métier sans authentification. Elle n'intègre aucun identifiant ni jeton
utilisateur ; les opérations authentifiées ont été vérifiées avec des comptes
temporaires lors des essais live.
