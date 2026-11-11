package app.deegee.api.wallet;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Holder for the ledger's Spring Data repositories. */
final class LedgerRepositories {

    private LedgerRepositories() {}

    interface Accounts extends JpaRepository<LedgerAccount, UUID> {

        /** SELECT … FOR UPDATE: holds the row until the transaction ends, so one wallet spends one request at a time. */
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select a from LedgerAccount a where a.id = :id")
        Optional<LedgerAccount> lockById(UUID id);

        /**
         * Atomic in the database, so concurrent postings to the same account never lose an update.
         * Doesn't clear the session (that would silently drop pending changes such as a top-up's status),
         * so balances are always read with {@link #balanceOf}, never from a loaded entity.
         */
        @Modifying(flushAutomatically = true)
        @Query("update LedgerAccount a set a.balanceUgx = a.balanceUgx + :amount where a.id = :id")
        int addToBalance(UUID id, long amount);

        /** Straight from the database, never from the session cache. */
        @Query("select a.balanceUgx from LedgerAccount a where a.id = :id")
        Optional<Long> balanceOf(UUID id);
    }

    interface Transactions extends JpaRepository<LedgerTransaction, UUID> {
        Optional<LedgerTransaction> findByIdempotencyKey(String idempotencyKey);
    }

    interface Entries extends JpaRepository<LedgerEntry, UUID> {
        List<LedgerEntry> findByTransactionId(UUID transactionId);

        @Query("""
                select new app.deegee.api.wallet.WalletLine(t.id, t.type, e.amountUgx, t.description, t.reference, t.createdAt)
                from LedgerEntry e, LedgerTransaction t
                where e.transactionId = t.id and e.accountId = :accountId
                order by t.createdAt desc""")
        List<WalletLine> history(UUID accountId, Limit limit);

        @Query("""
                select coalesce(sum(e.amountUgx), 0) from LedgerEntry e, LedgerTransaction t
                where e.transactionId = t.id and e.accountId = :accountId and e.amountUgx > 0
                  and t.type in :types and t.createdAt > :since""")
        long creditsSince(UUID accountId, Collection<LedgerTransaction.Type> types, Instant since);

        @Query("""
                select min(t.createdAt) from LedgerEntry e, LedgerTransaction t
                where e.transactionId = t.id and e.accountId = :accountId and e.amountUgx > 0
                  and t.type in :types and t.createdAt > :since""")
        Instant firstCreditSince(UUID accountId, Collection<LedgerTransaction.Type> types, Instant since);
    }
}
