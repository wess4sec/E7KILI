package tn.hkili.soa.rest.service;

import org.springframework.stereotype.Service;
import tn.hkili.soa.client.NodeApi;
import tn.hkili.soa.rest.api.ChatRequest;
import tn.hkili.soa.rest.api.ChatResponse;
import tn.hkili.soa.rest.api.MessageResponse;

import java.util.Map;

@Service
public class HkiliService {
    private final NodeApi nodeApi;

    public HkiliService(NodeApi nodeApi) {
        this.nodeApi = nodeApi;
    }

    public ChatResponse chat(String bearerToken, ChatRequest request) {
        String conversationId = request.conversationId();
        Map<String, Object> conversation;

        if (conversationId == null || conversationId.isBlank()) {
            String title = request.title();
            if (title == null || title.isBlank()) {
                title = initialTitle(request.message());
            }
            Map<String, Object> created = nodeApi.createConversation(
                    Map.of("title", title),
                    bearerToken
            );
            conversation = objectValue(created.get("conversation"));
            conversationId = stringValue(conversation.get("id"));
        } else {
            Map<String, Object> existing = nodeApi.getConversation(
                    conversationId,
                    1,
                    1,
                    bearerToken
            );
            conversation = objectValue(existing.get("conversation"));
        }

        Map<String, Object> generated = nodeApi.generateReply(
                conversationId,
                request.message().trim(),
                bearerToken
        );
        Map<String, Object> userMessage = objectValue(generated.get("userMessage"));
        Map<String, Object> assistantMessage = objectValue(generated.get("message"));

        return new ChatResponse(
                conversationId,
                stringValue(conversation.get("title")),
                toMessage(userMessage),
                toMessage(assistantMessage)
        );
    }

    public Map<String, Object> conversations(
            String bearerToken,
            int page,
            int limit
    ) {
        return nodeApi.listConversations(page, limit, bearerToken);
    }

    public Map<String, Object> conversation(
            String bearerToken,
            String id,
            int page,
            int limit
    ) {
        return nodeApi.getConversation(id, page, limit, bearerToken);
    }

    public Map<String, Object> renameConversation(
            String bearerToken,
            String id,
            String title
    ) {
        return nodeApi.renameConversation(id, title, bearerToken);
    }

    public void deleteConversation(String bearerToken, String id) {
        nodeApi.deleteConversation(id, bearerToken);
    }

    private static String initialTitle(String message) {
        String normalized = message.trim();
        int count = normalized.codePointCount(0, normalized.length());
        int end = normalized.offsetByCodePoints(0, Math.min(60, count));
        return normalized.substring(0, end);
    }

    private static MessageResponse toMessage(Map<String, Object> message) {
        return new MessageResponse(
                stringValue(message.get("id")),
                stringValue(message.get("conversationId")),
                stringValue(message.get("role")),
                stringValue(message.get("content")),
                message.get("createdAt")
        );
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> objectValue(Object value) {
        if (!(value instanceof Map<?, ?>)) {
            throw new IllegalStateException("The Hkili backend response is invalid");
        }
        return (Map<String, Object>) value;
    }

    private static String stringValue(Object value) {
        return value instanceof String text ? text : null;
    }
}
