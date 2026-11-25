# User Guide

## Sign in

Open Hkili and choose the sign-in or registration flow. Authenticated account
creation and login use the Node backend. The session token is stored by the
mobile application and sent as a Bearer token for protected service requests.

## Guest mode

Guest mode opens the existing local demonstration chat. It does not create
server conversations or persist messages in MongoDB.

## Chat

For an authenticated session, enter a message and submit it. Flutter sends the
request to the Spring REST façade; Spring validates the token and forwards the
request to Node. Node handles persistence and Gemini generation. A temporary
service error is shown in French; the composer retains the text so it can be
retried.

## Conversation history

Use the history screen to list conversations and open their messages. Available
actions include renaming and deleting a conversation. Node enforces that the
authenticated account owns the selected conversation.

## Profile and logout

The profile displays the signed-in account details. Logging out clears the
locally stored token. Login, history, and chat behavior require the backend
services to be running.

## Service documentation

Administrators and testers can view Spring's Swagger UI at
`http://localhost:8081/swagger-ui.html` and import the SOAP WSDL at
`http://localhost:8082/soap/hkili?wsdl`. SOAP statistics require a valid
existing Hkili bearer token.
