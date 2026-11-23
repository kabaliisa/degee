package app.deegee.api.notify;

import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sends a notification to a person, on every phone they have signed in on.
 *
 * <p>Nothing here throws. Every caller is something that has already happened -- money has moved, a
 * release is live -- and a notification is the least important part of that. A failure is logged and
 * the event stands.
 */
@Service
public class Notifier {

    private static final Logger log = LoggerFactory.getLogger(Notifier.class);

    private final PushTokenRepository tokens;
    private final NotificationPrefsRepository prefs;
    private final PushSender sender;
    private final Clock clock;

    Notifier(PushTokenRepository tokens, NotificationPrefsRepository prefs, PushSender sender, Clock clock) {
        this.tokens = tokens;
        this.prefs = prefs;
        this.sender = sender;
        this.clock = clock;
    }

    @Transactional
    public void tell(UUID userId, Notification notification) {
        try {
            NotificationPrefs wanted = prefs.findById(userId).orElseGet(NotificationPrefs::allOn);
            if (!wanted.wants(notification.kind())) return;

            List<PushToken> phones = tokens.findByUserId(userId);
            if (phones.isEmpty()) return; // never registered, or signed in on the web only

            List<PushSender.Push> pushes = phones.stream()
                    .map(p -> new PushSender.Push(p.getToken(), notification))
                    .toList();
            sender.send(pushes).forEach(this::forget);
        } catch (RuntimeException e) {
            log.error("Couldn't notify {} about a {}", userId, notification.kind(), e);
        }
    }

    /** Expo says this phone can't be reached any more -- the app was uninstalled, or permission revoked. */
    private void forget(String token) {
        tokens.deleteByToken(token);
        log.info("Dropped a push token Expo reported as unregistered");
    }

    // ---- registration ----------------------------------------------------------------------------

    /**
     * Remembers a phone. The same token arriving again moves it to whoever is signed in now, because a
     * token identifies the device: two people sharing a phone must not share notifications.
     */
    @Transactional
    public void register(UUID userId, String token, String platform) {
        String clean = token == null ? "" : token.strip();
        if (clean.isEmpty()) return;
        String os = platform == null || platform.isBlank() ? "unknown" : platform.strip();
        tokens.findByToken(clean).ifPresentOrElse(
                existing -> existing.seenFor(userId, os, clock.instant()),
                () -> tokens.save(new PushToken(userId, clean, os, clock.instant())));
    }

    /**
     * On sign-out, so the next person on this phone doesn't get the last one's notifications. Scoped to
     * the signed-in user, so knowing somebody else's token is not enough to silence their phone.
     */
    @Transactional
    public void unregister(UUID userId, String token) {
        if (token == null || token.isBlank()) return;
        tokens.findByToken(token.strip())
                .filter(t -> t.getUserId().equals(userId))
                .ifPresent(tokens::delete);
    }

    @Transactional(readOnly = true)
    public NotificationPrefs prefsFor(UUID userId) {
        return prefs.findById(userId).orElseGet(NotificationPrefs::allOn);
    }

    @Transactional
    public NotificationPrefs update(UUID userId, Boolean sales, Boolean gifts, Boolean payouts, Boolean releases) {
        NotificationPrefs row = prefs.findById(userId).orElseGet(() -> new NotificationPrefs(userId, clock.instant()));
        row.set(sales, gifts, payouts, releases, clock.instant());
        return prefs.save(row);
    }
}
