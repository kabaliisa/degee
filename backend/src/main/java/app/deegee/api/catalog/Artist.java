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

    /**
     * The artist's address: deegee.ug/{slug}. Stored rather than worked out from the name, so a
     * rename does not silently move the page out from under every link already shared.
     */
    @Column(nullable = false, length = 60)
    private String slug;

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

    /** When the payout number last moved. Withdrawals are held for a day after it does. */
    @Column(name = "payout_changed_at")
    private Instant payoutChangedAt;

    @Column(name = "review_note", length = 300)
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "activated_at")
    private Instant activatedAt;

    protected Artist() {}

    /** A new artist application from a signed-in user. */
    public Artist(String id, UUID ownerUserId, String name, String slug, String city, String bio, List<String> genres,
                  String payoutMsisdn, String payoutProvider, List<String> colors, Instant now) {
        this.id = id;
        this.ownerUserId = ownerUserId;
        this.slug = slug;
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

    /**
     * An approved artist changing what their page says. Deliberately not {@link #reapply}: that
     * sends the application back to PENDING, which would pull a live catalogue down and drop the
     * verified badge because somebody fixed a typo in their bio. Nothing here is identity, so
     * nothing here needs re-checking.
     */
    public void editProfile(String name, String city, String bio, List<String> genres) {
        this.name = name;
        this.city = city;
        this.bio = bio;
        this.genres = String.join(",", genres);
    }

    /**
     * Moving the page itself. Separate from {@link #editProfile} because it is the one edit with a
     * cost outside Deegee: every poster, bio and shared link pointing at the old address stops
     * working, and only the artist can judge whether that is worth it.
     */
    public void changeHandle(String slug) {
        this.slug = slug;
    }

    /**
     * Where withdrawals are sent. Stamped with the time because the payout number is how money
     * leaves the platform: whoever takes over an account changes this first, and holding
     * withdrawals for a day afterwards costs them the speed the attack depends on. An artist who
     * has genuinely changed SIM keeps earning throughout and waits a day to move it.
     */
    public void changePayout(String msisdn, String provider, Instant now) {
        boolean moved = !java.util.Objects.equals(this.payoutMsisdn, msisdn);
        this.payoutMsisdn = msisdn;
        this.payoutProvider = provider;
        if (moved) this.payoutChangedAt = now;
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
    public String getSlug() { return slug; }
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
    public Instant getPayoutChangedAt() { return payoutChangedAt; }

    /** How long a withdrawal is held after the payout number moves. */
    public static final java.time.Duration PAYOUT_HOLD = java.time.Duration.ofHours(24);

    /** When withdrawals work again, or null if the number has never moved. */
    public Instant payoutHoldUntil() {
        return payoutChangedAt == null ? null : payoutChangedAt.plus(PAYOUT_HOLD);
    }
    public String getReviewNote() { return reviewNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getActivatedAt() { return activatedAt; }
}
