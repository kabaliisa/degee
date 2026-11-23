package app.deegee.api.wallet;

import app.deegee.api.auth.UserRepository;
import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.catalog.Release;
import app.deegee.api.catalog.ReleaseRepository;
import app.deegee.api.catalog.Track;
import app.deegee.api.catalog.TrackRepository;
import app.deegee.api.notify.Notification;
import app.deegee.api.notify.Notifier;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Turns a settled order into something somebody's phone says.
 *
 * <p>Lives in this package because it reads this package's repositories. It runs after the order's
 * transaction has committed, so nothing it does can undo a sale.
 */
@Component
class OrderNotifications {

    private final CheckoutOrderRepository orders;
    private final ArtistRepository artists;
    private final TrackRepository tracks;
    private final ReleaseRepository releases;
    private final UserRepository users;
    private final GiftRepository gifts;
    private final Ledger ledger;
    private final Notifier notifier;

    OrderNotifications(CheckoutOrderRepository orders, ArtistRepository artists, TrackRepository tracks, ReleaseRepository releases,
                       UserRepository users, GiftRepository gifts, Ledger ledger, Notifier notifier) {
        this.orders = orders;
        this.artists = artists;
        this.tracks = tracks;
        this.releases = releases;
        this.users = users;
        this.gifts = gifts;
        this.ledger = ledger;
        this.notifier = notifier;
    }

    @TransactionalEventListener
    public void onOrderSettled(OrderSettled event) {
        CheckoutOrder order = orders.findById(event.orderId()).orElse(null);
        if (order == null) return;
        switch (order.getStatus()) {
            case COMPLETED -> delivered(order);
            // The fan paid and we couldn't hand over the goods. They aren't watching, and their money moved.
            case CREDITED -> notifier.tell(order.getUserId(), Notification.creditHeld(order.getAmountUgx()));
            // A declined payment needs no notification: the fan was holding the phone when the PIN prompt
            // timed out or was refused, and the app already told them.
            default -> { }
        }
    }

    private void delivered(CheckoutOrder order) {
        if (order.getKind() == CheckoutOrder.Kind.GIFT) {
            gift(order);
            return;
        }
        String artistId = artistOf(order);
        if (artistId == null) return;
        UUID owner = ownerOf(artistId);
        if (owner == null) return; // an artist nobody has claimed yet
        long earned = ledger.amountIn(order.getTransactionId(), Ledger.artistEarningsId(artistId));
        notifier.tell(owner, Notification.sale(titleOf(order), earned));
    }

    private void gift(CheckoutOrder order) {
        String artistId = order.getItemId();
        UUID owner = ownerOf(artistId);
        if (owner == null) return;
        long earned = ledger.amountIn(order.getTransactionId(), Ledger.artistEarningsId(artistId));
        String note = gifts.findByTransactionId(order.getTransactionId()).map(Gift::getNote).orElse(order.getNote());
        notifier.tell(owner, Notification.gift(fanName(order.getUserId()), earned, note));
    }

    /** A fan who hasn't set a name is still a person, not a blank. */
    private String fanName(UUID userId) {
        return users.findById(userId)
                .map(u -> u.getName() == null || u.getName().isBlank() ? null : u.getName())
                .orElse("A fan");
    }

    private String artistOf(CheckoutOrder order) {
        return order.getKind() == CheckoutOrder.Kind.TRACK
                ? tracks.findById(order.getItemId()).map(Track::getArtistId).orElse(null)
                : releases.findById(order.getItemId()).map(Release::getArtistId).orElse(null);
    }

    private String titleOf(CheckoutOrder order) {
        return order.getKind() == CheckoutOrder.Kind.TRACK
                ? tracks.findById(order.getItemId()).map(Track::getTitle).orElse("Your song")
                : releases.findById(order.getItemId()).map(Release::getTitle).orElse("Your release");
    }

    private UUID ownerOf(String artistId) {
        return artists.findById(artistId).map(Artist::getOwnerUserId).orElse(null);
    }
}
