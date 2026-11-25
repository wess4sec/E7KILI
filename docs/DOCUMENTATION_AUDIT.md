# Audit de la documentation et des exemples de configuration

**Date de l'audit :** 25 novembre 2026  
**Périmètre :** documentation, exemples de configuration et code qui porte les
contrats décrits. Aucun secret local ni historique Git n'a été modifié.

## Résultat général

Les 14 fichiers Markdown préexistants ont été lus individuellement. Les deux
présents livrables d'audit complètent l'inventaire, soit 16 fichiers Markdown
dans le dépôt après cette mise à jour. Les fichiers `*.txt`, `*.json`, `*.xml`,
`*.yml` et `*.yaml` ont été inventoriés et recherchés pour les marqueurs
d'inachèvement. Aucun fichier `.txt` n'est présent.

Aucun marqueur de tâche inachevée, champ personnel à confirmer ou consigne
d'insertion d'image n'a été trouvé dans la documentation. La seule
correspondance de type donnée de démonstration est une adresse électronique
synthétique dans l'exemple d'inscription de `docs/api.md`.

Les marqueurs `JWT_SECRET=` et
`GEMINI_API_KEY=replace-with-a-valid-google-gemini-api-key` des fichiers
`.env.example` sont intentionnels : ils indiquent des valeurs à fournir
localement et ne sont pas des secrets. `backend/.env` n'a pas été ouvert ni
affiché. Le fichier est exclu de Git.

Les liens locaux de la documentation ont été contrôlés après les corrections :
aucun lien cassé et aucun titre Markdown vide n'ont été détectés. Les deux
captures présentes à la racine ne sont pas nécessaires à la documentation ;
leur inventaire figure dans [SCREENSHOTS_CHECKLIST.md](SCREENSHOTS_CHECKLIST.md).
Les 6 fichiers JSON et 13 fichiers XML ont été parsés sans erreur. Les six
références techniques externes du rapport et le schéma Postman ont été
accessibles lors de la vérification.

## Inventaire Markdown, lecture individuelle

| Fichier | Vérification et constat |
| --- | --- |
| `README.md` | Architecture, prérequis, commandes, tests et limites comparés aux modules. Précisions ajoutées sur le mode invité en mémoire. |
| `docs/api.md` | Routes Node, validations, statuts et erreurs comparés aux routeurs/services. Comportement de `generateReply` explicité. |
| `docs/architecture.md` | Flux Flutter → Spring → Node, MongoDB/Gemini, configuration et journaux comparés au code. Adresse Web de développement et journaux Flutter signalés. |
| `docs/database.md` | Champs, index et relations comparés aux trois modèles Mongoose. |
| `docs/installation.md` | Commandes PowerShell comparées aux scripts, wrappers et paramètres. Ajout du démarrage Web via localhost. |
| `docs/security.md` | JWT, secrets, CORS et journaux comparés aux middlewares et clients. Risques locaux décrits. |
| `docs/testing.md` | Commandes, nombres de tests et limites comparés aux scripts et suites. Prérequis MongoDB de `npm test` précisé. |
| `docs/user-guide.md` | Connexion, invité, chat, historique et profil comparés aux écrans. La portée mémoire du mode invité est précisée. |
| `docs/rapport/rapport-soa.md` | Architecture, contrats, preuves, limites Java/Gemini/émulateur et annexes comparés aux composants et résultats antérieurement consignés. Aucune capture requise. |
| `docs/soa/README.md` | Modules, variables, ports, démarrage, OpenAPI et WSDL comparés au réacteur Maven et aux services. |
| `docs/soa/rest-api.md` | URI, corps, réponses, validations et statuts comparés au contrôleur Spring et au client Node. Création préalable de conversation et titre par défaut précisés. |
| `docs/soa/soap.md` | Opérations, comptage, authentification, pagination, fautes et WSDL comparés au service Metro. |
| `docs/soa/testing.md` | Commandes, résultats, intégrations live et limites distingués des tests simulés. |
| `mobile/README.md` | Démarrage Flutter et adresses d'API comparés au client mobile. |
| `docs/DOCUMENTATION_AUDIT.md` | Présent inventaire et rapport de vérification. |
| `docs/SCREENSHOTS_CHECKLIST.md` | Présent inventaire des images et distinction entre éléments optionnels et exigences. |

## Inventaire des formats recherchés

Les recherches de marqueurs ont couvert 6 JSON, 13 XML et 4 YAML. Les fichiers
`backend/.env.example` et `soa/.env.example` ont également été vérifiés comme
exemples d'environnement.

### JSON

- `backend/package.json`
- `backend/package-lock.json`
- `docs/soa/soapui/postman_collection.json`
- `mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json`
- `mobile/ios/Runner/Assets.xcassets/LaunchImage.imageset/Contents.json`
- `mobile/web/manifest.json`

La collection `docs/soa/soapui/postman_collection.json` est valide et ne
contient ni jeton ni identité de compte.

### XML

- `docs/soa/soapui/compterMots-request.xml`
- `docs/soa/soapui/statistiques-request.xml`
- `mobile/android/app/src/debug/AndroidManifest.xml`
- `mobile/android/app/src/main/AndroidManifest.xml`
- `mobile/android/app/src/profile/AndroidManifest.xml`
- `mobile/android/app/src/main/res/drawable/launch_background.xml`
- `mobile/android/app/src/main/res/drawable-v21/launch_background.xml`
- `mobile/android/app/src/main/res/values/styles.xml`
- `mobile/android/app/src/main/res/values-night/styles.xml`
- `soa/pom.xml`
- `soa/common-client/pom.xml`
- `soa/spring-rest/pom.xml`
- `soa/jaxws-soap/pom.xml`

Les enveloppes SOAP sont valides et ne contiennent aucune authentification.
L'identifiant de `statistiques-request.xml` est un exemple au format ObjectId,
pas une conversation garantie existante.

### YAML

- `mobile/analysis_options.yaml`
- `mobile/pubspec.yaml`
- `soa/spring-rest/src/main/resources/application.yml`
- `soa/spring-rest/src/test/resources/application-test.yml`

Les commentaires de démonstration « assets » et « fonts » sans fichiers
correspondants ont été retirés de `mobile/pubspec.yaml`. Les exemples
d'environnement restent à personnaliser uniquement dans les fichiers locaux
ignorés.

## Vérification des contrats dans le code

| Sujet documenté | Vérification dans l'implémentation |
| --- | --- |
| Authentification Node | `/api/v1/auth/register`, `/login` et `/me` utilisent le service d'authentification ; les jetons sont signés HS256 et expirent selon `JWT_EXPIRES_IN`. |
| Propriété et persistance | Les routes conversation sont protégées ; `conversation-service.js` compare `owner` au sujet authentifié avant lecture, modification, suppression ou ajout de messages. |
| Schéma MongoDB | `User` : adresse unique, hash non sélectionné par défaut et nom facultatif ; `Conversation` : propriétaire, titre et date du dernier message ; `Message` : conversation, rôle, contenu et horodatages. Les index décrits correspondent aux modèles. |
| Génération Gemini | La clé reste dans Node. Le service utilise jusqu'à 10 messages de contexte, trois tentatives au maximum par modèle pour les statuts transitoires 500/503 et un modèle de repli configuré. Les erreurs 429 ne sont pas retentées. |
| Chat Node | La génération par défaut est activée pour un message utilisateur si Gemini est configuré ; sans clé et sans option explicite, le seul message utilisateur est inséré. `generateReply: false` permet l'insertion sans génération ; `true` sans configuration renvoie 503. Si la génération échoue, la paire utilisateur/assistant n'est pas persistée. |
| Spring REST | `POST /chat`, `GET /conversations`, `GET /conversations/{id}`, `PATCH /conversations/{id}` et `DELETE /conversations/{id}` correspondent au contrôleur. La suppression renvoie 204 ; les autres opérations de lecture/modification renvoient 200 et le chat 201. |
| Chat Spring | Spring crée la conversation via Node avant d'envoyer le message. Sans titre explicite, le titre est dérivé des 60 premiers points de code du message. Un échec Gemini peut donc laisser une conversation vide. |
| JWT Spring/Node | Le filtre Spring valide signature, expiration et subject ObjectId ; le même en-tête Bearer est transmis au client HTTP Node pour une seconde validation et le contrôle de propriété autoritaire. |
| SOAP | Metro publie le WSDL à l'exécution. `compterMots` sépare les groupes d'espaces Unicode ; `statistiques` lit toutes les pages Node, jusqu'à 1 000 pages de 100 messages. |
| Flutter | Inscription/connexion vont vers Node ; le client de chat/historique va vers Spring. Le jeton est conservé via `flutter_secure_storage`. L'invité utilise `MockChatService` et l'état mémoire du widget, sans persistance locale ou distante. |
| Tests Node | `npm test` utilise une base MongoDB locale `hkili_test_*` aléatoire et la supprime en fin de suite. Ce test ne doit pas viser une base de production. |
| Environnements | Node exige Node.js `>=22.9.0`. Maven cible Java 17 et télécharge Maven 3.9.9 ; les vérifications enregistrées ont utilisé JDK 25/JRE 21, donc pas une exécution JDK 17. |

## Écarts et limites relevés

1. **Texte de l'écran Profil en mode invité :** `mobile/lib/screens/profile_screen.dart`
   indique que les messages sont « conservés localement », alors que le code
   conserve seulement l'état en mémoire pendant la session. Le guide a été
   corrigé ; le texte de l'interface reste à corriger lors d'une demande de
   modification source. Le code source n'a pas été modifié dans cet audit.
2. **Adresse Web et CORS de développement :** `api_config.dart`, `app.js` et la
   sécurité Spring incluent l'adresse LAN `192.168.100.116`. Pour le navigateur
   sur la même machine, la procédure d'installation indique des `--dart-define`
   vers `localhost`. Rendre les origines configurables reste une amélioration
   source, non effectuée ici.
3. **JDK 17 :** les résultats Maven précédemment enregistrés ciblent Java 17
   mais ont été exécutés sous JDK 25 ; les processus live utilisaient JRE 21.
   Une validation avec JDK 17 reste à effectuer.
4. **Parcours Flutter manuel :** l'APK a été installée et démarrée dans une
   campagne précédente, mais aucune interaction authentifiée complète n'est
   consignée. Les tests Flutter sont automatisés et ne remplacent pas ce
   parcours.
5. **Gemini :** les diagnostics documentés ont rencontré des réponses 504/429,
   puis une requête live a réussi. Ces observations sont ponctuelles et ne
   garantissent pas la disponibilité actuelle du fournisseur.
6. **Captures :** aucune capture n'est exigée par les documents actuels. Deux
   images locales sont présentes mais non suivies par Git ; elles ne prouvent
   pas l'authentification, la persistance ou l'origine Gemini d'une réponse.
   D'autres écrans/services n'ont pas de capture, sans constituer un manque
   documentaire.
7. **Exemples d'environnement :** le secret JWT vide et la clé Gemini à
   remplacer sont des entrées attendues pour une exécution locale ; aucune
   valeur réelle ne doit être ajoutée au dépôt.

## Liste des fichiers de code examinés

Les éléments ci-dessous ont été lus pour étayer les affirmations documentaires.
Les chemins sont relatifs à la racine du dépôt.

### Backend Node.js

- `backend/package.json`
- `backend/src/app.js`
- `backend/src/config.js`
- `backend/src/db/connection.js`
- `backend/src/load-environment.js`
- `backend/src/logger.js`
- `backend/src/middleware/authenticate.js`
- `backend/src/middleware/error-handler.js`
- `backend/src/middleware/request-logger.js`
- `backend/src/models/conversation.js`
- `backend/src/models/message.js`
- `backend/src/models/user.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/conversations.js`
- `backend/src/server.js`
- `backend/src/services/auth-service.js`
- `backend/src/services/conversation-service.js`
- `backend/src/services/gemini-service.js`
- `backend/src/validation.js`

### Flutter

- `mobile/lib/app/hkili_app.dart`
- `mobile/lib/screens/chat_screen.dart`
- `mobile/lib/screens/history_screen.dart`
- `mobile/lib/screens/login_screen.dart`
- `mobile/lib/screens/main_shell.dart`
- `mobile/lib/screens/profile_screen.dart`
- `mobile/lib/screens/register_screen.dart`
- `mobile/lib/screens/welcome_screen.dart`
- `mobile/lib/services/api_client.dart`
- `mobile/lib/services/api_config.dart`
- `mobile/lib/services/auth_service.dart`
- `mobile/lib/services/chat_api_service.dart`
- `mobile/lib/services/mock_chat_service.dart`
- `mobile/lib/services/token_storage.dart`

### Fichiers de tests consultés

Les noms des cas de test de chaque suite ont été recherchés pour vérifier les
comptages et la portée décrits. Les implémentations ont fait l'objet d'une
lecture ciblée, pas d'une relecture ligne par ligne de toutes les suites.

- `backend/test/api.test.js`
- `backend/test/app.test.js`
- `backend/test/conversations.test.js`
- `backend/test/database.test.js`
- `backend/test/gemini.test.js`
- `backend/test/load-environment.test.js`
- `backend/test/models.test.js`
- `mobile/test/api_client_test.dart`
- `mobile/test/api_config_test.dart`
- `mobile/test/chat_api_service_test.dart`
- `mobile/test/widget_test.dart`
- `soa/jaxws-soap/src/test/java/tn/hkili/soa/soap/HkiliSoapServiceTest.java`
- `soa/spring-rest/src/test/java/tn/hkili/soa/rest/HkiliControllerTest.java`

### Java/SOA

- `soa/pom.xml`
- `soa/common-client/pom.xml`
- `soa/common-client/src/main/java/tn/hkili/soa/client/HttpNodeApiClient.java`
- `soa/common-client/src/main/java/tn/hkili/soa/client/NodeApi.java`
- `soa/common-client/src/main/java/tn/hkili/soa/client/NodeApiException.java`
- `soa/.mvn/wrapper/maven-wrapper.properties`
- `soa/jaxws-soap/pom.xml`
- `soa/jaxws-soap/src/main/java/tn/hkili/soa/soap/HkiliSoapServer.java`
- `soa/jaxws-soap/src/main/java/tn/hkili/soa/soap/HkiliSoapService.java`
- `soa/jaxws-soap/src/main/java/tn/hkili/soa/soap/SoapStatisticsResponse.java`
- `soa/spring-rest/pom.xml`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/HkiliProperties.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/api/ChatRequest.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/api/ChatResponse.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/api/HkiliController.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/api/MessageResponse.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/api/RestExceptionHandler.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/config/NodeApiConfiguration.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/config/OpenApiConfiguration.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/security/BearerJwtFilter.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/security/SecurityConfiguration.java`
- `soa/spring-rest/src/main/java/tn/hkili/soa/rest/service/HkiliService.java`
- `soa/spring-rest/src/main/resources/application.yml`

## Fichiers volontairement non lus

- `backend/.env` : fichier local ignoré susceptible de contenir des secrets ;
  il n'a pas été ouvert ni recherché par son contenu.
- `mobile/android/local.properties` et les fichiers générés de Flutter/Maven :
  paramètres locaux ou artefacts hors du périmètre documentaire.
- Dépendances installées, dossiers de build et `.git` : exclus de l'inventaire
  des documents du projet.

Aucun fichier Markdown pertinent n'était inaccessible. Le marqueur
`$FLUTTER_BASE_HREF` dans `mobile/web/index.html` est une variable de
substitution Flutter à la construction, et non une information de documentation
à compléter. Les nœuds `IBFirstResponder` des storyboards iOS sont des objets
techniques d'Interface Builder, pas des champs d'auteur.

Les suites `npm test`, `flutter analyze` et `flutter test` ont été rejouées et
ont réussi. Les essais live, tests Maven et builds APK/Web mentionnés comme
antérieurs n'ont pas été rejoués dans cette campagne d'audit documentaire.

## Travail restant

### Nécessaire pour une description exacte de l'état actuel

- Corriger dans le code l'affirmation de persistance locale de l'écran Profil
  invité, si une demande ultérieure autorise les modifications source.
- Tester l'exécution Maven avec un JDK 17 et effectuer un parcours mobile
  authentifié sur un émulateur configuré avant de les présenter comme validés.

### Facultatif pour les documents

- Aucune capture ne manque pour compléter la documentation actuelle.
- Si un règlement académique séparé exige des preuves visuelles, produire
  uniquement les vues demandées (historique/profil/invité, Swagger et SoapUI),
  vérifier l'absence de secrets/données personnelles et suivre les images
  voulues dans Git. Les deux images locales existantes sont actuellement non
  suivies ; aucune action Git n'a été prise.
- Configurer les variables locales `JWT_SECRET`, MongoDB et Gemini avant une
  démonstration réelle ; ne pas remplir ces valeurs dans le dépôt.
