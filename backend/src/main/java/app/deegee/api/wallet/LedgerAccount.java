package app.deegee.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_accounts")
public class LedgerAccount {

    public enum Kind {
        USER_WALLET, ARTIST_EARNINGS, PLATFORM_REVENUE, UPRS_PAYABLE, SONGWRITERS_PAYABLE, PROVIDER_CLEARING
    }

    public static final String SYSTEM = "system";

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Kind kind;

    @Column(name = "owner_ref", nullable = false, length = 64)
    private String ownerRef;

    @Column(name = "balance_ugx", nullable = false)
    private long balanceUgx;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LedgerAccount() {}

    LedgerAccount(Kind kind, String ownerRef, Instant now) {
        this.id = idFor(kind, ownerRef);
        this.kind = kind;
        this.ownerRef = ownerRef;
        this.createdAt = now;
    }

    /** Deterministic id, so seed data and code agree: UUID v3 of "KIND:owner". */
    public static UUID idFor(Kind kind, String ownerRef) {
        return UUID.nameUUIDFromBytes((kind.name() + ":" + ownerRef).getBytes(StandardCharsets.UTF_8));
    }

    public UUID getId() { return id; }
    public Kind getKind() { return kind; }
    public String getOwnerRef() { return ownerRef; }
    public long getBalanceUgx() { return balanceUgx; }
}
