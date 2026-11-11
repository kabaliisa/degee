package app.deegee.api.catalog;

import app.deegee.api.wallet.MoneySplits;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
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

    @Column(name = "audio_url", length = 500)
    private String audioUrl;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "track_writers", joinColumns = @JoinColumn(name = "track_id"))
    private List<Writer> writers = new ArrayList<>();

    protected Track() {}

    public String getId() { return id; }
    public String getReleaseId() { return releaseId; }
    public String getArtistId() { return artistId; }
    public String getTitle() { return title; }
    public int getTrackNo() { return trackNo; }
    public int getDurationSec() { return durationSec; }
    public long getPriceUgx() { return priceUgx; }
    public String getAudioUrl() { return audioUrl; }
    public List<Writer> getWriters() { return writers; }

    public List<MoneySplits.Songwriter> songwriters() {
        return writers.stream().map(Writer::toSongwriter).toList();
    }
}
