package app.deegee.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_transactions")
public class LedgerTransaction {

    public enum Type {
        TOPUP, PURCHASE, GIFT,
        /** An artist asked to withdraw: earnings → payouts in flight. */
        WITHDRAWAL,
        /** The provider paid it: payouts in flight → provider. */
        PAYOUT,
        /** Declined or failed: payouts in flight → back to earnings. */
        WITHDRAWAL_RETURNED
    }

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    @Column(name = "user_id")
    private UUID userId;

    @Column(length = 64)
    private String reference;

    @Column(nullable = false, length = 200)
    private String description;

    @Column(name = "idempotency_key", unique = true, length = 120)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LedgerTransaction() {}

    LedgerTransaction(Type type, UUID userId, String reference, String description, String idempotencyKey, Instant now) {
        this.id = UUID.randomUUID();
        this.type = type;
        this.userId = userId;
        this.reference = reference;
        this.description = description;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = now;
    }

    public UUID getId() { return id; }
    public Type getType() { return type; }
    public UUID getUserId() { return userId; }
    public String getReference() { return reference; }
    public String getDescription() { return description; }
    public Instant getCreatedAt() { return createdAt; }
}
