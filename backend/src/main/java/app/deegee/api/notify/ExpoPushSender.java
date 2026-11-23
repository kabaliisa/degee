package app.deegee.api.notify;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Expo's push service. One HTTP call carries up to 100 messages, and a reply carries one ticket per
 * message in the order they were sent.
 *
 * <p>A ticket saying "ok" means Expo accepted the message, not that a phone showed it. Deegee doesn't
 * chase the receipts that would say so: a sale notification that silently fails is a small loss, and
 * the artist sees the sale in the Studio either way. The one answer worth acting on is
 * DeviceNotRegistered, which means the phone is gone for good and the token should be dropped.
 */
@Component("expo")
@ConditionalOnProperty(name = "deegee.notify.provider", havingValue = "expo")
class ExpoPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushSender.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    private static final int MAX_PER_REQUEST = 100;
    private static final String DEAD = "DeviceNotRegistered";

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Reply(List<Ticket> data, List<Problem> errors) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Ticket(String status, String id, String message, Map<String, String> details) {
        boolean dead() { return details != null && DEAD.equals(details.get("error")); }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Problem(String code, String message) {}

    private final RestClient http;

    ExpoPushSender(NotifyProperties props) {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) TIMEOUT.toMillis());
        factory.setReadTimeout((int) TIMEOUT.toMillis());
        this.http = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(props.expoUrl())
                .defaultHeader("Accept", "application/json")
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public List<String> send(List<Push> pushes) {
        List<String> dead = new ArrayList<>();
        for (int from = 0; from < pushes.size(); from += MAX_PER_REQUEST) {
            List<Push> batch = pushes.subList(from, Math.min(from + MAX_PER_REQUEST, pushes.size()));
            try {
                dead.addAll(sendBatch(batch));
            } catch (RuntimeException e) {
                // Expo is down, or the network is. Nothing to retry into: the event has already happened
                // and the artist will see it in the Studio.
                log.warn("Couldn't reach Expo to send {} notification(s)", batch.size(), e);
            }
        }
        return dead;
    }

    private List<String> sendBatch(List<Push> batch) {
        List<Map<String, Object>> body = batch.stream().map(ExpoPushSender::message).toList();
        Reply reply = http.post().body(body).retrieve().body(Reply.class);
        if (reply == null) {
            log.warn("Expo returned nothing for {} notification(s)", batch.size());
            return List.of();
        }
        if (reply.errors() != null && !reply.errors().isEmpty()) {
            // Whole-request failure: nothing in this batch was sent.
            reply.errors().forEach(p -> log.error("Expo refused the batch: {} {}", p.code(), p.message()));
            return List.of();
        }
        List<Ticket> tickets = reply.data() == null ? List.of() : reply.data();
        if (tickets.size() != batch.size()) {
            // Tickets are matched to messages by position, so a short list means we can't tell which
            // token a ticket belongs to. Dropping the wrong token would silence a working phone.
            log.error("Expo returned {} ticket(s) for {} notification(s); not acting on any of them",
                    tickets.size(), batch.size());
            return List.of();
        }
        List<String> dead = new ArrayList<>();
        for (int i = 0; i < tickets.size(); i++) {
            Ticket ticket = tickets.get(i);
            if ("ok".equals(ticket.status())) continue;
            if (ticket.dead()) dead.add(batch.get(i).token());
            else log.warn("Expo couldn't send a {}: {}", batch.get(i).notification().kind(), ticket.message());
        }
        return dead;
    }

    private static Map<String, Object> message(Push push) {
        Notification n = push.notification();
        return Map.of(
                "to", push.token(),
                "title", n.title(),
                "body", n.body(),
                "data", n.data(),
                "sound", "default",
                "priority", "high",
                // Android shows nothing for a channel the device doesn't have, so this name has to
                // match the channel the app creates on startup.
                "channelId", NotifyProperties.CHANNEL);
    }
}
