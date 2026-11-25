# API Node.js

L'API Express versionnée est servie sous `/api/v1`. Elle reste responsable de
l'authentification, des règles métier, de MongoDB et de Gemini. La façade
Spring complémentaire est décrite dans [docs/soa/rest-api.md](soa/rest-api.md).

## Conventions

- Les corps et réponses utilisent JSON.
- Les routes protégées requièrent un jeton Bearer émis par l'inscription ou
  la connexion.
- Node vérifie la propriété d'une conversation avant de la lire, modifier ou
  supprimer.
- Les erreurs utilisent une enveloppe JSON cohérente.

## Configuration du backend

Créez `backend/.env` depuis `.env.example` uniquement s'il n'existe pas déjà,
puis renseignez localement les paramètres nécessaires. Node charge ce fichier
au démarrage ; les variables d'environnement non vides ont priorité. MongoDB
et JWT sont requis. Une clé Google Gemini valide est nécessaire pour générer
des réponses ; sans clé, les demandes d'IA renvoient une erreur de service.

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `PORT` | Non | Port HTTP, `3000` par défaut |
| `NODE_ENV` | Non | `development`, `test` ou `production` |
| `MONGODB_URI` | Oui | URI de connexion MongoDB |
| `JWT_SECRET` | Oui | Secret HMAC d'au moins 32 octets UTF-8 |
| `JWT_EXPIRES_IN` | Non | Durée du jeton, par exemple `1h` |
| `BCRYPT_ROUNDS` | Non | Coût bcrypt de 10 à 14, valeur par défaut 12 |
| `GEMINI_API_KEY` | Non | Clé API Gemini ; sans valeur, l'IA est désactivée |
| `GEMINI_MODEL` | Non | Modèle principal |
| `GEMINI_FALLBACK_MODEL` | Non | Modèle de repli, distinct du modèle principal |

La commande `npm run diagnose:gemini`, depuis `backend/`, interroge réellement
Google pour lister les modèles disponibles et tenter une génération minimale.
Elle peut consommer du quota. Les erreurs 500/503 font l'objet de reprises
bornées ; les erreurs de quota et d'authentification ne sont pas relancées.
La clé n'est pas affichée.

## Santé

### `GET /api/v1/health`

Cette route publique confirme que le processus répond. Elle ne vérifie pas la
disponibilité de MongoDB ni de Gemini. La réponse `200` contient le champ
`status`.

## Authentification

### `POST /api/v1/auth/register`

Crée un compte.

```json
{
  "email": "utilisateur@example.com",
  "password": "un-mot-de-passe",
  "name": "Utilisateur"
}
```

`email` est requis et doit respecter le format d'adresse ; `password` doit
contenir au moins 8 caractères et au plus 72 octets UTF-8 ; `name` est
facultatif et limité à 80 caractères.

Réponse `201` : objet `user` (identifiant, adresse, nom et horodatages) et
jeton `token`.

### `POST /api/v1/auth/login`

Authentifie un compte avec `email` et `password`. Réponse `200` contenant
`user` et `token`. Les identifiants invalides renvoient `401`.

### `GET /api/v1/auth/me`

Renvoie l'objet `user` associé au jeton. Cette route requiert
l'authentification Bearer.

## Conversations

Toutes les routes de cette section requièrent un jeton Bearer.
L'accès à la conversation d'un autre utilisateur renvoie `403`.

### `POST /api/v1/conversations`

Crée une conversation. Le corps JSON peut contenir un `title` facultatif, de
120 caractères au plus. Réponse `201` contenant l'objet `conversation` avec
`id`, `title`, `ownerId`, `lastMessageAt` et les horodatages. Si le titre est
omis, le backend utilise `New conversation`.

### `GET /api/v1/conversations`

Liste les conversations du compte, de la plus récente à la plus ancienne.
Les paramètres `page` (défaut 1) et `limit` (défaut 20, maximum 100)
contrôlent la pagination. Réponse `200` contenant `conversations` et
`pagination`.

### `GET /api/v1/conversations/:id`

Renvoie une conversation et ses messages dans l'ordre chronologique. Les
paramètres de pagination sont les mêmes que pour la liste. La réponse contient
`conversation`, `messages` et `pagination`.

### `PATCH /api/v1/conversations/:id`

Renomme une conversation avec un corps JSON contenant `title`. Réponse `200`
avec l'objet `conversation` mis à jour.

### `DELETE /api/v1/conversations/:id`

Supprime la conversation et ses messages associés. Réponse `200` avec
`success: true`.

## Messages

### `POST /api/v1/conversations/:id/messages`

Corps JSON requis :

```json
{
  "content": "Parle-moi de la médina de Tunis",
  "role": "user"
}
```

`content` contient de 1 à 10 000 caractères. `role` accepte `user` ou
`assistant` et vaut `user` par défaut. `generateReply` est un booléen facultatif.
Lorsqu'une réponse Gemini est demandée et générée avec succès, le backend
enregistre le message utilisateur et la réponse assistant, puis renvoie `201`
avec les objets `message` et `userMessage`. Si la génération échoue, aucune
paire de messages n'est enregistrée. Avec `generateReply: false`, la route
permet une insertion sans génération.

### `GET /api/v1/conversations/:id/messages`

Renvoie les messages chronologiques et leurs métadonnées de pagination.
Les paramètres `page` et `limit` ont les mêmes valeurs par défaut et limites
que les routes de conversation.

## Erreurs

Le corps d'erreur contient `error.code` et `error.message`. Les codes HTTP
utilisés comprennent :

| Code | Signification |
| --- | --- |
| `400` | Entrée, pagination ou JSON invalide |
| `401` | Authentification absente, invalide ou expirée |
| `403` | Ressource appartenant à un autre compte |
| `404` | Route ou ressource inexistante |
| `409` | Adresse déjà enregistrée |
| `413` | Corps de requête supérieur à 16 Kio |
| `422` | Réponse IA bloquée |
| `429` | Limite de débit ou quota Gemini |
| `502` | Réponse fournisseur invalide ou rejetée |
| `503` | Service ou configuration indisponible |
| `504` | Délai d'attente fournisseur dépassé |
| `500` | Erreur interne filtrée |

Les détails internes du backend et les réponses brutes de Gemini ne sont pas
renvoyés au client.
