package app.deegee.api.wallet;

import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.catalog.Release;
import app.deegee.api.catalog.ReleaseRepository;
import app.deegee.api.catalog.Track;
import app.deegee.api.catalog.TrackRepository;
import app.deegee.api.common.ApiException;
import app.deegee.api.wallet.LedgerAccount.Kind;
import app.deegee.api.wallet.MoneySplits.PricedSong;
import app.deegee.api.wallet.MoneySplits.SaleSplit;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Buying songs and releases with wallet credit. */
@Service
public class PurchaseService {

    public enum ItemKind { TRACK, RELEASE }

    public record Result(UUID transactionId, long chargedUgx, long balanceUgx, List<String> trackIds) {}

    private final TrackRepository tracks;
    private final ArtistRepository artists;
    private final ReleaseRepository releases;
    private final EntitlementRepository entitlements;
    private final Ledger ledger;
    private final Clock clock;
    private final MoneySplits.Terms terms = MoneySplits.Terms.DEFAULT;

    PurchaseService(TrackRepository tracks, ArtistRepository artists, ReleaseRepository releases, EntitlementRepository entitlements,
                    Ledger ledger, Clock clock) {
        this.tracks = tracks;
        this.artists = artists;
        this.releases = releases;
        this.entitlements = entitlements;
        this.ledger = ledger;
        this.clock = clock;
    }

    /**
     * Charges the wallet and grants the songs, all or nothing. The wallet row stays locked until commit,
     * so a user's purchases run one at a time; repeating a request with the same idempotency key
     * returns the first result instead of charging again.
     */
    @Transactional
    public Result buy(UUID userId, ItemKind kind, String itemId, String idempotencyKey) {
        String key = userId + ":" + idempotencyKey;
        long balance = ledger.lockWallet(userId);

        var previous = ledger.findByIdempotencyKey(key);
        if (previous.isPresent()) {
            LedgerTransaction tx = previous.get();
            return new Result(tx.getId(), chargedBy(tx, userId), balance, entitlements.trackIdsFrom(tx.getId()));
        }

        Set<String> owned = new HashSet<>(entitlements.trackIdsOwnedBy(userId));
        Sale sale = kind == ItemKind.TRACK ? trackSale(itemId, owned) : releaseSale(itemId, owned);
        if (isOwnMusic(sale.artistId(), userId)) throw ownMusic("You can already play your own music in full.");

        if (balance < sale.price()) {
            throw new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_FUNDS", "Add money to your wallet first.",
                    Map.of("shortBy", sale.price() - balance, "balanceUgx", balance));
        }

        SaleSplit split = sale.split();
        LedgerTransaction tx = ledger.post(LedgerTransaction.Type.PURCHASE, userId, itemId, sale.description(), key, List.of(
                new Ledger.Posting(Ledger.walletId(userId), -sale.price()),
                new Ledger.Posting(Ledger.artistEarningsId(sale.artistId()), split.artist()),
                new Ledger.Posting(Ledger.systemId(Kind.UPRS_PAYABLE), split.uprs()),
                new Ledger.Posting(Ledger.systemId(Kind.SONGWRITERS_PAYABLE), split.songwritersDirect()),
                new Ledger.Posting(Ledger.systemId(Kind.PLATFORM_REVENUE), split.platform())));

        var now = clock.instant();
        sale.grant().forEach(trackId -> entitlements.save(new Entitlement(userId, trackId, tx.getId(), now)));
        return new Result(tx.getId(), sale.price(), balance - sale.price(), sale.grant());
    }

    @Transactional(readOnly = true)
    public List<String> library(UUID userId) {
        return entitlements.trackIdsOwnedBy(userId);
    }

    private record Sale(String artistId, long price, SaleSplit split, String description, List<String> grant) {}

    private Sale trackSale(String trackId, Set<String> owned) {
        Track track = tracks.findPublishedByIdIn(List.of(trackId)).stream().findFirst().orElseThrow(() -> ApiException.notFound("Song"));
        if (owned.contains(trackId)) throw alreadyOwned();
        SaleSplit split = MoneySplits.splitSale(track.getPriceUgx(), track.songwriters(), terms);
        return new Sale(track.getArtistId(), track.getPriceUgx(), split, track.getTitle(), List.of(trackId));
    }

    /** The whole release, at the release price, granting the songs not already owned. */
    private Sale releaseSale(String releaseId, Set<String> owned) {
        Release release = releases.findPublishedById(releaseId).orElseThrow(() -> ApiException.notFound("Release"));
        List<Track> songs = tracks.findByReleaseIdOrderByTrackNo(releaseId);
        List<String> missing = songs.stream().map(Track::getId).filter(id -> !owned.contains(id)).toList();
        if (missing.isEmpty()) throw alreadyOwned();
        List<PricedSong> priced = songs.stream().map(t -> new PricedSong(t.getPriceUgx(), t.songwriters())).toList();
        SaleSplit split = MoneySplits.splitRelease(release.getPriceUgx(), priced, terms);
        String description = release.getTitle() + " (" + release.getType().label() + ")";
        return new Sale(release.getArtistId(), release.getPriceUgx(), split, description, missing);
    }

    /** Artists can't buy or gift to themselves: it would only move money in a circle and inflate their sales. */
    boolean isOwnMusic(String artistId, UUID userId) {
        return artists.findById(artistId).map(Artist::getOwnerUserId).map(userId::equals).orElse(false);
    }

    static ApiException ownMusic(String message) {
        return new ApiException(HttpStatus.CONFLICT, "OWN_MUSIC", message);
    }

    private long chargedBy(LedgerTransaction tx, UUID userId) {
        return -ledger.walletAmount(tx.getId(), userId);
    }

    private static ApiException alreadyOwned() {
        return new ApiException(HttpStatus.CONFLICT, "ALREADY_OWNED", "You already own this.");
    }
}
