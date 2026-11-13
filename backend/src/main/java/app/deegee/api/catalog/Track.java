package app.deegee.api.catalog;

import app.deegee.api.wallet.MoneySplits;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tracks")
public class Track {

    /** One songwriter's share of a song. */
    @Embeddable
    public static class Writer {
        @Column(name = "writer_name", nullable = false)
        private String name;

        @Column(name = "share_pct", nullable = false)
        private int sharePct;

        @Column(length = 10)
        private String society; // UPRS, FOREIGN or null

        protected Writer() {}

        public Writer(String name, int sharePct, String society) {
            this.name = name;
            this.sharePct = sharePct;
            this.society = society;
        }

        public String getName() { return name; }
        public int getSharePct() { return sharePct; }
        public String getSociety() { return society; }

        public MoneySplits.Songwriter toSongwriter() {
            return new MoneySplits.Songwriter(name, sharePct, society != null);
        }
    }

    @Id
    private String id;

    @Column(name = "release_id", nullable = false)
    private String releaseId;

    @Column(name = "artist_id", nullable = false)
    private String artistId;

    @Column(nullable = false)
    private String title;

    @Column(name = "track_no", nullable = false)
    private int trackNo;

    @Column(name = "duration_sec", nullable = false)
    private int durationSec;

    @Column(name = "price_ugx", nullable = false)
    private long priceUgx;

    @Column(name = "audio_key", length = 200)
    private String audioKey; // the master, exactly as uploaded

    @Enumerated(EnumType.STRING)
    @Column(name = "audio_status", length = 12)
    private AudioStatus audioStatus;

    @Column(name = "audio_error", length = 300)
    private String audioError;

    @Column(name = "stream_key", length = 200)
    private String streamKey;

    @Column(name = "preview_key", length = 200)
    private String previewKey;

    @Column(name = "source_lossy", nullable = false)
    private boolean sourceLossy;

    @Column(name = "loudness_lufs")
    private Double loudnessLufs;

    @Column(name = "true_peak_db")
    private Double truePeakDb;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "track_writers", joinColumns = @JoinColumn(name = "track_id"))
    private List<Writer> writers = new ArrayList<>();

    protected Track() {}

    /** A new song on a draft release; the audio is uploaded separately. */
    public Track(String id, String releaseId, String artistId, int trackNo, String title, long priceUgx, List<Writer> writers) {
        this.id = id;
        this.releaseId = releaseId;
        this.artistId = artistId;
        this.trackNo = trackNo;
        edit(title, priceUgx, writers);
    }

    public void edit(String title, long priceUgx, List<Writer> writers) {
        this.title = title;
        this.priceUgx = priceUgx;
        this.writers.clear();
        this.writers.addAll(writers);
    }

    /** Where an uploaded recording is in the audio pipeline. */
    public enum AudioStatus { PROCESSING, READY, FAILED }

    /** A new master. Returns the keys of the old files (master, stream, preview) so they can be deleted. */
    public List<String> setAudio(String audioKey, int durationSec, boolean sourceLossy) {
        List<String> old = new ArrayList<>();
        for (String k : new String[] {this.audioKey, streamKey, previewKey}) if (k != null) old.add(k);
        this.audioKey = audioKey;
        this.durationSec = durationSec;
        this.sourceLossy = sourceLossy;
        this.audioStatus = AudioStatus.PROCESSING;
        this.audioError = null;
        this.streamKey = null;
        this.previewKey = null;
        this.loudnessLufs = null;
        this.truePeakDb = null;
        return old;
    }

    public void audioReady(String streamKey, String previewKey, Double loudnessLufs, Double truePeakDb) {
        this.streamKey = streamKey;
        this.previewKey = previewKey;
        this.loudnessLufs = loudnessLufs;
        this.truePeakDb = truePeakDb;
        this.audioStatus = AudioStatus.READY;
        this.audioError = null;
    }

    public void audioFailed(String reason) {
        this.audioStatus = AudioStatus.FAILED;
        this.audioError = reason.length() > 300 ? reason.substring(0, 300) : reason;
    }

    public void setTrackNo(int trackNo) { this.trackNo = trackNo; }

    public String getId() { return id; }
    public String getReleaseId() { return releaseId; }
    public String getArtistId() { return artistId; }
    public String getTitle() { return title; }
    public int getTrackNo() { return trackNo; }
    public int getDurationSec() { return durationSec; }
    public long getPriceUgx() { return priceUgx; }
    public List<Writer> getWriters() { return writers; }
    public String getAudioKey() { return audioKey; }
    public boolean hasAudio() { return audioKey != null; }
    public AudioStatus getAudioStatus() { return audioStatus; }
    public String getAudioError() { return audioError; }
    public String getStreamKey() { return streamKey; }
    public String getPreviewKey() { return previewKey; }
    public boolean isSourceLossy() { return sourceLossy; }
    public Double getLoudnessLufs() { return loudnessLufs; }
    public Double getTruePeakDb() { return truePeakDb; }
    public boolean isAudioReady() { return audioStatus == AudioStatus.READY; }

    /** Every stored file of this song, for deleting it. */
    public List<String> mediaKeys() {
        List<String> keys = new ArrayList<>();
        for (String k : new String[] {audioKey, streamKey, previewKey}) if (k != null) keys.add(k);
        return keys;
    }

    public List<MoneySplits.Songwriter> songwriters() {
        return writers.stream().map(Writer::toSongwriter).toList();
    }
}
