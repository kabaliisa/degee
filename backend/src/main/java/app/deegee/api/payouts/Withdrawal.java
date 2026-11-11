package app.deegee.api.payouts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** An artist taking money out to mobile money: REQUESTED (first one waits for an admin) → SENT → COMPLETED or FAILED. */
@Entity
@Table(name = "withdrawals")
public class Withdrawal {

    public enum Status { REQUESTED, SENT, COMPLETED, FAILED, REJECTED }

    @Id
    private UUID id;

    @Column(name = "artist_id", nullable = false)
    private String artistId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "amount_ugx", nullable = false)
    private long amountUgx;

    @Column(nullable = false, length = 16)
    private String msisdn;

    @Column(nullable = false, length = 20)
    private String provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Status status;

    @Column(name = "provider_ref", nullable = false, unique = true, length = 64)
    private String providerRef;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 120)
    private String idempotencyKey;

    @Column(name = "review_note", length = 300)
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Withdrawal() {}

    Withdrawal(String artistId, UUID userId, long amountUgx, String msisdn, String provider, String providerRef, String idempotencyKey, Instant now) {
        this.id = UUID.randomUUID();
        this.artistId = artistId;
        this.userId = userId;
        this.amountUgx = amountUgx;
        this.msisdn = msisdn;
        this.provider = provider;
        this.status = Status.REQUESTED;
        this.providerRef = providerRef;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = now;
        this.updatedAt = now;
    }

    void move(Status to, Instant now) {
        this.status = to;
        this.updatedAt = now;
    }

    void reject(String note, Instant now) {
        this.reviewNote = note;
        move(Status.REJECTED, now);
    }

    public UUID getId() { return id; }
    public String getArtistId() { return artistId; }
    public UUID getUserId() { return userId; }
    public long getAmountUgx() { return amountUgx; }
    public String getMsisdn() { return msisdn; }
    public String getProvider() { return provider; }
    public Status getStatus() { return status; }
    public String getProviderRef() { return providerRef; }
    public String getReviewNote() { return reviewNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
