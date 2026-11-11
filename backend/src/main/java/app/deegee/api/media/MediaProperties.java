package app.deegee.api.media;

import java.nio.file.Path;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("deegee.media")
public record MediaProperties(Path dir, Duration signedUrlTtl) {}
