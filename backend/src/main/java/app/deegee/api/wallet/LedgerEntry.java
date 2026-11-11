package app.deegee.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {

    @Id
    private UUID id;

    @Column(name = "transaction_id", nullable = false)
    private UUID transactionId;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    /** Positive: money into the account. Negative: money out. */
    @Column(name = "amount_ugx", nullable = false)
    private long amountUgx;

    protected LedgerEntry() {}

    LedgerEntry(UUID transactionId, UUID accountId, long amountUgx) {
        this.id = UUID.randomUUID();
        this.transactionId = transactionId;
        this.accountId = accountId;
        this.amountUgx = amountUgx;
    }

    public UUID getTransactionId() { return transactionId; }
    public UUID getAccountId() { return accountId; }
    public long getAmountUgx() { return amountUgx; }
}
