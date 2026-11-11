package app.deegee.api.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("deegee.otp")
public record OtpProperties(Duration ttl, int maxAttempts, int maxRequestsPerHour) {}
