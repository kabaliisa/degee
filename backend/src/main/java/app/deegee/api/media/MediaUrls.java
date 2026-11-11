package app.deegee.api.media;

import app.deegee.api.common.Hashing;
import app.deegee.api.config.SecurityProperties;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;

/**
 * Time-limited links to private files (audio masters, label letters), so the app's audio player and
 * image viewer can fetch them without sending a token. Anyone holding the link can use it until it expires.
 */
@Component
public class MediaUrls {

    private final String secret;
    private final MediaProperties props;
    private final Clock clock;

    MediaUrls(SecurityProperties security, MediaProperties props, Clock clock) {
        this.secret = "media:" + security.jwtSecret(); // a different message space from tokens
        this.props = props;
        this.clock = clock;
    }

    /** API path for a file: public covers as-is, everything else signed. Null in, null out. */
    public String urlFor(String key) {
        if (key == null) return null;
        if (MediaStorage.isPublic(key)) return "/v1/media/" + key;
        long exp = clock.instant().plus(props.signedUrlTtl()).getEpochSecond();
        return "/v1/media/" + key + "?exp=" + exp + "&sig=" + sign(key, exp);
    }

    boolean verify(String key, long exp, String sig) {
        return exp >= Instant.now(clock).getEpochSecond() && sig != null && Hashing.constantTimeEquals(sign(key, exp), sig);
    }

    private String sign(String key, long exp) {
        return Hashing.hmacHex(secret, key + ":" + exp);
    }
}
