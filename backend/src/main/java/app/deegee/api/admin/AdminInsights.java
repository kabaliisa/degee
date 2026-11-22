package app.deegee.api.admin;

import java.time.LocalDate;
import java.util.List;

/**
 * Deegee's own numbers, across every artist.
 *
 * <p>{@link Float} comes first on purpose. The figure that can sink the business is not what
 * Deegee earned but whether the money sitting in the mobile money account matches what the ledger
 * says is owed: topped-up wallets and unwithdrawn earnings are other people's shillings. If those
 * two ever disagree, an admin should see it on the first screen rather than when an artist's
 * withdrawal bounces.
 */
public record AdminInsights(Float held, Money money, List<Day> daily, People people, List<TopArtist> topArtists) {

    /**
     * What the ledger says Deegee is holding. {@code cash} is the provider clearing account seen
     * from the other side: a top-up moves money out of it into a wallet, so its balance runs
     * negative and the cash actually held is its mirror image.
     *
     * @param gapUgx cash minus everything owed and earned. Zero is the only right answer; anything
     *               else is a bug in the ledger or a payment the provider recorded and Deegee did not.
     */
    public record Float(long walletsUgx, long artistEarningsUgx, long payoutsInFlightUgx, long uprsUgx,
            long songwritersUgx, long platformRevenueUgx, long cashUgx, long gapUgx) {

        public long owedUgx() {
            return walletsUgx + artistEarningsUgx + payoutsInFlightUgx + uprsUgx + songwritersUgx;
        }
    }

    /**
     * Volume and Deegee's cut, kept apart. Conflating the two is how a business talks itself into
     * believing it is five times larger than it is.
     *
     * @param soldThroughUgx what fans paid artists: sales and gifts at face value
     * @param revenueUgx     Deegee's own share of that
     */
    public record Money(long soldThroughUgx, long revenueUgx, long toppedUpUgx, long revenueAllTimeUgx) {}

    public record Day(LocalDate date, long ugx) {}

    /** @param buyers fans who have bought at least one song; @param earning artists who have been paid at least once */
    public record People(long fans, long buyers, long artistsLive, long earning, long waiting) {}

    public record TopArtist(String artistId, String name, long earnedUgx, int sales) {}
}
