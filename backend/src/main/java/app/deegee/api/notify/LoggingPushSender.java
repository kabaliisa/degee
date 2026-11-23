package app.deegee.api.notify;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * The default: writes each notification to the log instead of sending it. Development and the tests
 * want this, and so does production until the app has a build that can register a push token.
 *
 * <p>It logs the words a person would have read, so the copy can be reviewed without a phone.
 */
@Component("log")
@ConditionalOnProperty(name = "deegee.notify.provider", havingValue = "log", matchIfMissing = true)
class LoggingPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingPushSender.class);

    @Override
    public List<String> send(List<Push> pushes) {
        pushes.forEach(p -> log.info("[push] {} -> \"{}\" / \"{}\"",
                p.notification().kind(), p.notification().title(), p.notification().body()));
        return List.of();
    }
}
