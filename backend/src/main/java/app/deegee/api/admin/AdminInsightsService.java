package app.deegee.api.admin;

import app.deegee.api.catalog.Artist;
import app.deegee.api.wallet.Ledger;
import app.deegee.api.wallet.LedgerAccount.Kind;
import app.deegee.api.wallet.LedgerTransaction.Type;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deegee's own numbers. Admin only; the per-artist equivalent is
 * {@code app.deegee.api.studio.InsightsService}.
 *
 * <p>Everything about money is read from the ledger rather than counted from orders, because the
 * ledger is the record that balances. Days are counted in Kampala, the same as an artist's own
 * page, so the two screens agree about what "today" means.
 */
@Service
public class AdminInsightsService {

    private static final ZoneId KAMPALA = ZoneId.of("Africa/Kampala");
    private static final int DAYS = 30;
    private static final int TOP = 5;

    /** What fans paid artists: a sale and a gift both count, at face value. */
    private static final List<Type> SOLD_THROUGH = List.of(Type.PURCHASE, Type.GIFT);

    private final EntityManager em;
    private final Clock clock;

    AdminInsightsService(EntityManager em, Clock clock) {
        this.em = em;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AdminInsights get() {
        LocalDate today = clock.instant().atZone(KAMPALA).toLocalDate();
        LocalDate from = today.minusDays(DAYS - 1L);
        Instant since = from.atStartOfDay(KAMPALA).toInstant();

        return new AdminInsights(held(), money(since), daily(since, from, today), people(), topArtists(since));
    }

    // ---- the float -------------------------------------------------------------------------

    private AdminInsights.Float held() {
        Map<Kind, Long> byKind = new HashMap<>();
        em.createQuery("select a.kind as kind, coalesce(sum(a.balanceUgx), 0) as ugx from LedgerAccount a group by a.kind", Tuple.class)
                .getResultList()
                .forEach(r -> byKind.put(r.get("kind", Kind.class), r.get("ugx", Long.class)));

        long wallets = byKind.getOrDefault(Kind.USER_WALLET, 0L);
        long earnings = byKind.getOrDefault(Kind.ARTIST_EARNINGS, 0L);
        long inFlight = byKind.getOrDefault(Kind.PAYOUTS_IN_FLIGHT, 0L);
        long uprs = byKind.getOrDefault(Kind.UPRS_PAYABLE, 0L);
        long writers = byKind.getOrDefault(Kind.SONGWRITERS_PAYABLE, 0L);
        long revenue = byKind.getOrDefault(Kind.PLATFORM_REVENUE, 0L);
        // A top-up debits provider clearing and credits a wallet, so the account runs negative and
        // the cash Deegee is actually holding is its mirror image.
        long cash = -byKind.getOrDefault(Kind.PROVIDER_CLEARING, 0L);

        long owed = wallets + earnings + inFlight + uprs + writers;
        return new AdminInsights.Float(wallets, earnings, inFlight, uprs, writers, revenue, cash, cash - owed - revenue);
    }

    // ---- volume ----------------------------------------------------------------------------

    private AdminInsights.Money money(Instant since) {
        UUID revenueAccount = Ledger.systemId(Kind.PLATFORM_REVENUE);
        return new AdminInsights.Money(
                soldThrough(since),
                creditedSince(revenueAccount, since),
                toppedUpSince(since),
                credited(revenueAccount));
    }

    /**
     * Summed over the artists' side of each sale and gift, then grossed back up, rather than over
     * the fans' side: a fan can pay from a wallet balance or straight from mobile money, and only
     * the artist, UPRS, songwriter and platform legs are present in every case.
     */
    private long soldThrough(Instant since) {
        return em.createQuery("""
                        select coalesce(sum(e.amountUgx), 0) from LedgerEntry e, LedgerTransaction t
                        where e.transactionId = t.id and e.amountUgx > 0 and t.type in :types
                          and t.createdAt >= :since
                          and e.accountId in (select a.id from LedgerAccount a where a.kind <> :wallet)""", Long.class)
                .setParameter("types", SOLD_THROUGH)
                .setParameter("since", since)
                .setParameter("wallet", Kind.USER_WALLET)
                .getSingleResult();
    }

    private long toppedUpSince(Instant since) {
        return em.createQuery("""
                        select coalesce(sum(e.amountUgx), 0) from LedgerEntry e, LedgerTransaction t
                        where e.transactionId = t.id and e.amountUgx > 0 and t.type = :topup
                          and t.createdAt >= :since""", Long.class)
                .setParameter("topup", Type.TOPUP)
                .setParameter("since", since)
                .getSingleResult();
    }

    private long credited(UUID account) {
        return em.createQuery("select coalesce(sum(e.amountUgx), 0) from LedgerEntry e where e.accountId = :a and e.amountUgx > 0", Long.class)
                .setParameter("a", account)
                .getSingleResult();
    }

    private long creditedSince(UUID account, Instant since) {
        return em.createQuery("""
                        select coalesce(sum(e.amountUgx), 0) from LedgerEntry e, LedgerTransaction t
                        where e.transactionId = t.id and e.accountId = :a and e.amountUgx > 0
                          and t.createdAt >= :since""", Long.class)
                .setParameter("a", account)
                .setParameter("since", since)
                .getSingleResult();
    }

    /** Zero-filled, for the same reason as an artist's own chart: quiet days are the shape of the data. */
    private List<AdminInsights.Day> daily(Instant since, LocalDate from, LocalDate today) {
        List<Tuple> rows = em.createQuery("""
                        select t.createdAt as at, e.amountUgx as amount
                        from LedgerEntry e, LedgerTransaction t
                        where e.transactionId = t.id and e.amountUgx > 0 and t.type in :types
                          and t.createdAt >= :since
                          and e.accountId in (select a.id from LedgerAccount a where a.kind <> :wallet)""", Tuple.class)
                .setParameter("types", SOLD_THROUGH)
                .setParameter("since", since)
                .setParameter("wallet", Kind.USER_WALLET)
                .getResultList();

        Map<LocalDate, Long> byDay = new HashMap<>();
        for (Tuple row : rows) {
            byDay.merge(row.get("at", Instant.class).atZone(KAMPALA).toLocalDate(), row.get("amount", Long.class), Long::sum);
        }
        List<AdminInsights.Day> out = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(today); d = d.plusDays(1)) {
            out.add(new AdminInsights.Day(d, byDay.getOrDefault(d, 0L)));
        }
        return out;
    }

    // ---- people ----------------------------------------------------------------------------

    private AdminInsights.People people() {
        long fans = count("select count(u.id) from User u");
        long buyers = count("select count(distinct e.key.userId) from Entitlement e");
        long live = countArtists(Artist.Status.ACTIVE);
        long waiting = countArtists(Artist.Status.PENDING);
        long earning = em.createQuery("""
                        select count(distinct a.ownerRef) from LedgerAccount a, LedgerEntry e
                        where e.accountId = a.id and a.kind = :kind and e.amountUgx > 0""", Long.class)
                .setParameter("kind", Kind.ARTIST_EARNINGS)
                .getSingleResult();
        return new AdminInsights.People(fans, buyers, live, earning, waiting);
    }

    private long count(String jpql) {
        return em.createQuery(jpql, Long.class).getSingleResult();
    }

    private long countArtists(Artist.Status status) {
        return em.createQuery("select count(a.id) from Artist a where a.status = :s", Long.class)
                .setParameter("s", status)
                .getSingleResult();
    }

    // ---- top artists -----------------------------------------------------------------------

    /** By what reached the artist, not by what fans paid: the artist's own share is the real signal. */
    private List<AdminInsights.TopArtist> topArtists(Instant since) {
        List<Tuple> rows = em.createQuery("""
                        select a.ownerRef as id, coalesce(sum(e.amountUgx), 0) as ugx, count(e.id) as n
                        from LedgerAccount a, LedgerEntry e, LedgerTransaction t
                        where e.accountId = a.id and e.transactionId = t.id
                          and a.kind = :kind and e.amountUgx > 0 and t.type in :types and t.createdAt >= :since
                        group by a.ownerRef
                        order by coalesce(sum(e.amountUgx), 0) desc""", Tuple.class)
                .setParameter("kind", Kind.ARTIST_EARNINGS)
                .setParameter("types", SOLD_THROUGH)
                .setParameter("since", since)
                .setMaxResults(TOP)
                .getResultList();
        if (rows.isEmpty()) return List.of();

        List<String> ids = rows.stream().map(r -> r.get("id", String.class)).toList();
        Map<String, String> names = new HashMap<>();
        em.createQuery("select a.id as id, a.name as name from Artist a where a.id in :ids", Tuple.class)
                .setParameter("ids", ids)
                .getResultList()
                .forEach(r -> names.put(r.get("id", String.class), r.get("name", String.class)));

        return rows.stream()
                .map(r -> {
                    String id = r.get("id", String.class);
                    return new AdminInsights.TopArtist(id, names.getOrDefault(id, id),
                            r.get("ugx", Long.class), r.get("n", Long.class).intValue());
                })
                .toList();
    }
}
