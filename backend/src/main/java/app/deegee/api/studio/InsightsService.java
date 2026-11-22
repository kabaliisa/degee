package app.deegee.api.studio;

import app.deegee.api.auth.User;
import app.deegee.api.auth.UserRepository;
import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.common.ApiException;
import app.deegee.api.wallet.Ledger;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The numbers behind an artist's own page in the studio.
 *
 * <p>Money comes from the ledger, which is the only place that knows what was actually credited --
 * a sale can be paid from a wallet balance or straight from mobile money, and the ledger is the one
 * record that sees both. Who bought what comes from entitlements and gifts, which name the person
 * and the song.
 *
 * <p>Days are counted in Kampala, not UTC. An artist looking at "today" means the day they are
 * living in, and a sale at 1am in Kampala belongs to that day rather than the one before.
 */
@Service
public class InsightsService {

    private static final ZoneId KAMPALA = ZoneId.of("Africa/Kampala");
    private static final int DAYS = 30;
    private static final int TOP = 5;

    private final ArtistRepository artists;
    private final UserRepository users;
    private final Ledger ledger;
    private final EntityManager em;
    private final Clock clock;

    InsightsService(ArtistRepository artists, UserRepository users, Ledger ledger, EntityManager em, Clock clock) {
        this.artists = artists;
        this.users = users;
        this.ledger = ledger;
        this.em = em;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Insights forOwner(UUID userId) {
        Artist artist = artists.findByOwnerUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_AN_ARTIST", "You haven't set up an artist profile yet."));
        String artistId = artist.getId();
        UUID account = Ledger.artistEarningsId(artistId);

        Instant now = clock.instant();
        LocalDate today = now.atZone(KAMPALA).toLocalDate();
        LocalDate from = today.minusDays(DAYS - 1L);
        Instant since = from.atStartOfDay(KAMPALA).toInstant();

        List<Insights.Supporter> supporters = supporters(artistId);
        return new Insights(
                creditedTotal(account),
                ledger.earnedSince(account, since),
                daily(account, since, from, today),
                supporters.size(),
                supporters.stream().limit(TOP).toList(),
                topSongs(artistId));
    }

    /** Everything ever credited, so a withdrawal does not make past months look like they vanished. */
    private long creditedTotal(UUID account) {
        return em.createQuery("""
                        select coalesce(sum(e.amountUgx), 0) from LedgerEntry e
                        where e.accountId = :account and e.amountUgx > 0""", Long.class)
                .setParameter("account", account)
                .getSingleResult();
    }

    /**
     * Zero-filled, because a chart drawn only from the days that had sales puts a quiet week and a
     * busy one side by side at the same width and tells the artist something untrue.
     */
    private List<Insights.Day> daily(UUID account, Instant since, LocalDate from, LocalDate today) {
        List<Tuple> rows = em.createQuery("""
                        select t.createdAt as at, e.amountUgx as amount
                        from LedgerEntry e, LedgerTransaction t
                        where e.transactionId = t.id and e.accountId = :account
                          and e.amountUgx > 0 and t.createdAt >= :since""", Tuple.class)
                .setParameter("account", account)
                .setParameter("since", since)
                .getResultList();

        Map<LocalDate, Long> byDay = new HashMap<>();
        for (Tuple row : rows) {
            LocalDate day = row.get("at", Instant.class).atZone(KAMPALA).toLocalDate();
            byDay.merge(day, row.get("amount", Long.class), Long::sum);
        }
        List<Insights.Day> out = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(today); d = d.plusDays(1)) {
            out.add(new Insights.Day(d, byDay.getOrDefault(d, 0L)));
        }
        return out;
    }

    /**
     * Everyone who has ever bought a song or sent a gift, best first. One person who bought six
     * songs is one supporter, not six, which is why this is built once and both counted and cut.
     */
    private List<Insights.Supporter> supporters(String artistId) {
        Map<UUID, int[]> songs = new HashMap<>();   // userId -> [count]
        Map<UUID, long[]> spent = new HashMap<>();  // userId -> [estimated spend on songs]
        em.createQuery("""
                        select e.key.userId as u, count(t.id) as n, coalesce(sum(t.priceUgx), 0) as ugx
                        from Entitlement e, Track t
                        where t.id = e.key.trackId and t.artistId = :artistId
                        group by e.key.userId""", Tuple.class)
                .setParameter("artistId", artistId)
                .getResultList()
                .forEach(r -> {
                    UUID u = r.get("u", UUID.class);
                    songs.put(u, new int[] { r.get("n", Long.class).intValue() });
                    spent.put(u, new long[] { r.get("ugx", Long.class) });
                });

        Map<UUID, long[]> gifts = new HashMap<>();
        em.createQuery("""
                        select g.userId as u, coalesce(sum(g.amountUgx), 0) as ugx
                        from Gift g where g.artistId = :artistId group by g.userId""", Tuple.class)
                .setParameter("artistId", artistId)
                .getResultList()
                .forEach(r -> gifts.put(r.get("u", UUID.class), new long[] { r.get("ugx", Long.class) }));

        List<UUID> everyone = new ArrayList<>(songs.keySet());
        gifts.keySet().stream().filter(u -> !songs.containsKey(u)).forEach(everyone::add);

        Map<UUID, String> names = new HashMap<>();
        users.findAllById(everyone).forEach(u -> names.put(u.getId(), nameOf(u)));

        return everyone.stream()
                .map(u -> {
                    int songCount = songs.getOrDefault(u, new int[] { 0 })[0];
                    long gifted = gifts.getOrDefault(u, new long[] { 0 })[0];
                    long estimate = spent.getOrDefault(u, new long[] { 0 })[0] + gifted;
                    return new Insights.Supporter(names.getOrDefault(u, "A fan"), songCount, gifted, estimate);
                })
                .sorted(Comparator.comparingLong(Insights.Supporter::estimatedSpentUgx).reversed())
                .toList();
    }

    private List<Insights.Song> topSongs(String artistId) {
        return em.createQuery("""
                        select t.id as id, t.title as title, count(e.key.userId) as buyers,
                               coalesce(sum(t.priceUgx), 0) as ugx
                        from Entitlement e, Track t
                        where t.id = e.key.trackId and t.artistId = :artistId
                        group by t.id, t.title
                        order by count(e.key.userId) desc""", Tuple.class)
                .setParameter("artistId", artistId)
                .setMaxResults(TOP)
                .getResultList().stream()
                .map(r -> new Insights.Song(r.get("id", String.class), r.get("title", String.class),
                        r.get("buyers", Long.class).intValue(), r.get("ugx", Long.class)))
                .toList();
    }

    /** First name only. The artist is being shown who supports them, not handed a contact list. */
    private static String nameOf(User user) {
        String name = user.getName();
        if (name == null || name.isBlank()) return "A fan";
        String first = name.trim().split("\\s+")[0];
        return first.isBlank() ? "A fan" : first;
    }

}
