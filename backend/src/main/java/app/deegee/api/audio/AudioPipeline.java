package app.deegee.api.audio;

import app.deegee.api.catalog.Track;
import app.deegee.api.catalog.TrackRepository;
import app.deegee.api.media.MediaStorage;
import app.deegee.api.media.MediaStorage.Folder;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Turns an uploaded master into what fans hear:
 * <ol>
 *   <li>measures its loudness (EBU R128),</li>
 *   <li>encodes the full song as AAC 128 kbps for buyers (about 1 MB a minute, against 10 MB for a WAV),</li>
 *   <li>cuts a 30-second preview from about a third of the way in, where the song has usually got going.</li>
 * </ol>
 * Both are matched to the same loudness, so a quiet song and a loud one play at a similar volume, and are
 * never turned up past −1 dBTP, so nothing clips. The master itself is kept exactly as uploaded.
 *
 * <p>Runs in the background after the upload is saved; the song shows "Processing…" until it's done.
 */
@Component
class AudioPipeline {

    private static final Logger log = LoggerFactory.getLogger(AudioPipeline.class);
    static final double PEAK_CEILING_DB = -1.0;

    private final Ffmpeg ffmpeg;
    private final TrackRepository tracks;
    private final MediaStorage storage;
    private final AudioProperties props;
    private final Executor executor;
    private final TransactionTemplate tx;

    AudioPipeline(Ffmpeg ffmpeg, TrackRepository tracks, MediaStorage storage, AudioProperties props, PlatformTransactionManager txManager) {
        this.ffmpeg = ffmpeg;
        this.tracks = tracks;
        this.storage = storage;
        this.props = props;
        // Two songs at a time is plenty for now, and keeps ffmpeg from crowding out the API.
        this.executor = props.synchronous() ? Runnable::run : Executors.newFixedThreadPool(2, r -> {
            Thread t = new Thread(r, "audio-pipeline");
            t.setDaemon(true);
            return t;
        });
        this.tx = new TransactionTemplate(txManager);
        // Saving the result must be its own transaction: this can run just after the upload's transaction commits.
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onUploaded(AudioUploaded event) {
        executor.execute(() -> process(event.trackId(), event.audioKey()));
    }

    /** Picks up songs left half-done by a restart, and recordings uploaded before the pipeline existed. */
    @EventListener(ApplicationReadyEvent.class)
    void resume() {
        if (!ffmpeg.available()) {
            log.warn("ffmpeg isn't installed (deegee.audio.ffmpeg={}). Uploaded songs will stay 'Processing' until it is. "
                    + "On a Mac: brew install ffmpeg", props.ffmpeg());
            return;
        }
        for (Track t : tracks.findByAudioStatus(Track.AudioStatus.PROCESSING)) {
            String trackId = t.getId(), key = t.getAudioKey();
            executor.execute(() -> process(trackId, key));
        }
    }

    void process(String trackId, String masterKey) {
        Path master = storage.find(masterKey).orElse(null);
        if (master == null) {
            fail(trackId, masterKey, "The uploaded file is missing. Upload the recording again.");
            return;
        }
        Path stream = null, preview = null;
        try {
            Ffmpeg.Loudness loudness = ffmpeg.measure(master);
            double gain = gainDb(loudness, props.targetLufs(), props.maxBoostDb());
            int duration = tx.execute(s -> tracks.findById(trackId).map(Track::getDurationSec).orElse(0));
            int length = Math.min(props.previewSec(), duration);

            stream = Files.createTempFile("deegee-stream-", ".m4a");
            ffmpeg.encodeStream(master, stream, gain);
            preview = Files.createTempFile("deegee-preview-", ".m4a");
            ffmpeg.encodePreview(master, preview, previewStart(duration, length), length, gain);

            String streamKey = storage.store(Folder.AUDIO, stream, "m4a");
            String previewKey = storage.store(Folder.PREVIEWS, preview, "m4a");
            boolean saved = Boolean.TRUE.equals(tx.execute(s -> tracks.findById(trackId)
                    .filter(t -> masterKey.equals(t.getAudioKey())) // not replaced or deleted meanwhile
                    .map(t -> {
                        t.audioReady(streamKey, previewKey, finite(loudness.lufs()), finite(loudness.truePeakDb()));
                        return true;
                    }).orElse(false)));
            if (!saved) {
                storage.delete(streamKey);
                storage.delete(previewKey);
            }
            log.info("Processed song {}: {} LUFS, peak {} dBTP, gain {} dB", trackId, loudness.lufs(), loudness.truePeakDb(), round(gain));
        } catch (Ffmpeg.FfmpegException e) {
            log.warn("Couldn't process song {}: {}", trackId, e.getMessage());
            fail(trackId, masterKey, "We couldn't process this recording. Export it again as WAV or FLAC and upload it.");
        } catch (IOException | RuntimeException e) {
            log.error("Couldn't process song {}", trackId, e);
            fail(trackId, masterKey, "Something went wrong while processing. Upload the recording again.");
        } finally {
            deleteQuietly(stream);
            deleteQuietly(preview);
        }
    }

    /**
     * How much to turn a song up or down: towards the target loudness, never past {@code maxBoostDb} up,
     * and never so far that its peaks would go above −1 dBTP.
     */
    static double gainDb(Ffmpeg.Loudness loudness, double targetLufs, double maxBoostDb) {
        if (!Double.isFinite(loudness.lufs())) return 0; // silence: nothing to match
        double gain = Math.min(targetLufs - loudness.lufs(), maxBoostDb);
        if (Double.isFinite(loudness.truePeakDb())) gain = Math.min(gain, PEAK_CEILING_DB - loudness.truePeakDb());
        return gain;
    }

    /** Previews start about a third of the way in, but always leave a full clip before the end. */
    static double previewStart(int durationSec, int lengthSec) {
        if (durationSec <= lengthSec + 10) return 0;
        return Math.min(durationSec * 0.3, durationSec - lengthSec);
    }

    private void fail(String trackId, String masterKey, String reason) {
        tx.executeWithoutResult(s -> tracks.findById(trackId)
                .filter(t -> masterKey.equals(t.getAudioKey()))
                .ifPresent(t -> t.audioFailed(reason)));
    }

    private static Double finite(double v) {
        return Double.isFinite(v) ? v : null;
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private static void deleteQuietly(Path p) {
        if (p == null) return;
        try {
            Files.deleteIfExists(p);
        } catch (IOException ignored) {
            // a stray temp file is harmless
        }
    }
}
