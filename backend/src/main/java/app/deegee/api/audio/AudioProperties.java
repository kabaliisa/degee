package app.deegee.api.audio;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings for the audio pipeline.
 *
 * @param ffmpeg        the ffmpeg program (on the PATH, or a full path)
 * @param targetLufs    loudness every stream and preview is matched to (streaming services use about −14)
 * @param maxBoostDb    the most a quiet song is turned up
 * @param streamBitrate AAC bitrate of the full stream buyers hear
 * @param previewSec    length of the free preview
 * @param timeout       how long one ffmpeg run may take before it's stopped
 * @param synchronous   process in the request thread (tests); otherwise in the background
 */
@ConfigurationProperties("deegee.audio")
public record AudioProperties(String ffmpeg, double targetLufs, double maxBoostDb, String streamBitrate, int previewSec,
                              Duration timeout, boolean synchronous) {}
