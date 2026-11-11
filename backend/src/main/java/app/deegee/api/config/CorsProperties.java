package app.deegee.api.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Web origins allowed to call the API from a browser (the app's web build). */
@ConfigurationProperties("deegee.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}
