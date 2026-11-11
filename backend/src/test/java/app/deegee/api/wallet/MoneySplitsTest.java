package app.deegee.api.wallet;

import static app.deegee.api.wallet.MoneySplits.Terms.DEFAULT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.deegee.api.wallet.MoneySplits.PricedSong;
import app.deegee.api.wallet.MoneySplits.SaleSplit;
import app.deegee.api.wallet.MoneySplits.Songwriter;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Same cases and numbers as the app's src/lib/money.test.ts, so app and server agree. */
class MoneySplitsTest {

    private static long sum(SaleSplit s) {
        return s.uprs() + s.songwritersDirect() + s.artist() + s.platform();
    }

    @Test
    void uprsMemberWriterSongShareGoesToUprs() {
        SaleSplit s = MoneySplits.splitSale(2000, List.of(new Songwriter("A", 100, true)), DEFAULT);
        assertThat(s.uprs()).isEqualTo(200);
        assertThat(s.songwritersDirect()).isZero();
        assertThat(s.artist()).isEqualTo(1440);
        assertThat(s.platform()).isEqualTo(360);
        assertThat(sum(s)).isEqualTo(2000);
    }

    @Test
    void writerInNoSocietyIsPaidDirectly() {
        SaleSplit s = MoneySplits.splitSale(2000, List.of(new Songwriter("A", 100, false)), DEFAULT);
        assertThat(s.uprs()).isZero();
        assertThat(s.songwritersDirect()).isEqualTo(200);
        assertThat(sum(s)).isEqualTo(2000);
    }

    @Test
    void coWrittenSongSplitsPerWriter() {
        SaleSplit s = MoneySplits.splitSale(3000, List.of(new Songwriter("A", 50, true), new Songwriter("B", 50, false)), DEFAULT);
        assertThat(s.uprs()).isEqualTo(150);
        assertThat(s.songwritersDirect()).isEqualTo(150);
        assertThat(sum(s)).isEqualTo(3000);
    }

    @Test
    void oddAmountsNeverLoseAShilling() {
        for (long total : new long[] {1, 7, 999, 1501, 4999}) {
            SaleSplit s = MoneySplits.splitSale(total, List.of(new Songwriter("A", 33, true), new Songwriter("B", 67, false)), DEFAULT);
            assertThat(sum(s)).isEqualTo(total);
        }
    }

    @Test
    void rejectsSharesThatDontSumTo100() {
        assertThatThrownBy(() -> MoneySplits.splitSale(1000, List.of(new Songwriter("A", 90, true)), DEFAULT))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void giftArtistGets95PercentAndNothingIsLost() {
        MoneySplits.GiftSplit g = MoneySplits.splitGift(5000, DEFAULT);
        assertThat(g.artist()).isEqualTo(4750);
        assertThat(g.platform()).isEqualTo(250);
        MoneySplits.GiftSplit odd = MoneySplits.splitGift(1999, DEFAULT);
        assertThat(odd.artist() + odd.platform()).isEqualTo(1999);
        assertThatThrownBy(() -> MoneySplits.splitGift(100, DEFAULT)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void releaseSharesPriceAcrossSongs() {
        List<PricedSong> songs = List.of(
                new PricedSong(2000, List.of(new Songwriter("A", 100, true))),
                new PricedSong(2000, List.of(new Songwriter("B", 100, false))),
                new PricedSong(2000, List.of(new Songwriter("A", 100, true))));
        SaleSplit r = MoneySplits.splitRelease(5000, songs, DEFAULT);
        assertThat(r.total()).isEqualTo(5000);
        assertThat(sum(r)).isEqualTo(5000);
        assertThat(r.uprs()).isPositive();
        assertThat(r.songwritersDirect()).isPositive();
    }
}
