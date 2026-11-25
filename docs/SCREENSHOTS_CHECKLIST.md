# Inventaire des captures et preuves visuelles

Les livrables documentaires actuels ne dépendent d'aucune capture d'écran. Les
preuves techniques disponibles sont les contrats, les réponses HTTP consignées,
les tests automatisés, les enveloppes SOAP et le WSDL généré au démarrage.
Cette page recense les images trouvées ; elle ne constitue pas une demande de
compléter des captures manquantes.

## Images présentes dans l'espace de travail

| Fichier | Contenu observé | Statut et portée |
| --- | --- | --- |
| `image-1.png` | Écran d'accueil/connexion Flutter, avec champs vides et mode invité | Présent à la racine, non suivi par Git. Illustration de l'interface uniquement ; ne prouve pas une connexion réussie. |
| `image.png` | Écran de chat Flutter avec messages visibles | Présent à la racine, non suivi par Git. Illustration de l'interface uniquement ; ne prouve ni l'appel Gemini réel ni la persistance MongoDB. |

Ces noms de fichiers sont conservés sans déplacement ni modification. Ils ne
sont pas intégrés comme captures dans un livrable ; ils sont cités ici
uniquement pour documenter l'inventaire. Les icônes Android/iOS/Web et images
de lancement du répertoire `mobile/` sont des ressources d'application, pas
des captures de démonstration.

## Vues sans image dédiée

Les vues suivantes ne sont pas représentées dans les deux fichiers présents :

- inscription ;
- historique, renommage et suppression d'une conversation ;
- profil et déconnexion ;
- résultat Swagger/OpenAPI dans un navigateur ;
- appel SOAP `statistiques` dans SoapUI.

**Aucune de ces images n'est requise par la documentation actuelle.** Les tests,
les contrats REST/SOAP et les résultats HTTP consignés restent les preuves
techniques ; une capture seule ne les remplacerait pas. Si une consigne
académique distincte impose une vue précise, elle reste à produire après une
exécution réelle, sans jeton, secret ou donnée personnelle visible.

## État de vérification

- Aucun marqueur incomplet ni commentaire demandant d'insérer une capture n'est
  présent dans les documents du dépôt.
- Le rapport académique ne comporte pas de section de captures à compléter.
- Les deux images racine sont des fichiers non suivis ; elles ne seront pas
  incluses dans un clone ou une archive construite depuis Git tant qu'elles ne
  sont pas ajoutées explicitement.
- Aucun fichier image manquant ne bloque la construction ou la lecture de la
  documentation.
