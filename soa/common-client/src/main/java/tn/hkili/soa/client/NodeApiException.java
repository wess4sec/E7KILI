package tn.hkili.soa.client;

public final class NodeApiException extends RuntimeException {
    private final int statusCode;
    private final String errorCode;

    public NodeApiException(int statusCode, String errorCode) {
        super("The Hkili backend request failed");
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    public NodeApiException(int statusCode, String errorCode, Throwable cause) {
        super("The Hkili backend request failed", cause);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
