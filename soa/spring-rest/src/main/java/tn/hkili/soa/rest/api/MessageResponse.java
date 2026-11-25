package tn.hkili.soa.rest.api;

public record MessageResponse(
        String id,
        String conversationId,
        String role,
        String content,
        Object createdAt
) {
}
