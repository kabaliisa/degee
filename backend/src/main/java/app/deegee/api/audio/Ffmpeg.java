package app.deegee.api.audio;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** The few ffmpeg commands the pipeline needs. */
@Component
class Ffmpeg {

    /** Loudness of a recording: integrated LUFS and true peak in dBTP (−∞ for silence). */
    record Loudness(double lufs, double truePeakDb) {}

    static class FfmpegException extends RuntimeException {
        FfmpegException(String message) {
            super(message);
        }
    }

    private static final Pattern INTEGRATED = Pattern.compile("I:\\s+(-?[\\d.]+|-inf) LUFS");
    private static final Pattern PEAK = Pattern.compile("Peak:\\s+(-?[\\d.]+|-inf) dBFS");

    private final AudioProperties props;

    Ffmpeg(AudioProperties props) {
        this.props = props;
    }

    /** Whether ffmpeg can be run at all. */
    boolean available() {
        try {
            run(List.of(props.ffmpeg(), "-hide_banner", "-version"));
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    /** Measures loudness with the EBU R128 meter (the one streaming services use). */
    Loudness measure(Path master) {
        String log = run(List.of(props.ffmpeg(), "-hide_banner", "-nostats", "-i", master.toString(),
                "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"));
        // The meter prints running values as it goes and a summary at the end, so take the last match.
        return new Loudness(last(INTEGRATED, log), last(PEAK, log));
    }

    /** The full song for streaming: AAC, stereo, 44.1 kHz, turned up or down by {@code gainDb}, ready to start playing at once. */
    void encodeStream(Path master, Path out, double gainDb) {
        run(List.of(props.ffmpeg(), "-y", "-hide_banner", "-i", master.toString(), "-vn", "-map_metadata", "-1",
                "-af", volume(gainDb), "-c:a", "aac", "-b:a", props.streamBitrate(), "-ar", "44100", "-ac", "2",
                "-movflags", "+faststart", out.toString()));
    }

    /** A clip starting at {@code startSec}, faded in and out so it doesn't cut off abruptly. */
    void encodePreview(Path master, Path out, double startSec, int lengthSec, double gainDb) {
        String fades = "afade=t=in:d=1,afade=t=out:st=%s:d=2".formatted(fmt(Math.max(0, lengthSec - 2)));
        run(List.of(props.ffmpeg(), "-y", "-hide_banner", "-ss", fmt(startSec), "-t", String.valueOf(lengthSec),
                "-i", master.toString(), "-vn", "-map_metadata", "-1", "-af", volume(gainDb) + "," + fades,
                "-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-ac", "2", "-movflags", "+faststart", out.toString()));
    }

    private static String volume(double gainDb) {
        return "volume=" + fmt(gainDb) + "dB";
    }

    private static String fmt(double v) {
        return String.format(Locale.ROOT, "%.2f", v);
    }

    private static double last(Pattern pattern, String log) {
        Matcher m = pattern.matcher(log);
        String value = null;
        while (m.find()) value = m.group(1);
        if (value == null) throw new FfmpegException("Couldn't measure the loudness of this recording.");
        return value.equals("-inf") ? Double.NEGATIVE_INFINITY : Double.parseDouble(value);
    }

    /** Runs a command and returns what it printed. Throws if it fails or runs too long. */
    private String run(List<String> command) {
        Process process;
        try {
            process = new ProcessBuilder(new ArrayList<>(command)).redirectErrorStream(true).start();
        } catch (IOException e) {
            throw new FfmpegException("The server can't run ffmpeg (" + props.ffmpeg() + "). Is it installed?");
        }
        try {
            // Read while it runs, so a chatty process never blocks on a full pipe.
            byte[] output = process.getInputStream().readAllBytes();
            if (!process.waitFor(props.timeout().toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                throw new FfmpegException("Processing took too long.");
            }
            String log = new String(output, StandardCharsets.UTF_8);
            if (process.exitValue() != 0) {
                String tail = log.length() > 400 ? log.substring(log.length() - 400) : log;
                throw new FfmpegException("ffmpeg failed: " + tail.strip());
            }
            return log;
        } catch (IOException e) {
            process.destroyForcibly();
            throw new FfmpegException("Lost contact with ffmpeg.");
        } catch (InterruptedException e) {
            process.destroyForcibly();
            Thread.currentThread().interrupt();
            throw new FfmpegException("Processing was stopped.");
        }
    }
}
