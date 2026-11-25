# Guide d'utilisation

## Connexion

Ouvrez Hkili et choisissez la connexion ou l'inscription. L'authentification
passe par le backend Node. L'application conserve le jeton dans son stockage
sécurisé et le transmet aux services protégés sous forme de jeton Bearer.

## Mode invité

Le mode invité ouvre le chat local de démonstration. Il ne crée pas de
conversation côté serveur et ne conserve pas les messages dans MongoDB.

## Chat

Dans une session authentifiée, saisissez un message puis envoyez-le. Flutter
transmet la demande à la façade REST Spring, qui vérifie le jeton et relaie la
demande à Node. Node gère la persistance et la génération Gemini. En cas
d'erreur temporaire, l'application affiche un message en français et conserve
le texte saisi.

## Historique des conversations

L'écran d'historique permet de consulter les conversations et leurs messages,
de modifier leur titre et de les supprimer. Node vérifie que le compte
authentifié possède la conversation.

## Profil et déconnexion

Le profil affiche les informations du compte connecté. La déconnexion supprime
le jeton conservé localement. Les fonctions de connexion, d'historique et de
chat authentifié nécessitent les services backend en fonctionnement.

## Interfaces de service

Swagger UI est disponible à `http://localhost:8081/swagger-ui.html` lorsque
Spring est lancé. Le WSDL SOAP est publié à
`http://localhost:8082/soap/hkili?wsdl`. L'opération SOAP `statistiques`
nécessite un jeton Hkili valide.
