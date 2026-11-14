package app.deegee.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A song, release or gift being paid for directly with mobile money. */
@Entity
@Table(name = "checkout_orders")
public class CheckoutOrder {

    public enum Kind { TRACK, RELEASE, GIFT }

    public enum Status {
        /** The PIN prompt is out, or the payment has just arrived and is being applied. */
        WAITING,
        /** Paid for and delivered. */
        COMPLETED,
        /** The payment wasn't approved. Nothing was charged. */
        DECLINED,
        /** The money arrived but the order couldn't be completed; it's kept as the fan's Deegee credit. */
        CREDITED,
    }

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Kind kind;

    @Column(name = "item_id", nullable = false, length = 40)
    private String itemId;

    @Column(name = "amount_ugx", nullable = false)
    private long amountUgx;

    @Column(length = 140)
    private String note;

    @Column(name = "collect_ugx", nullable = false)
    private long collectUgx;

    @Column(name = "payment_intent_id")
    private UUID paymentIntentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Status status;

    @Column(name = "failure_code", length = 40)
    private String failureCode;

    @Column(name = "failure_message", length = 200)
    private String failureMessage;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 120)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CheckoutOrder() {}

    CheckoutOrder(UUID userId, Kind kind, String itemId, long amountUgx, String note, String idempotencyKey, Instant now) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.kind = kind;
        this.itemId = itemId;
        this.amountUgx = amountUgx;
        this.note = note;
        this.status = Status.WAITING;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = now;
        this.updatedAt = now;
    }

    void waitingFor(PaymentIntent intent) {
        this.paymentIntentId = intent.getId();
        this.collectUgx = intent.getAmountUgx();
    }

    void completed(UUID transactionId, Instant now) {
        this.status = Status.COMPLETED;
        this.transactionId = transactionId;
        this.updatedAt = now;
    }

    void declined(Instant now) {
        this.status = Status.DECLINED;
        this.updatedAt = now;
    }

    void credited(String code, String message, Instant now) {
        this.status = Status.CREDITED;
        this.failureCode = code;
        this.failureMessage = message == null ? null : message.substring(0, Math.min(message.length(), 200));
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public Kind getKind() { return kind; }
    public String getItemId() { return itemId; }
    public long getAmountUgx() { return amountUgx; }
    public String getNote() { return note; }
    public long getCollectUgx() { return collectUgx; }
    public UUID getPaymentIntentId() { return paymentIntentId; }
    public Status getStatus() { return status; }
    public String getFailureCode() { return failureCode; }
    public String getFailureMessage() { return failureMessage; }
    public UUID getTransactionId() { return transactionId; }
}
