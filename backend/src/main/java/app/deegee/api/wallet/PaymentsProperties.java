package app.deegee.api.wallet;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("deegee.payments")
public record PaymentsProperties(boolean mockAutoApprove, Duration mockApproveDelay, String webhookSecret) {}
