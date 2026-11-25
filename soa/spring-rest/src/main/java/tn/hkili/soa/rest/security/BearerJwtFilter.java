package tn.hkili.soa.rest.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.filter.OncePerRequestFilter;
import tn.hkili.soa.rest.HkiliProperties;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Pattern;

public class BearerJwtFilter extends OncePerRequestFilter {
    private static final Pattern OBJECT_ID = Pattern.compile("^[a-fA-F0-9]{24}$");

    private final SecretKey signingKey;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public BearerJwtFilter(
            HkiliProperties properties,
            AuthenticationEntryPoint authenticationEntryPoint
    ) {
        properties.validate();
        this.signingKey = Keys.hmacShaKeyFor(
                properties.getJwtSecret().getBytes(StandardCharsets.UTF_8)
        );
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || authorization.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            reject(request, response);
            return;
        }

        String token = authorization.substring(7).trim();
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            String subject = claims.getSubject();
            if (subject == null || !OBJECT_ID.matcher(subject).matches()) {
                reject(request, response);
                return;
            }

            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            subject,
                            null,
                            List.of()
                    )
            );
            filterChain.doFilter(request, response);
        } catch (RuntimeException exception) {
            SecurityContextHolder.clearContext();
            reject(request, response);
        }
    }

    private void reject(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        SecurityContextHolder.clearContext();
        authenticationEntryPoint.commence(request, response, null);
    }
}
