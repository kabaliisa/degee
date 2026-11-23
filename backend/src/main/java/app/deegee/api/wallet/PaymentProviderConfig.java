package app.deegee.api.wallet;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Which provider name takes money in, and which sends it out. */
@Configuration
class PaymentProviderConfig {

    @Bean
    String collectionsProvider(@Value("${deegee.payments.provider:mock}") String name) {
        return name;
    }

    /** Defaults to whatever collections uses, so a provider that does both needs one setting. */
    @Bean
    String payoutsProvider(@Value("${deegee.payments.payout-provider:${deegee.payments.provider:mock}}") String name) {
        return name;
    }
}
