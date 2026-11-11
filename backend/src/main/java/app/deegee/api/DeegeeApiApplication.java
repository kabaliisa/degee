package app.deegee.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ConfigurationPropertiesScan
// The ledger keeps its three small repositories together in LedgerRepositories, so nested ones must be scanned.
@EnableJpaRepositories(considerNestedRepositories = true)
public class DeegeeApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DeegeeApiApplication.class, args);
    }
}
