package app.deegee.api.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "artists")
public class Artist {

    /** PENDING: applied, waiting for an admin. ACTIVE: can publish and be paid. REJECTED: can fix and apply again. */
    public enum Status { PENDING, ACTIVE, REJECTED }

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false, length = 500)
    private String bio;

    @Column(nullable = false)
    private String genres;

    @Column(nullable = false)
    private boolean verified;

    @Column(name = "color_a", nullable = false, length = 7)
    private String colorA;

    @Column(name = "color_b", nullable = false, length = 7)
    private String colorB;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Status status;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(name = "payout_msisdn", length = 16)
    private String payoutMsisdn;

    @Column(name = "payout_provider", length = 20)
    private String payoutProvider;

    @Column(name = "review_note", length = 300)
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "activated_at")
    private Instant activatedAt;

    protected Artist() {}

    /** A new artist application from a signed-in user. */
    public Artist(String id, UUID ownerUserId, String name, String city, String bio, List<String> genres,
                  String payoutMsisdn, String payoutProvider, List<String> colors, Instant now) {
        this.id = id;
        this.ownerUserId = ownerUserId;
        this.colorA = colors.get(0);
        this.colorB = colors.get(1);
        this.createdAt = now;
        reapply(name, city, bio, genres, payoutMsisdn, payoutProvider);
    }

    /** Updates the application and sends it back to review. */
    public void reapply(String name, String city, String bio, List<String> genres, String payoutMsisdn, String payoutProvider) {
        this.name = name;
        this.city = city;
        this.bio = bio;
        this.genres = String.join(",", genres);
        this.payoutMsisdn = payoutMsisdn;
        this.payoutProvider = payoutProvider;
        this.status = Status.PENDING;
        this.reviewNote = null;
    }

    /** Approved by an admin: identity checked, so the artist also gets the verified badge. */
    public void activate(Instant now) {
        this.status = Status.ACTIVE;
        this.verified = true;
        this.reviewNote = null;
        if (activatedAt == null) activatedAt = now;
    }

    public void reject(String note) {
        this.status = Status.REJECTED;
        this.reviewNote = note;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getCity() { return city; }
    public String getBio() { return bio; }
    public boolean isVerified() { return verified; }
    public List<String> getGenres() { return Arrays.stream(genres.split(",")).map(String::trim).filter(g -> !g.isEmpty()).toList(); }
    public List<String> getColors() { return List.of(colorA, colorB); }
    public Status getStatus() { return status; }
    public boolean isActive() { return status == Status.ACTIVE; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public String getPayoutMsisdn() { return payoutMsisdn; }
    public String getPayoutProvider() { return payoutProvider; }
    public String getReviewNote() { return reviewNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getActivatedAt() { return activatedAt; }
}
