package app.deegee.api.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("deegee.security")
public record SecurityProperties(String jwtSecret, Duration accessTokenTtl, Duration refreshTokenTtl) {

    public SecurityProperties {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException("deegee.security.jwt-secret must be at least 32 characters");
        }
    }
}
