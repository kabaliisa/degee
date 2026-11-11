package app.deegee.api.wallet;

import app.deegee.api.auth.PhoneNumbers.Provider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A mobile money top-up, from the PIN prompt to the provider's confirmation. */
@Entity
@Table(name = "payment_intents")
public class PaymentIntent {

    public enum Status { PENDING, COMPLETED, FAILED }

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Provider provider;

    @Column(nullable = false, length = 16)
    private String msisdn;

    @Column(name = "amount_ugx", nullable = false)
    private long amountUgx;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Status status;

    @Column(name = "provider_ref", nullable = false, unique = true, length = 64)
    private String providerRef;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 120)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PaymentIntent() {}

    PaymentIntent(UUID userId, Provider provider, String msisdn, long amountUgx, String providerRef, String idempotencyKey, Instant now) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.provider = provider;
        this.msisdn = msisdn;
        this.amountUgx = amountUgx;
        this.status = Status.PENDING;
        this.providerRef = providerRef;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = now;
        this.updatedAt = now;
    }

    void complete(UUID transactionId, Instant now) {
        this.status = Status.COMPLETED;
        this.transactionId = transactionId;
        this.updatedAt = now;
    }

    void fail(Instant now) {
        this.status = Status.FAILED;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public Provider getProvider() { return provider; }
    public String getMsisdn() { return msisdn; }
    public long getAmountUgx() { return amountUgx; }
    public Status getStatus() { return status; }
    public String getProviderRef() { return providerRef; }
    public UUID getTransactionId() { return transactionId; }
    public Instant getCreatedAt() { return createdAt; }
}
