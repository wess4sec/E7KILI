package tn.hkili.soa.rest.api;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import tn.hkili.soa.client.NodeApiException;

@RestControllerAdvice
public class RestExceptionHandler {
    @ExceptionHandler(NodeApiException.class)
    public ResponseEntity<ApiErrorResponse> handleNodeError(NodeApiException exception) {
        HttpStatus status = switch (exception.getStatusCode()) {
            case 400 -> HttpStatus.BAD_REQUEST;
            case 401 -> HttpStatus.UNAUTHORIZED;
            case 403 -> HttpStatus.FORBIDDEN;
            case 404 -> HttpStatus.NOT_FOUND;
            case 409 -> HttpStatus.CONFLICT;
            case 422 -> HttpStatus.UNPROCESSABLE_ENTITY;
            case 429 -> HttpStatus.TOO_MANY_REQUESTS;
            case 502 -> HttpStatus.BAD_GATEWAY;
            case 503 -> HttpStatus.SERVICE_UNAVAILABLE;
            case 504 -> HttpStatus.GATEWAY_TIMEOUT;
            default -> exception.getStatusCode() >= 500
                    ? HttpStatus.BAD_GATEWAY
                    : HttpStatus.BAD_REQUEST;
        };
        String message = switch (status) {
            case UNAUTHORIZED -> "Authentication is required";
            case FORBIDDEN -> "Access to this resource is denied";
            case NOT_FOUND -> "The requested resource was not found";
            case TOO_MANY_REQUESTS -> "The AI service is rate limited";
            case SERVICE_UNAVAILABLE -> "The AI service is temporarily unavailable";
            case GATEWAY_TIMEOUT -> "The Hkili backend timed out";
            case BAD_GATEWAY -> "The Hkili backend is unavailable";
            default -> "The request could not be completed";
        };
        return ResponseEntity.status(status).body(error(status.name(), message));
    }

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            ConstraintViolationException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ApiErrorResponse> handleInvalidRequest(Exception exception) {
        return ResponseEntity.badRequest().body(error(
                "INVALID_REQUEST",
                "The request body or parameters are invalid"
        ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidBackendResponse(
            IllegalStateException exception
    ) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error(
                "NODE_INVALID_RESPONSE",
                "The Hkili backend returned an invalid response"
        ));
    }

    private static ApiErrorResponse error(String code, String message) {
        return new ApiErrorResponse(new ApiErrorResponse.ErrorDetail(code, message));
    }
}
