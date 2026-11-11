package app.deegee.api.payouts;

import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.common.ApiException;
import app.deegee.api.common.Hashing;
import app.deegee.api.wallet.Ledger;
import app.deegee.api.wallet.LedgerAccount.Kind;
import app.deegee.api.wallet.LedgerTransaction;
import app.deegee.api.wallet.MobileMoneyGateway;
import app.deegee.api.wallet.MobileMoneyGateway.DisbursementResult;
import app.deegee.api.wallet.WalletLine;
import app.deegee.api.wallet.WebhookController;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * An artist's earnings and getting them out to mobile money.
 *
 * <p>Money for a withdrawal leaves the artist's earnings the moment it's requested (into "payouts in flight"),
 * so it can't be withdrawn twice. When the provider confirms, it leaves Deegee; if the withdrawal is declined
 * or fails, it goes back to the artist's earnings.
 */
@Service
public class PayoutService {

    /** What the earnings screen shows. {@code availableUgx} can be withdrawn now; {@code heldUgx} unlocks at {@code nextUnlockAt}. */
    public record Earnings(long balanceUgx, long availableUgx, long heldUgx, Instant nextUnlockAt, long holdDays,
                           long minWithdrawalUgx, String payoutPhone, String payoutProvider,
                           List<EarningsLine> activity, List<WithdrawalView> withdrawals) {}

    public record EarningsLine(String id, String type, long amountUgx, String description, Instant at) {}

    public record WithdrawalView(UUID id, long amountUgx, String msisdn, String provider, String status, String reviewNote, Instant createdAt) {
        static WithdrawalView of(Withdrawal w) {
            return new WithdrawalView(w.getId(), w.getAmountUgx(), w.getMsisdn(), w.getProvider(), w.getStatus().name(), w.getReviewNote(), w.getCreatedAt());
        }
    }

    /** For the admin queue. */
    public record PendingWithdrawal(UUID id, String artistId, String artistName, long amountUgx, String msisdn, String provider, Instant createdAt) {}

    private static final Logger log = LoggerFactory.getLogger(PayoutService.class);

    private final ArtistRepository artists;
    private final WithdrawalRepository withdrawals;
    private final Ledger ledger;
    private final MobileMoneyGateway gateway;
    private final PayoutsProperties props;
    private final Clock clock;

    PayoutService(ArtistRepository artists, WithdrawalRepository withdrawals, Ledger ledger, MobileMoneyGateway gateway,
                  PayoutsProperties props, Clock clock) {
        this.artists = artists;
        this.withdrawals = withdrawals;
        this.ledger = ledger;
        this.gateway = gateway;
        this.props = props;
        this.clock = clock;
    }

    // ---- earnings ---------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Earnings earnings(UUID userId) {
        Artist artist = ownArtist(userId);
        UUID account = Ledger.artistEarningsId(artist.getId());
        long balance = ledger.balance(account);
        Duration hold = holdFor(artist);
        Instant since = clock.instant().minus(hold);
        long held = Math.min(balance, ledger.earnedSince(account, since));
        Instant nextUnlock = held > 0 ? ledger.firstEarningSince(account, since).map(t -> t.plus(hold)).orElse(null) : null;

        List<EarningsLine> activity = ledger.history(account, 50).stream().map(PayoutService::line).toList();
        List<WithdrawalView> recent = withdrawals.findTop20ByArtistIdOrderByCreatedAtDesc(artist.getId()).stream().map(WithdrawalView::of).toList();
        return new Earnings(balance, balance - held, held, nextUnlock, hold.toDays(), props.minWithdrawalUgx(),
                artist.getPayoutMsisdn(), artist.getPayoutProvider(), activity, recent);
    }

    /** New artists' money waits longer, so it's still here if someone proves they own the music. */
    private Duration holdFor(Artist artist) {
        Instant activated = artist.getActivatedAt();
        boolean isNew = activated == null || activated.isAfter(clock.instant().minus(props.newArtistPeriod()));
        return isNew ? props.newArtistHold() : props.saleHold();
    }

    private static EarningsLine line(WalletLine l) {
        String description = switch (l.type()) {
            case PURCHASE -> "Sale: " + l.description();
            case GIFT -> "Gift from a fan";
            case WITHDRAWAL -> "Withdrawal";
            case WITHDRAWAL_RETURNED -> "Withdrawal returned";
            default -> l.description();
        };
        return new EarningsLine(l.transactionId().toString(), l.type().name(), l.amountUgx(), description, l.createdAt());
    }

    // ---- withdrawals ------------------------------------------------------------------------

    /**
     * Takes the money out of the artist's earnings straight away. The artist's first withdrawal waits for an
     * admin to check it; later ones are sent immediately. Repeating a request with the same key returns the original.
     */
    @Transactional
    public WithdrawalView withdraw(UUID userId, long amountUgx, String idempotencyKey) {
        String key = userId + ":" + idempotencyKey;
        var existing = withdrawals.findByIdempotencyKey(key);
        if (existing.isPresent()) return WithdrawalView.of(existing.get());

        Artist artist = ownArtist(userId);
        if (!artist.isActive()) throw new ApiException(HttpStatus.CONFLICT, "ARTIST_NOT_APPROVED", "You can withdraw once your artist profile is approved.");
        if (artist.getPayoutMsisdn() == null) throw new ApiException(HttpStatus.CONFLICT, "NO_PAYOUT_NUMBER", "Add a mobile money number to your artist profile.");
        if (amountUgx < props.minWithdrawalUgx()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "WITHDRAWAL_TOO_SMALL",
                    "The smallest withdrawal is UGX %,d.".formatted(props.minWithdrawalUgx()));
        }

        UUID account = Ledger.artistEarningsId(artist.getId());
        long balance = ledger.lockAccount(account); // one withdrawal at a time per artist
        Instant since = clock.instant().minus(holdFor(artist));
        long available = balance - Math.min(balance, ledger.earnedSince(account, since));
        if (amountUgx > available) {
            throw new ApiException(HttpStatus.CONFLICT, "NOT_ENOUGH_AVAILABLE", "You can withdraw up to UGX %,d right now.".formatted(available),
                    Map.of("availableUgx", available));
        }

        Instant now = clock.instant();
        Withdrawal w = withdrawals.save(new Withdrawal(artist.getId(), userId, amountUgx, artist.getPayoutMsisdn(), artist.getPayoutProvider(),
                WebhookController.PAYOUT_REF_PREFIX + Hashing.randomToken(12), key, now));
        ledger.post(LedgerTransaction.Type.WITHDRAWAL, userId, w.getId().toString(), "Withdrawal to " + w.getMsisdn(), key, List.of(
                new Ledger.Posting(account, -amountUgx),
                new Ledger.Posting(Ledger.systemId(Kind.PAYOUTS_IN_FLIGHT), amountUgx)));

        boolean firstEver = !withdrawals.existsByArtistIdAndStatus(artist.getId(), Withdrawal.Status.COMPLETED);
        if (!firstEver) send(w, now);
        return WithdrawalView.of(w);
    }

    @Transactional(readOnly = true)
    public List<PendingWithdrawal> pending() {
        return withdrawals.findByStatusOrderByCreatedAt(Withdrawal.Status.REQUESTED).stream().map(w -> new PendingWithdrawal(
                w.getId(), w.getArtistId(), artists.findById(w.getArtistId()).map(Artist::getName).orElse(w.getArtistId()),
                w.getAmountUgx(), w.getMsisdn(), w.getProvider(), w.getCreatedAt())).toList();
    }

    @Transactional
    public void approve(UUID withdrawalId) {
        Withdrawal w = requested(withdrawalId);
        send(w, clock.instant());
    }

    @Transactional
    public void reject(UUID withdrawalId, String note) {
        Withdrawal w = requested(withdrawalId);
        String n = note == null ? "" : note.strip();
        if (n.isEmpty()) throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "NOTE_REQUIRED", "Tell the artist why.");
        Instant now = clock.instant();
        w.reject(n.length() > 300 ? n.substring(0, 300) : n, now);
        giveBack(w);
    }

    /** The provider's answer. Safe to receive more than once: only a SENT withdrawal changes. */
    @EventListener
    @Transactional
    public void onDisbursementResult(DisbursementResult result) {
        Withdrawal w = withdrawals.lockByProviderRef(result.providerRef()).orElse(null);
        if (w == null) {
            log.warn("Payout result for unknown reference {}", result.providerRef());
            return;
        }
        if (w.getStatus() != Withdrawal.Status.SENT) return;
        Instant now = clock.instant();
        if (result.succeeded()) {
            w.move(Withdrawal.Status.COMPLETED, now);
            ledger.post(LedgerTransaction.Type.PAYOUT, w.getUserId(), w.getId().toString(), "Paid to " + w.getMsisdn(), null, List.of(
                    new Ledger.Posting(Ledger.systemId(Kind.PAYOUTS_IN_FLIGHT), -w.getAmountUgx()),
                    new Ledger.Posting(Ledger.systemId(Kind.PROVIDER_CLEARING), w.getAmountUgx())));
        } else {
            w.move(Withdrawal.Status.FAILED, now);
            giveBack(w);
        }
    }

    private void send(Withdrawal w, Instant now) {
        w.move(Withdrawal.Status.SENT, now);
        gateway.requestDisbursement(w.getProviderRef(), w.getMsisdn(), w.getAmountUgx());
    }

    private void giveBack(Withdrawal w) {
        ledger.post(LedgerTransaction.Type.WITHDRAWAL_RETURNED, w.getUserId(), w.getId().toString(), "Withdrawal returned", null, List.of(
                new Ledger.Posting(Ledger.systemId(Kind.PAYOUTS_IN_FLIGHT), -w.getAmountUgx()),
                new Ledger.Posting(Ledger.artistEarningsId(w.getArtistId()), w.getAmountUgx())));
    }

    private Withdrawal requested(UUID id) {
        return withdrawals.lockById(id).filter(w -> w.getStatus() == Withdrawal.Status.REQUESTED)
                .orElseThrow(() -> ApiException.notFound("Withdrawal waiting for review"));
    }

    private Artist ownArtist(UUID userId) {
        return artists.findByOwnerUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_AN_ARTIST", "You haven't set up an artist profile yet."));
    }
}
