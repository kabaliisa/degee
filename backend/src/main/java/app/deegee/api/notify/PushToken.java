package app.deegee.api.notify;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One phone we can reach a person on. */
@Entity
@Table(name = "push_tokens")
public class PushToken {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private String platform;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    protected PushToken() {}

    PushToken(UUID userId, String token, String platform, Instant now) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.token = token;
        this.platform = platform;
        this.createdAt = now;
        this.lastSeenAt = now;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getToken() { return token; }
    public String getPlatform() { return platform; }

    /**
     * The same phone, signed in as someone else. The token belongs to the device, not the person, so it
     * moves rather than being duplicated -- otherwise the previous user keeps getting this phone's
     * notifications.
     */
    void seenFor(UUID userId, String platform, Instant now) {
        this.userId = userId;
        this.platform = platform;
        this.lastSeenAt = now;
    }
}
