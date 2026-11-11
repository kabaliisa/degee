package app.deegee.api.common;

import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;

/** The signed-in user's id, taken from the access token's subject. */
public final class CurrentUser {

    private CurrentUser() {}

    public static UUID id(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    /** Clients send a fresh random key per money action, and the same key when retrying it. */
    public static String requireIdempotencyKey(String key) {
        if (key == null || !key.matches("[A-Za-z0-9_-]{8,100}")) {
            throw ApiException.badRequest("BAD_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-100 letters, digits, - or _.");
        }
        return key;
    }
}
