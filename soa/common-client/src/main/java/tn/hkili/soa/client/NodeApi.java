package tn.hkili.soa.client;

import java.util.Map;

public interface NodeApi {
    Map<String, Object> createConversation(
            Map<String, Object> request,
            String bearerToken
    );

    Map<String, Object> listConversations(
            int page,
            int limit,
            String bearerToken
    );

    Map<String, Object> getConversation(
            String conversationId,
            int page,
            int limit,
            String bearerToken
    );

    Map<String, Object> renameConversation(
            String conversationId,
            String title,
            String bearerToken
    );

    void deleteConversation(String conversationId, String bearerToken);

    Map<String, Object> generateReply(
            String conversationId,
            String content,
            String bearerToken
    );
}
