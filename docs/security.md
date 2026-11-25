# Sécurité

## Secrets et configuration

- Conservez `backend/.env` localement et hors du suivi Git. Les fichiers
  `.env.example` ne contiennent que des valeurs d'exemple non sensibles.
- Gardez `GEMINI_API_KEY` uniquement dans l'environnement du backend Node.
- Ne placez pas `JWT_SECRET` dans le code source, les journaux ou l'application
  mobile. Spring doit recevoir la même valeur que Node.
- N'enregistrez jamais de véritables jetons Bearer dans les collections
  Postman ou SoapUI versionnées.

## Authentification et autorisation

Node émet des jetons Bearer signés HS256. Spring en vérifie la signature,
l'expiration et le sujet ObjectId, puis transmet le même jeton à Node. Node
reste l'autorité pour l'identité authentifiée et la propriété des conversations
sur chaque requête relayée. L'opération SOAP `statistiques` requiert aussi un
jeton ; `compterMots` traite uniquement le texte fourni.

## Frontières de données

Flutter et Java ne se connectent ni à MongoDB ni à Gemini. Les services Java
ne dupliquent pas les comptes ou les conversations. Les erreurs API ne
renvoient pas les détails bruts du fournisseur ou du backend. Les exemples de
requêtes utilisent des identifiants synthétiques et ne contiennent pas de
secrets.

## Déploiement

Utilisez HTTPS hors développement local, stockez les secrets dans le gestionnaire
du système de déploiement et remplacez tout secret exposé. Limitez CORS et les
accès réseau. N'enregistrez pas les corps des requêtes, les en-têtes
d'autorisation, les messages ou les identifiants fournisseur dans les journaux.

En développement, Node et Spring n'autorisent que des origines HTTP locales
précises ; la configuration inclut aussi une adresse LAN codée en dur pour le
poste de développement. Le client Flutter écrit les URI et statuts HTTP via
`debugPrint`, et le journal Node inclut le chemin de requête, qui peut contenir
un identifiant de conversation. Ces journaux de développement ne doivent pas
être partagés sans vérification ni utilisés tels quels en production.
