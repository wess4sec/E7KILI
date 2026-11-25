package tn.hkili.soa.rest;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@ConfigurationProperties(prefix = "hkili")
public class HkiliProperties {
    private String nodeApiBaseUrl = "http://127.0.0.1:3000/api/v1";
    private String jwtSecret = "";
    private Duration nodeConnectTimeout = Duration.ofSeconds(5);
    private Duration nodeRequestTimeout = Duration.ofSeconds(50);

    public String getNodeApiBaseUrl() {
        return nodeApiBaseUrl;
    }

    public void setNodeApiBaseUrl(String nodeApiBaseUrl) {
        this.nodeApiBaseUrl = nodeApiBaseUrl;
    }

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public Duration getNodeConnectTimeout() {
        return nodeConnectTimeout;
    }

    public void setNodeConnectTimeout(Duration nodeConnectTimeout) {
        this.nodeConnectTimeout = nodeConnectTimeout;
    }

    public Duration getNodeRequestTimeout() {
        return nodeRequestTimeout;
    }

    public void setNodeRequestTimeout(Duration nodeRequestTimeout) {
        this.nodeRequestTimeout = nodeRequestTimeout;
    }

    public void validate() {
        if (nodeApiBaseUrl == null || !nodeApiBaseUrl.matches("^https?://.+")) {
            throw new IllegalStateException("NODE_API_BASE_URL must be an HTTP(S) URL");
        }
        if (jwtSecret == null
                || jwtSecret.isBlank()
                || jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be configured and contain at least 32 UTF-8 bytes"
            );
        }
        if (nodeConnectTimeout == null || nodeConnectTimeout.isNegative()
                || nodeConnectTimeout.isZero()
                || nodeRequestTimeout == null || nodeRequestTimeout.isNegative()
                || nodeRequestTimeout.isZero()) {
            throw new IllegalStateException("Node API timeouts must be positive");
        }
    }
}
