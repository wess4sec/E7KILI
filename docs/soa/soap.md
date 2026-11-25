# JAX-WS SOAP Service

The `jaxws-soap` Maven module uses Jakarta JAX-WS and Eclipse Metro 4.0.3. It
publishes a SOAP 1.1 endpoint and generates its WSDL at runtime.

Default endpoint: `http://127.0.0.1:8082/soap/hkili`
WSDL: `http://127.0.0.1:8082/soap/hkili?wsdl`
Target namespace: `urn:hkili:soa`

## `compterMots(texte)`

Counts tokens separated by Unicode whitespace. Empty or whitespace-only text
returns zero. Punctuation is not stripped from tokens. This operation
processes only the supplied text and does not require authentication.

Example SOAP 1.1 body:

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

The response contains an integer return value.

## `statistiques(idConversation)`

Requires the HTTP header:

```http
Authorization: Bearer <existing Hkili JWT>
```

The service requests the conversation and its actual messages from Node using
the bearer token. Node validates the user and conversation ownership. The
service returns:

- Conversation ID and stored title.
- Total message count and user/assistant message counts.
- Average words per message, rounded to two decimal places.

Messages are fetched in ascending pages of 100, up to 1,000 pages. An invalid
ObjectId is a client SOAP fault. Missing/expired tokens, ownership denial,
missing conversations, rate limiting, and upstream unavailability map to
sanitized SOAP faults; provider details and tokens are not disclosed.

## SoapUI

Import the runtime WSDL as a new SoapUI project. For `statistiques`, add the
`Authorization` header to the HTTP request. The sample
[statistics request](soapui/statistiques-request.xml) uses a deliberately
non-secret token marker; replace it locally with a valid token.

The WSDL is verified by an automated test that starts a local Metro endpoint
and checks both operation names and the namespace. Runtime publication still
needs to be checked in a local Java 17 environment.
