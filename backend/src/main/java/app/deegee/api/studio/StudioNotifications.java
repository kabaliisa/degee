package app.deegee.api.studio;

import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.catalog.Release;
import app.deegee.api.catalog.ReleaseRepository;
import app.deegee.api.notify.Notification;
import app.deegee.api.notify.Notifier;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** What the Studio tells an artist: their music is live, or somebody moved where their money goes. */
@Component
class StudioNotifications {

    private final ArtistRepository artists;
    private final ReleaseRepository releases;
    private final Notifier notifier;

    StudioNotifications(ArtistRepository artists, ReleaseRepository releases, Notifier notifier) {
        this.artists = artists;
        this.releases = releases;
        this.notifier = notifier;
    }

    @TransactionalEventListener
    public void onReleasePublished(ReleasePublished event) {
        Release release = releases.findById(event.releaseId()).orElse(null);
        if (release == null) return;
        UUID owner = ownerOf(release.getArtistId());
        if (owner != null) notifier.tell(owner, Notification.releaseLive(release.getTitle()));
    }

    /**
     * Goes to every phone the artist has signed in on, not just the one that made the change. That is
     * the whole point: if somebody else is in the account, this is how the artist finds out.
     */
    @TransactionalEventListener
    public void onPayoutNumberChanged(PayoutNumberChanged event) {
        UUID owner = ownerOf(event.artistId());
        if (owner != null) notifier.tell(owner, Notification.payoutNumberChanged(event.msisdn()));
    }

    private UUID ownerOf(String artistId) {
        return artists.findById(artistId).map(Artist::getOwnerUserId).orElse(null);
    }
}
