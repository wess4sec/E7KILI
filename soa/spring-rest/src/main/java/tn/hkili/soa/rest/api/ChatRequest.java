package tn.hkili.soa.rest.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChatRequest(
        @NotBlank
        @Size(max = 10_000)
        String message,
        @Pattern(regexp = "^[a-fA-F0-9]{24}$")
        String conversationId,
        @Size(max = 120)
        String title
) {
}
