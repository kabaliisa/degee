package app.deegee.api.audio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;

class AudioPipelineRulesTest {

    @Test
    void loudSongsAreTurnedDownToTheTarget() {
        assertThat(AudioPipeline.gainDb(new Ffmpeg.Loudness(-8, -0.5), -14, 10)).isCloseTo(-6, within(0.001));
    }

    @Test
    void quietSongsAreTurnedUpButNeverClipAndNeverByMoreThanTheLimit() {
        // −20 LUFS wants +6 dB, but its peaks at −3 dBTP only leave room for +2.
        assertThat(AudioPipeline.gainDb(new Ffmpeg.Loudness(-20, -3), -14, 10)).isCloseTo(2, within(0.001));
        // A very quiet song with plenty of headroom is capped at the boost limit.
        assertThat(AudioPipeline.gainDb(new Ffmpeg.Loudness(-40, -30), -14, 10)).isCloseTo(10, within(0.001));
    }

    @Test
    void silenceIsLeftAlone() {
        assertThat(AudioPipeline.gainDb(new Ffmpeg.Loudness(Double.NEGATIVE_INFINITY, Double.NEGATIVE_INFINITY), -14, 10)).isZero();
    }

    @Test
    void previewsStartAThirdOfTheWayInButAlwaysFit() {
        assertThat(AudioPipeline.previewStart(200, 30)).isCloseTo(60, within(0.001));
        assertThat(AudioPipeline.previewStart(45, 30)).isCloseTo(13.5, within(0.001)); // 45 × 0.3, and 13.5 + 30 ≤ 45
        assertThat(AudioPipeline.previewStart(35, 30)).isZero(); // too short to bother: start at the top
        assertThat(AudioPipeline.previewStart(30, 30)).isZero();
    }
}
