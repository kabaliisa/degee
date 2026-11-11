package app.deegee.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/** A song a user owns and may play in full. */
@Entity
@Table(name = "entitlements")
public class Entitlement {

    @Embeddable
    public record Key(@Column(name = "user_id") UUID userId, @Column(name = "track_id") String trackId) implements Serializable {}

    @EmbeddedId
    private Key key;

    @Column(name = "transaction_id", nullable = false)
    private UUID transactionId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Entitlement() {}

    Entitlement(UUID userId, String trackId, UUID transactionId, Instant now) {
        this.key = new Key(userId, trackId);
        this.transactionId = transactionId;
        this.createdAt = now;
    }

    public String getTrackId() { return key.trackId(); }
    public UUID getTransactionId() { return transactionId; }
}
