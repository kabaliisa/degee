package app.deegee.api.wallet;

import java.util.List;

/**
 * How each shilling of a sale or gift is divided. All amounts are whole Ugandan shillings.
 *
 * <p>This is the server's copy of src/lib/money.ts in the app. The two must agree: the tests in
 * MoneySplitsTest use the same cases and numbers as the app's money.test.ts. The server is the
 * one that actually moves money.
 */
public final class MoneySplits {

    /** Placeholder rates until the UPRS licence and artist terms are signed. */
    public record Terms(int songSharePct, int platformPctOfRest, int giftPlatformPct, long minGift, long minTopUp, long maxTopUp) {
        public static final Terms DEFAULT = new Terms(10, 20, 5, 500, 1_000, 2_000_000);
    }

    /** One writer's share of a song. {@code inSociety}: UPRS or a foreign society UPRS represents. */
    public record Songwriter(String name, int sharePct, boolean inSociety) {}

    public record SaleSplit(long total, long uprs, long songwritersDirect, long artist, long platform) {
        static final SaleSplit ZERO = new SaleSplit(0, 0, 0, 0, 0);

        SaleSplit plus(SaleSplit o) {
            return new SaleSplit(total + o.total, uprs + o.uprs, songwritersDirect + o.songwritersDirect, artist + o.artist, platform + o.platform);
        }
    }

    public record GiftSplit(long total, long artist, long platform) {}

    public record PricedSong(long priceUgx, List<Songwriter> writers) {}

    private MoneySplits() {}

    /**
     * Split one sale. The song share is divided per songwriter: society members' parts go to UPRS,
     * other writers are paid directly. Rounding remainders go to the artist, so the parts always sum to the total.
     */
    public static SaleSplit splitSale(long total, List<Songwriter> writers, Terms terms) {
        if (total < 0) throw new IllegalArgumentException("total must be whole UGX >= 0");
        int shareSum = writers.stream().mapToInt(Songwriter::sharePct).sum();
        if (!writers.isEmpty() && shareSum != 100) throw new IllegalArgumentException("songwriter shares must sum to 100");

        long songShare = Math.floorDiv(total * terms.songSharePct(), 100);
        long uprs = 0;
        long direct = 0;
        for (Songwriter w : writers) {
            long part = Math.floorDiv(songShare * w.sharePct(), 100);
            if (w.inSociety()) uprs += part;
            else direct += part;
        }
        if (writers.isEmpty()) uprs = songShare; // no writer data: treat the whole song share as owed to UPRS

        long rest = total - uprs - direct;
        long platform = Math.floorDiv(rest * terms.platformPctOfRest(), 100);
        return new SaleSplit(total, uprs, direct, rest - platform, platform);
    }

    /**
     * Split a whole-release sale: the price is shared across songs in proportion to their single prices
     * (the last song takes the rounding remainder), then each part is split by that song's writers.
     */
    public static SaleSplit splitRelease(long price, List<PricedSong> songs, Terms terms) {
        if (songs.isEmpty()) return splitSale(price, List.of(), terms);
        long listTotal = songs.stream().mapToLong(PricedSong::priceUgx).sum();
        long remaining = price;
        SaleSplit acc = SaleSplit.ZERO;
        for (int i = 0; i < songs.size(); i++) {
            PricedSong s = songs.get(i);
            long part = i == songs.size() - 1 ? remaining : Math.floorDiv(price * s.priceUgx(), listTotal);
            remaining -= part;
            acc = acc.plus(splitSale(part, s.writers(), terms));
        }
        return acc;
    }

    /** A gift goes to the artist, not a song, so there is no songwriter share. Rounding favours the artist. */
    public static GiftSplit splitGift(long total, Terms terms) {
        if (total < terms.minGift()) throw new IllegalArgumentException("gift must be at least UGX " + terms.minGift());
        long platform = Math.floorDiv(total * terms.giftPlatformPct(), 100);
        return new GiftSplit(total, total - platform, platform);
    }
}
