package tn.hkili.soa.rest.api;

public record ApiErrorResponse(ErrorDetail error) {
    public record ErrorDetail(String code, String message) {
    }
}
