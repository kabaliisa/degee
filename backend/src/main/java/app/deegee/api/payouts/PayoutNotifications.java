package app.deegee.api.payouts;

import app.deegee.api.notify.Notification;
import app.deegee.api.notify.Notifier;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Tells an artist what happened to their withdrawal. Runs after the ledger has already moved the
 * money, whichever way it went.
 */
@Component
class PayoutNotifications {

    private final WithdrawalRepository withdrawals;
    private final Notifier notifier;

    PayoutNotifications(WithdrawalRepository withdrawals, Notifier notifier) {
        this.withdrawals = withdrawals;
        this.notifier = notifier;
    }

    @TransactionalEventListener
    public void onWithdrawalSettled(WithdrawalSettled event) {
        Withdrawal w = withdrawals.findById(event.withdrawalId()).orElse(null);
        if (w == null) return;
        UUID artist = w.getUserId();
        // A rejection and a provider failure read the same to the artist: the money came back. The
        // reviewer's note is in the Studio for a rejection; a lock screen is not the place for it.
        notifier.tell(artist, event.paid()
                ? Notification.payoutSent(w.getAmountUgx(), w.getMsisdn())
                : Notification.payoutReturned(w.getAmountUgx()));
    }
}
