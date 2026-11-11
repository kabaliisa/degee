package app.deegee.api.auth;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** {@code deegee.admin-phones}: who gets admin rights. */
@ConfigurationProperties("deegee")
public record AdminProperties(List<String> adminPhones) {

    public AdminProperties {
        adminPhones = adminPhones == null ? List.of() : adminPhones.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
