package tn.hkili.soa.rest.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.hkili.soa.rest.service.HkiliService;

import java.util.Map;

@RestController
@Validated
@RequestMapping
public class HkiliController {
    private final HkiliService hkiliService;

    public HkiliController(HkiliService hkiliService) {
        this.hkiliService = hkiliService;
    }

    @PostMapping("/chat")
    @Operation(summary = "Send a chat message to Hkili")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader("Authorization") String bearerToken
    ) {
        ChatResponse response = hkiliService.chat(bearerToken, request);
        return ResponseEntity.status(201).body(response);
    }

    @GetMapping("/conversations")
    @Operation(summary = "List the authenticated user's conversations")
    @SecurityRequirement(name = "bearerAuth")
    public Map<String, Object> conversations(
            @RequestHeader("Authorization") String bearerToken,
            @RequestParam(defaultValue = "1") @Min(1) @Max(1_000_000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        return hkiliService.conversations(bearerToken, page, limit);
    }

    @GetMapping("/conversations/{id}")
    @Operation(summary = "Get a conversation and its messages")
    @SecurityRequirement(name = "bearerAuth")
    public Map<String, Object> conversation(
            @PathVariable @Pattern(regexp = "^[a-fA-F0-9]{24}$") String id,
            @RequestHeader("Authorization") String bearerToken,
            @RequestParam(defaultValue = "1") @Min(1) @Max(1_000_000) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit
    ) {
        return hkiliService.conversation(bearerToken, id, page, limit);
    }

    @PatchMapping("/conversations/{id}")
    @Operation(summary = "Rename an owned conversation")
    @SecurityRequirement(name = "bearerAuth")
    public Map<String, Object> rename(
            @PathVariable @Pattern(regexp = "^[a-fA-F0-9]{24}$") String id,
            @RequestHeader("Authorization") String bearerToken,
            @Valid @RequestBody RenameConversationRequest request
    ) {
        return hkiliService.renameConversation(bearerToken, id, request.title().trim());
    }

    @DeleteMapping("/conversations/{id}")
    @Operation(summary = "Delete an owned conversation and its messages")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<Void> delete(
            @PathVariable @Pattern(regexp = "^[a-fA-F0-9]{24}$") String id,
            @RequestHeader("Authorization") String bearerToken
    ) {
        hkiliService.deleteConversation(bearerToken, id);
        return ResponseEntity.noContent().build();
    }

    public record RenameConversationRequest(
            @jakarta.validation.constraints.NotBlank
            @Size(max = 120)
            String title
    ) {
    }
}
