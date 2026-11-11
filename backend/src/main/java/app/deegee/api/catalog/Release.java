package app.deegee.api.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "releases")
public class Release {

    public enum Type {
        SINGLE("Single"), EP("EP"), ALBUM("Album");

        private final String label;

        Type(String label) { this.label = label; }

        public String label() { return label; }
    }

    /** DRAFT → IN_REVIEW → PUBLISHED, or REJECTED (fix and resubmit). Only PUBLISHED is in the catalogue. */
    public enum Status { DRAFT, IN_REVIEW, PUBLISHED, REJECTED;
        public boolean editable() { return this == DRAFT || this == REJECTED; }
    }

    @Id
    private String id;

    @Column(name = "artist_id", nullable = false)
    private String artistId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Type type;

    @Column(name = "release_year", nullable = false)
    private int year;

    @Column(name = "price_ugx", nullable = false)
    private long priceUgx;

    @Column(name = "color_a", nullable = false, length = 7)
    private String colorA;

    @Column(name = "color_b", nullable = false, length = 7)
    private String colorB;

    @Column(nullable = false)
    private boolean exclusive;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Status status;

    @Column(name = "cover_key", length = 200)
    private String coverKey;

    @Column(name = "review_note", length = 300)
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    protected Release() {}

    /** A new draft, created by its artist. */
    public Release(String id, String artistId, String title, Type type, long priceUgx, List<String> colors, int year, Instant now) {
        this.id = id;
        this.artistId = artistId;
        this.title = title;
        this.type = type;
        this.priceUgx = priceUgx;
        this.colorA = colors.get(0);
        this.colorB = colors.get(1);
        this.year = year;
        this.status = Status.DRAFT;
        this.createdAt = now;
    }

    public void edit(String title, Type type, long priceUgx) {
        this.title = title;
        this.type = type;
        this.priceUgx = priceUgx;
    }

    public void setCoverKey(String coverKey) { this.coverKey = coverKey; }

    public void submit(Instant now) {
        this.status = Status.IN_REVIEW;
        this.submittedAt = now;
        this.reviewNote = null;
    }

    public void publish(int year, Instant now) {
        this.status = Status.PUBLISHED;
        this.year = year;
        this.publishedAt = now;
    }

    public void reject(String note) {
        this.status = Status.REJECTED;
        this.reviewNote = note;
    }

    public String getId() { return id; }
    public String getArtistId() { return artistId; }
    public String getTitle() { return title; }
    public Type getType() { return type; }
    public int getYear() { return year; }
    public long getPriceUgx() { return priceUgx; }
    public boolean isExclusive() { return exclusive; }
    public List<String> getColors() { return List.of(colorA, colorB); }
    public Status getStatus() { return status; }
    public String getCoverKey() { return coverKey; }
    public String getReviewNote() { return reviewNote; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getPublishedAt() { return publishedAt; }
}
