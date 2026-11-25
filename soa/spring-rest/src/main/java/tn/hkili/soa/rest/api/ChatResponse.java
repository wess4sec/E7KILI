package tn.hkili.soa.rest.api;

public record ChatResponse(
        String conversationId,
        String conversationTitle,
        MessageResponse userMessage,
        MessageResponse assistantMessage
) {
}
