package tn.hkili.soa.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.ConnectException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

public final class HttpNodeApiClient implements NodeApi {
    private static final TypeReference<Map<String, Object>> JSON_OBJECT =
            new TypeReference<>() {};

    private final URI apiBaseUri;
    private final Duration requestTimeout;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public HttpNodeApiClient(
            String apiBaseUrl,
            Duration connectTimeout,
            Duration requestTimeout,
            ObjectMapper objectMapper
    ) {
        this.apiBaseUri = URI.create(stripTrailingSlash(apiBaseUrl));
        this.requestTimeout = requestTimeout;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(connectTimeout)
                .build();
    }

    @Override
    public Map<String, Object> createConversation(
            Map<String, Object> request,
            String bearerToken
    ) {
        return send("POST", "/conversations", request, bearerToken);
    }

    @Override
    public Map<String, Object> listConversations(
            int page,
            int limit,
            String bearerToken
    ) {
        return send(
                "GET",
                "/conversations?page=" + page + "&limit=" + limit,
                null,
                bearerToken
        );
    }

    @Override
    public Map<String, Object> getConversation(
            String conversationId,
            int page,
            int limit,
            String bearerToken
    ) {
        return send(
                "GET",
                "/conversations/" + encodePathSegment(conversationId)
                        + "?page=" + page + "&limit=" + limit,
                null,
                bearerToken
        );
    }

    @Override
    public Map<String, Object> renameConversation(
            String conversationId,
            String title,
            String bearerToken
    ) {
        return send(
                "PATCH",
                "/conversations/" + encodePathSegment(conversationId),
                Map.of("title", title),
                bearerToken
        );
    }

    @Override
    public void deleteConversation(String conversationId, String bearerToken) {
        send(
                "DELETE",
                "/conversations/" + encodePathSegment(conversationId),
                null,
                bearerToken
        );
    }

    @Override
    public Map<String, Object> generateReply(
            String conversationId,
            String content,
            String bearerToken
    ) {
        return send(
                "POST",
                "/conversations/" + encodePathSegment(conversationId) + "/messages",
                Map.of("content", content, "generateReply", true),
                bearerToken
        );
    }

    private Map<String, Object> send(
            String method,
            String path,
            Map<String, Object> body,
            String bearerToken
    ) {
        HttpRequest.Builder request = HttpRequest.newBuilder(resolve(path))
                .timeout(requestTimeout)
                .header("Accept", "application/json")
                .header("Authorization", bearerToken);
        if (body == null) {
            request.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            request.header("Content-Type", "application/json")
                    .method(method, HttpRequest.BodyPublishers.ofString(
                            serialize(body),
                            StandardCharsets.UTF_8
                    ));
        }

        HttpResponse<String> response;
        try {
            response = httpClient.send(
                    request.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new NodeApiException(503, "NODE_SERVICE_UNAVAILABLE", exception);
        } catch (HttpConnectTimeoutException | ConnectException exception) {
            throw new NodeApiException(503, "NODE_SERVICE_UNAVAILABLE", exception);
        } catch (HttpTimeoutException exception) {
            throw new NodeApiException(504, "NODE_SERVICE_TIMEOUT", exception);
        } catch (IOException exception) {
            throw new NodeApiException(503, "NODE_SERVICE_UNAVAILABLE", exception);
        } catch (IllegalArgumentException exception) {
            throw new NodeApiException(502, "NODE_INVALID_RESPONSE", exception);
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw upstreamError(response.statusCode(), response.body());
        }
        if (response.statusCode() == 204 || response.body().isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(response.body(), JSON_OBJECT);
        } catch (IOException exception) {
            throw new NodeApiException(502, "NODE_INVALID_RESPONSE", exception);
        }
    }

    private NodeApiException upstreamError(int statusCode, String responseBody) {
        String code = "NODE_SERVICE_ERROR";
        try {
            Map<String, Object> envelope = objectMapper.readValue(
                    responseBody,
                    JSON_OBJECT
            );
            Object error = envelope.get("error");
            if (error instanceof Map<?, ?> errorObject
                    && errorObject.get("code") instanceof String upstreamCode
                    && upstreamCode.matches("[A-Z0-9_]{1,60}")) {
                code = upstreamCode;
            }
        } catch (IOException ignored) {
            code = "NODE_SERVICE_ERROR";
        }
        return new NodeApiException(statusCode, code);
    }

    private String serialize(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (IOException exception) {
            throw new NodeApiException(500, "NODE_REQUEST_SERIALIZATION_FAILED", exception);
        }
    }

    private URI resolve(String path) {
        return URI.create(apiBaseUri + (path.startsWith("/") ? path : "/" + path));
    }

    private static String encodePathSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20");
    }

    private static String stripTrailingSlash(String value) {
        String normalized = value.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
