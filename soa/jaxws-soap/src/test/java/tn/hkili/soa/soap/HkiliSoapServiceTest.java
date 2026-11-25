package tn.hkili.soa.soap;

import jakarta.xml.ws.Endpoint;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tn.hkili.soa.client.NodeApi;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HkiliSoapServiceTest {
    private static final String CONVERSATION_ID = "6740b02a38e91d0e12345679";
    private static final String TOKEN = "Bearer test-token";
    private static Endpoint endpoint;
    private static int port;
    private static NodeApi nodeApi;

    @BeforeAll
    static void publishEndpoint() throws IOException {
        nodeApi = mock(NodeApi.class);
        for (int attempt = 0; attempt < 10; attempt++) {
            try (ServerSocket socket = new ServerSocket(0)) {
                port = socket.getLocalPort();
            }
            try {
                endpoint = Endpoint.publish(
                        "http://127.0.0.1:" + port + "/soap/hkili",
                        new HkiliSoapService(nodeApi)
                );
                return;
            } catch (RuntimeException exception) {
                if (attempt == 9) {
                    throw exception;
                }
            }
        }
        throw new IllegalStateException("Unable to publish test SOAP endpoint");
    }

    @AfterAll
    static void stopEndpoint() {
        if (endpoint != null) {
            endpoint.stop();
        }
    }

    @Test
    void publishesValidWsdl() throws Exception {
        HttpResponse<String> response = request(
                "GET",
                "http://127.0.0.1:" + port + "/soap/hkili?wsdl",
                null,
                null
        );
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("compterMots"));
        assertTrue(response.body().contains("statistiques"));
        assertTrue(response.body().contains("urn:hkili:soa"));
    }

    @Test
    void countsWordsUsingUnicodeWhitespaceSeparators() throws Exception {
        String envelope = """
                <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
                               xmlns:hk="urn:hkili:soa">
                  <soap:Body>
                    <hk:compterMots><texte>Hkili, est\tun assistant</texte></hk:compterMots>
                  </soap:Body>
                </soap:Envelope>
                """;
        HttpResponse<String> response = request(
                "POST",
                "http://127.0.0.1:" + port + "/soap/hkili",
                envelope,
                null
        );
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("<return>4</return>"));
    }

    @Test
    void requiresBearerTokenForRealConversationStatistics() throws Exception {
        String envelope = statisticsRequest();
        HttpResponse<String> response = request(
                "POST",
                "http://127.0.0.1:" + port + "/soap/hkili",
                envelope,
                null
        );
        assertEquals(500, response.statusCode());
        assertTrue(response.body().contains("A bearer token is required"));
    }

    @Test
    void returnsStatisticsCalculatedFromNodeConversationMessages() throws Exception {
        when(nodeApi.getConversation(
                eq(CONVERSATION_ID),
                eq(1),
                eq(100),
                eq(TOKEN)
        )).thenReturn(Map.of(
                "conversation", Map.of(
                        "id", CONVERSATION_ID,
                        "title", "Test réel"
                ),
                "messages", List.of(
                        Map.of(
                                "role", "user",
                                "content", "Aaslema Hkili"
                        ),
                        Map.of(
                                "role", "assistant",
                                "content", "Aaslema, bien sûr"
                        )
                ),
                "pagination", Map.of("total", 2, "totalPages", 1)
        ));

        HttpResponse<String> response = request(
                "POST",
                "http://127.0.0.1:" + port + "/soap/hkili",
                statisticsRequest(),
                TOKEN
        );
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("<titre>Test réel</titre>"));
        assertTrue(response.body().contains("<nombreTotalMessages>2</nombreTotalMessages>"));
        assertTrue(response.body().contains("<nombreMessagesUtilisateur>1</nombreMessagesUtilisateur>"));
        assertTrue(response.body().contains("<nombreMessagesAssistant>1</nombreMessagesAssistant>"));
        assertTrue(response.body().contains("<moyenneMotsParMessage>2.50</moyenneMotsParMessage>"));
    }

    private static String statisticsRequest() {
        return """
                <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
                               xmlns:hk="urn:hkili:soa">
                  <soap:Header/>
                  <soap:Body>
                    <hk:statistiques>
                      <idConversation>6740b02a38e91d0e12345679</idConversation>
                    </hk:statistiques>
                  </soap:Body>
                </soap:Envelope>
                """;
    }

    private static HttpResponse<String> request(
            String method,
            String url,
            String body,
            String authorization
    ) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(url));
        if (body != null) {
            request.header("Content-Type", "text/xml; charset=utf-8");
            if (authorization != null) {
                request.header("Authorization", authorization);
            }
            request.POST(HttpRequest.BodyPublishers.ofString(body));
        } else {
            request.GET();
        }
        return HttpClient.newHttpClient().send(
                request.build(),
                HttpResponse.BodyHandlers.ofString()
        );
    }
}
