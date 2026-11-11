package app.deegee.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A thank-you payment from a fan to an artist, with an optional message. */
@Entity
@Table(name = "gifts")
public class Gift {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "artist_id", nullable = false)
    private String artistId;

    @Column(name = "amount_ugx", nullable = false)
    private long amountUgx;

    @Column(length = 140)
    private String note;

    @Column(name = "transaction_id", nullable = false)
    private UUID transactionId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Gift() {}

    Gift(UUID userId, String artistId, long amountUgx, String note, UUID transactionId, Instant now) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.artistId = artistId;
        this.amountUgx = amountUgx;
        this.note = note;
        this.transactionId = transactionId;
        this.createdAt = now;
    }

    public UUID getTransactionId() { return transactionId; }
    public String getNote() { return note; }
}
