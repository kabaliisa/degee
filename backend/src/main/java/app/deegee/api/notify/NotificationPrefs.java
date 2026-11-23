package app.deegee.api.notify;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Which notifications a person wants. No row means all of them: someone who never opens settings
 * still hears about a sale.
 *
 * <p>Account and payout changes are deliberately absent. They are the ones that tell an artist
 * somebody is moving their money, so they are not a person's to switch off.
 */
@Entity
@Table(name = "notification_prefs")
public class NotificationPrefs {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private boolean sales = true;

    @Column(nullable = false)
    private boolean gifts = true;

    @Column(nullable = false)
    private boolean payouts = true;

    @Column(nullable = false)
    private boolean releases = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected NotificationPrefs() {}

    NotificationPrefs(UUID userId, Instant now) {
        this.userId = userId;
        this.updatedAt = now;
    }

    /** The defaults, for a person with no row. */
    static NotificationPrefs allOn() {
        return new NotificationPrefs();
    }

    public boolean sales() { return sales; }
    public boolean gifts() { return gifts; }
    public boolean payouts() { return payouts; }
    public boolean releases() { return releases; }

    void set(Boolean sales, Boolean gifts, Boolean payouts, Boolean releases, Instant now) {
        if (sales != null) this.sales = sales;
        if (gifts != null) this.gifts = gifts;
        if (payouts != null) this.payouts = payouts;
        if (releases != null) this.releases = releases;
        this.updatedAt = now;
    }

    boolean wants(Notification.Kind kind) {
        return switch (kind) {
            case SALE -> sales;
            case GIFT -> gifts;
            case PAYOUT_SENT, PAYOUT_RETURNED -> payouts;
            case RELEASE_LIVE -> releases;
            // Security and money the fan has already parted with. Not switchable.
            case PAYOUT_NUMBER_CHANGED, CREDIT_HELD -> true;
        };
    }
}
