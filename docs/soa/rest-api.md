# API REST Spring

La façade Spring Boot écoute sur le port `8081` par défaut. Elle relaie les
opérations à l'API Node existante et ne possède pas ses propres données.

Les routes métier exigent un jeton Bearer Hkili. Spring vérifie la signature
HS256, l'expiration et le sujet ObjectId avec le `JWT_SECRET` partagé. Node
reçoit le même jeton et vérifie à nouveau l'identité et la propriété des
conversations.

- JSON OpenAPI : `GET /v3/api-docs`
- Swagger UI : `GET /swagger-ui.html`

Le jeton utilisé doit provenir de l'inscription ou de la connexion auprès de
Node ; aucun jeton n'est inclus dans la documentation.

## `POST /chat`

Envoie un message utilisateur. Après une génération Gemini réussie, Node
persiste le message utilisateur et la réponse assistant. Le client reçoit
`201 Created`.

Corps JSON :

```json
{
  "message": "Aaslema Hkili",
  "title": "Titre facultatif pour une nouvelle conversation"
}
```

`message` est requis et limité à 10 000 caractères. `conversationId` est
facultatif et doit être un ObjectId hexadécimal de 24 caractères. `title` est
facultatif, limité à 120 caractères et utilisé uniquement lors de la création
d'une conversation.

La réponse `201` contient `conversationId`, `conversationTitle`,
`userMessage` et `assistantMessage`. Chaque message comprend son identifiant,
celui de la conversation, son rôle, son contenu et sa date de création. Il
s'agit du contrat documenté ; les valeurs varient selon la requête réelle.
Node crée une conversation avant la génération. Si celle-ci échoue, Flutter
conserve le texte non envoyé et une conversation vide peut rester dans Node.

## `GET /conversations`

Liste les conversations du compte via Node. Les paramètres sont `page` (défaut
1) et `limit` (défaut 20, maximum 100). Réponse `200` contenant `conversations`
et `pagination`.

## Routes utilisées par l'historique Flutter

- `GET /conversations/{id}?page=1&limit=50` renvoie la conversation, les
  messages et les métadonnées de pagination de Node.
- `PATCH /conversations/{id}` avec un corps JSON contenant `title` renomme la
  conversation par l'intermédiaire de Node.

Ces opérations exigent le même jeton ; Node vérifie la propriété.

## `DELETE /conversations/{id}`

Supprime par Node la conversation et ses messages associés. Réponse
`204 No Content`.

## Erreurs

L'enveloppe JSON contient `error.code` et `error.message`. La façade utilise
les statuts suivants :

| Statut | Signification |
| --- | --- |
| `400` | Validation de requête échouée |
| `401` | Jeton absent, invalide ou expiré |
| `403` | Conversation appartenant à un autre compte |
| `404` | Ressource inexistante |
| `429` | Limite de débit ou quota |
| `502` | Réponse amont invalide |
| `503` | API Node indisponible |
| `504` | Délai d'attente amont dépassé |

Les messages bruts de Node ou Gemini ne sont pas transmis au client.
