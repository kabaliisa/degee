package app.deegee.api.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Delivers sign-in codes. Development logs them; production will send an SMS (e.g. Africa's Talking). */
public interface OtpSender {

    void send(String phone, String code);

    @Configuration
    class Defaults {
        private static final Logger log = LoggerFactory.getLogger(OtpSender.class);

        @Bean
        @ConditionalOnMissingBean(OtpSender.class)
        OtpSender loggingOtpSender() {
            return (phone, code) -> log.info("DEV ONLY: sign-in code for {} is {}", phone, code);
        }
    }
}
