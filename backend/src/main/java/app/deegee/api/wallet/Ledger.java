package app.deegee.api.wallet;

import app.deegee.api.auth.UserRegistered;
import app.deegee.api.common.ApiException;
import app.deegee.api.wallet.LedgerAccount.Kind;
import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The only code that moves money. Every posting is a transaction whose entries sum to zero;
 * account balances change atomically in the same database transaction as the entries.
 */
@Component
public class Ledger {

    /** One line of a posting: {@code amount} into (positive) or out of (negative) {@code accountId}. */
    public record Posting(UUID accountId, long amount) {}

    private final LedgerRepositories.Accounts accounts;
    private final LedgerRepositories.Transactions transactions;
    private final LedgerRepositories.Entries entries;
    private final Clock clock;

    Ledger(LedgerRepositories.Accounts accounts, LedgerRepositories.Transactions transactions,
           LedgerRepositories.Entries entries, Clock clock) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.entries = entries;
        this.clock = clock;
    }

    // ---- accounts ---------------------------------------------------------------------------

    public static UUID walletId(UUID userId) { return LedgerAccount.idFor(Kind.USER_WALLET, userId.toString()); }
    public static UUID artistEarningsId(String artistId) { return LedgerAccount.idFor(Kind.ARTIST_EARNINGS, artistId); }
    public static UUID systemId(Kind kind) { return LedgerAccount.idFor(kind, LedgerAccount.SYSTEM); }

    /** Every new user gets a wallet, created in the same transaction as the user. */
    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    void onUserRegistered(UserRegistered event) {
        accounts.save(new LedgerAccount(Kind.USER_WALLET, event.userId().toString(), clock.instant()));
    }

    /** Locks the user's wallet until the surrounding transaction ends and returns its balance. */
    @Transactional(propagation = Propagation.MANDATORY)
    public long lockWallet(UUID userId) {
        UUID id = walletId(userId);
        accounts.lockById(id).orElseThrow(() -> ApiException.notFound("Wallet"));
        return accounts.balanceOf(id).orElseThrow();
    }

    @Transactional(readOnly = true)
    public long balance(UUID accountId) {
        return accounts.balanceOf(accountId).orElse(0L);
    }

    /** How much {@code transactionId} moved on the user's wallet (negative for a purchase or gift). */
    @Transactional(readOnly = true)
    public long walletAmount(UUID transactionId, UUID userId) {
        UUID wallet = walletId(userId);
        return entries.findByTransactionId(transactionId).stream()
                .filter(e -> e.getAccountId().equals(wallet))
                .mapToLong(LedgerEntry::getAmountUgx)
                .sum();
    }

    @Transactional(readOnly = true)
    public List<WalletLine> walletHistory(UUID userId, int limit) {
        return entries.history(walletId(userId), Limit.of(limit));
    }

    // ---- postings -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Optional<LedgerTransaction> findByIdempotencyKey(String key) {
        return transactions.findByIdempotencyKey(key);
    }

    /**
     * Records one money movement. Zero amounts are dropped; postings to the same account are combined.
     * Throws if the entries don't balance, so a bug can never create or destroy money.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public LedgerTransaction post(LedgerTransaction.Type type, UUID userId, String reference, String description,
                                  String idempotencyKey, List<Posting> postings) {
        Map<UUID, Long> byAccount = postings.stream()
                .filter(p -> p.amount() != 0)
                .collect(Collectors.groupingBy(Posting::accountId, Collectors.summingLong(Posting::amount)));
        long sum = byAccount.values().stream().mapToLong(Long::longValue).sum();
        if (sum != 0) throw new IllegalStateException("Unbalanced ledger posting: entries sum to " + sum);
        if (byAccount.isEmpty()) throw new IllegalStateException("Empty ledger posting");

        LedgerTransaction tx = transactions.save(new LedgerTransaction(type, userId, reference, description, idempotencyKey, clock.instant()));
        // Fixed order (by account id) so two concurrent postings can't deadlock on each other's rows.
        byAccount.entrySet().stream()
                .filter(e -> e.getValue() != 0)
                .sorted(Map.Entry.comparingByKey(Comparator.naturalOrder()))
                .forEach(e -> {
                    entries.save(new LedgerEntry(tx.getId(), e.getKey(), e.getValue()));
                    if (accounts.addToBalance(e.getKey(), e.getValue()) != 1) {
                        throw new IllegalStateException("Ledger account missing: " + e.getKey());
                    }
                });
        return tx;
    }
}
