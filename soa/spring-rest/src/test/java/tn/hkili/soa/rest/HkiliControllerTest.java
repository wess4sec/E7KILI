package tn.hkili.soa.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tn.hkili.soa.client.NodeApi;
import tn.hkili.soa.client.NodeApiException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HkiliControllerTest {
    private static final String USER_ID = "6740b01c38e91d0e12345678";
    private static final String CONVERSATION_ID = "6740b02a38e91d0e12345679";
    private static final String SECRET = "test-secret-for-hkili-jwt-validation-32-bytes-minimum";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private NodeApi nodeApi;

    private String token;

    @BeforeEach
    void createToken() {
        Instant now = Instant.now();
        token = Jwts.builder()
                .subject(USER_ID)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(600)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    @Test
    void requiresBearerToken() throws Exception {
        mockMvc.perform(get("/conversations"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));
    }

    @Test
    void allowsFlutterWebPreflightFromConfiguredLanHost() throws Exception {
        mockMvc.perform(options("/chat")
                        .header("Origin", "http://192.168.100.116:51234")
                        .header("Access-Control-Request-Method", "POST")
                        .header(
                                "Access-Control-Request-Headers",
                                "authorization,content-type"
                        ))
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Access-Control-Allow-Origin",
                        "http://192.168.100.116:51234"
                ));
    }

    @Test
    void rejectsMalformedAndExpiredTokens() throws Exception {
        mockMvc.perform(get("/conversations")
                        .header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listsOnlyConversationsFromNodeForTheForwardedToken() throws Exception {
        when(nodeApi.listConversations(1, 20, "Bearer " + token))
                .thenReturn(Map.of("conversations", List.of(), "pagination", Map.of()));

        mockMvc.perform(get("/conversations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conversations").isArray());

        verify(nodeApi).listConversations(1, 20, "Bearer " + token);
    }

    @Test
    void createsConversationAndReturnsRealNodeChatMessages() throws Exception {
        Map<String, Object> conversation = Map.of(
                "id", CONVERSATION_ID,
                "title", "Aaslema"
        );
        when(nodeApi.createConversation(anyMap(), eq("Bearer " + token)))
                .thenReturn(Map.of("conversation", conversation));
        when(nodeApi.generateReply(
                eq(CONVERSATION_ID),
                eq("Aaslema"),
                eq("Bearer " + token)
        )).thenReturn(Map.of(
                "userMessage", Map.of(
                        "id", "6740b04c38e91d0e12345680",
                        "conversationId", CONVERSATION_ID,
                        "role", "user",
                        "content", "Aaslema",
                        "createdAt", "2026-11-25T16:30:00.000Z"
                ),
                "message", Map.of(
                        "id", "6740b04c38e91d0e12345681",
                        "conversationId", CONVERSATION_ID,
                        "role", "assistant",
                        "content", "Aaslema !",
                        "createdAt", "2026-11-25T16:30:01.000Z"
                )
        ));

        mockMvc.perform(post("/chat")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("message", "Aaslema")
                        )))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.conversationId").value(CONVERSATION_ID))
                .andExpect(jsonPath("$.userMessage.content").value("Aaslema"))
                .andExpect(jsonPath("$.assistantMessage.content").value("Aaslema !"));
    }

    @Test
    void rejectsBlankChatMessage() throws Exception {
        mockMvc.perform(post("/chat")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
    }

    @Test
    void continuesOwnedConversationUsingNodeAndReturnsItsTitle() throws Exception {
        when(nodeApi.getConversation(CONVERSATION_ID, 1, 1, "Bearer " + token))
                .thenReturn(Map.of(
                        "conversation", Map.of(
                                "id", CONVERSATION_ID,
                                "title", "Existing conversation"
                        )
                ));
        when(nodeApi.generateReply(
                eq(CONVERSATION_ID),
                eq("Continue"),
                eq("Bearer " + token)
        )).thenReturn(Map.of(
                "userMessage", Map.of(
                        "id", "user-message-id",
                        "conversationId", CONVERSATION_ID,
                        "role", "user",
                        "content", "Continue",
                        "createdAt", "2026-11-25T16:30:00.000Z"
                ),
                "message", Map.of(
                        "id", "assistant-message-id",
                        "conversationId", CONVERSATION_ID,
                        "role", "assistant",
                        "content", "Aaslema !",
                        "createdAt", "2026-11-25T16:30:01.000Z"
                )
        ));

        mockMvc.perform(post("/chat")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "Continue",
                                "conversationId", CONVERSATION_ID
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.conversationTitle")
                        .value("Existing conversation"))
                .andExpect(jsonPath("$.assistantMessage.content").value("Aaslema !"));
    }

    @Test
    void mapsNodeOwnershipFailureWithoutLeakingUpstreamDetails() throws Exception {
        when(nodeApi.getConversation(CONVERSATION_ID, 1, 50, "Bearer " + token))
                .thenThrow(new NodeApiException(403, "FORBIDDEN"));

        mockMvc.perform(get("/conversations/" + CONVERSATION_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(
                        "Access to this resource is denied"
                ));
    }

    @Test
    void deletesThroughNodeOnlyAfterAuthenticatedRequest() throws Exception {
        doNothing().when(nodeApi).deleteConversation(
                CONVERSATION_ID,
                "Bearer " + token
        );

        mockMvc.perform(delete("/conversations/" + CONVERSATION_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        verify(nodeApi).deleteConversation(CONVERSATION_ID, "Bearer " + token);
    }

    @Test
    void exposesOpenApiDocumentation() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").exists())
                .andExpect(jsonPath("$.paths['/chat'].post").exists());
    }
}
