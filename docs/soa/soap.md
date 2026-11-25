# Service SOAP JAX-WS

Le module Maven `jaxws-soap` utilise Jakarta JAX-WS et Eclipse Metro 4.0.3. Il
publie un service SOAP 1.1 et produit le WSDL au démarrage.

- Point d'accès par défaut : `http://127.0.0.1:8082/soap/hkili`
- WSDL : `http://127.0.0.1:8082/soap/hkili?wsdl`
- Espace de noms : `urn:hkili:soa`

## `compterMots(texte)`

Compte les éléments séparés par des espaces Unicode. Un texte vide ou
composé uniquement d'espaces produit zéro. La ponctuation n'est pas retirée.
L'opération traite le texte transmis et ne requiert pas d'authentification.

Exemple de corps SOAP 1.1 :

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:hk="urn:hkili:soa">
  <soap:Body>
    <hk:compterMots>
      <texte>Aaslema, Hkili !</texte>
    </hk:compterMots>
  </soap:Body>
</soap:Envelope>
```

La réponse SOAP contient une valeur entière.

## `statistiques(idConversation)`

Cette opération requiert un en-tête HTTP `Authorization` portant un jeton
Bearer Hkili valide. Le client obtient ce jeton en se connectant à Node ; aucun
secret ni jeton n'est fourni dans les fichiers du dépôt.

Le service demande à Node la conversation et ses messages réels. Node vérifie
l'identité et la propriété. Le résultat comprend l'identifiant et le titre de
la conversation, le nombre total de messages, les nombres de messages par rôle
et la moyenne de mots par message arrondie à deux décimales.

Le service lit des pages de 100 messages au plus, jusqu'à 1 000 pages. Un
ObjectId invalide est une faute SOAP cliente. Jeton absent ou expiré, refus de
propriété, conversation inexistante, limite de débit et indisponibilité amont
produisent des fautes SOAP filtrées. Les secrets et détails du fournisseur ne
sont pas renvoyés.

## SoapUI

Importez le WSDL accessible lorsque Metro est démarré. Pour `statistiques`,
ajoutez le jeton du compte de test dans l'en-tête HTTP de la requête ; ne
l'enregistrez pas dans le dépôt. Le fichier
[statistiques-request.xml](soapui/statistiques-request.xml) contient le corps
SOAP et un identifiant d'exemple au format ObjectId ; pour obtenir une réponse
réelle, utilisez l'identifiant d'une conversation existante.

Les tests automatisés démarrent un endpoint Metro local et vérifient le WSDL
et les deux opérations avec des données de test. Une vérification live a
également calculé les statistiques d'une conversation temporaire réellement
persistée.
