package app.deegee.api.wallet;

import app.deegee.api.auth.PhoneNumbers.Provider;
import app.deegee.api.common.ApiException;
import app.deegee.api.wallet.CheckoutOrder.Kind;
import app.deegee.api.wallet.CheckoutOrder.Status;
import app.deegee.api.wallet.PurchaseService.ItemKind;
import java.time.Clock;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Paying for a song, a release or a gift directly with mobile money: one PIN prompt, no wallet to top up.
 *
 * <p>How it works: the fan's Deegee credit (usually zero) is used first. For the rest, a PIN prompt goes
 * to their phone. When the provider confirms the payment, the money lands in their credit and the order
 * spends it straight away, in a transaction of its own. If that last step can't happen (they bought the
 * same song on another phone while the prompt was open), the money is not lost: it stays as credit and
 * comes off their next checkout.
 */
@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    /** Mobile money has a smallest payment. Anything collected beyond what's owed stays as credit. */
    public static final long MIN_COLLECTION_UGX = 500;

    private static final int MAX_NOTE = 140;

    private final CheckoutOrderRepository orders;
    private final PaymentIntentRepository intents;
    private final TopUpService payments;
    private final PurchaseService purchases;
    private final GiftService gifts;
    private final Ledger ledger;
    private final Clock clock;
    private final TransactionTemplate newTx;

    CheckoutService(CheckoutOrderRepository orders, PaymentIntentRepository intents, TopUpService payments, PurchaseService purchases,
                    GiftService gifts, Ledger ledger, Clock clock, PlatformTransactionManager txManager) {
        this.orders = orders;
        this.intents = intents;
        this.payments = payments;
        this.purchases = purchases;
        this.gifts = gifts;
        this.ledger = ledger;
        this.clock = clock;
        this.newTx = new TransactionTemplate(txManager);
        // Completing an order runs just after the payment's own transaction commits, so it needs its own.
        this.newTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Starts a checkout. Anything that can't be bought is refused here, before any money is asked for.
     * If credit covers the price the order completes at once; otherwise a PIN prompt is sent and the order
     * waits for the answer. Repeating a request with the same idempotency key returns the first order.
     *
     * @param amountUgx the size of a gift (ignored for music, which has its own price)
     * @param provider  and {@code phone}: where to send the PIN prompt; only needed if credit doesn't cover it
     */
    @Transactional
    public CheckoutOrder start(UUID userId, Kind kind, String itemId, Long amountUgx, String note, Provider provider, String phone,
                               String idempotencyKey) {
        String key = userId + ":" + idempotencyKey;
        var existing = orders.findByIdempotencyKey(key);
        if (existing.isPresent()) return existing.get();

        long price = switch (kind) {
            case TRACK -> purchases.quote(userId, ItemKind.TRACK, itemId);
            case RELEASE -> purchases.quote(userId, ItemKind.RELEASE, itemId);
            case GIFT -> {
                long gift = amountUgx == null ? 0 : amountUgx;
                gifts.check(userId, itemId, gift);
                yield gift;
            }
        };
        String cleanNote = kind != Kind.GIFT || note == null || note.isBlank() ? null
                : note.strip().substring(0, Math.min(note.strip().length(), MAX_NOTE));
        CheckoutOrder order = new CheckoutOrder(userId, kind, itemId, price, cleanNote, key, clock.instant());

        long credit = ledger.balance(Ledger.walletId(userId));
        if (credit >= price) {
            order.completed(fulfil(order), clock.instant()); // if this throws, nothing is saved and the fan sees why
        } else {
            if (provider == null || phone == null || phone.isBlank()) {
                throw ApiException.badRequest("PAYMENT_METHOD_REQUIRED", "Choose MTN MoMo or Airtel Money and the number to pay from.");
            }
            long collect = Math.max(price - credit, MIN_COLLECTION_UGX);
            order.waitingFor(payments.collect(userId, collect, provider, phone, "checkout-" + order.getId()));
        }
        return orders.save(order);
    }

    /** The order as it stands. Also finishes an order whose payment arrived but wasn't applied (say, a restart got in between). */
    public CheckoutOrder get(UUID userId, UUID orderId) {
        CheckoutOrder order = find(userId, orderId);
        if (order.getStatus() == Status.WAITING && order.getPaymentIntentId() != null) {
            PaymentIntent.Status paid = intents.findById(order.getPaymentIntentId()).map(PaymentIntent::getStatus).orElse(null);
            if (paid != null && paid != PaymentIntent.Status.PENDING) {
                settle(order.getPaymentIntentId());
                order = find(userId, orderId);
            }
        }
        return order;
    }

    private CheckoutOrder find(UUID userId, UUID orderId) {
        return orders.findById(orderId).filter(o -> o.getUserId().equals(userId)).orElseThrow(() -> ApiException.notFound("Order"));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onPaymentSettled(PaymentSettled event) {
        try {
            settle(event.paymentIntentId());
        } catch (RuntimeException e) {
            // The payment itself is safely recorded. The order is completed when the app next asks about it.
            log.error("Couldn't complete the order paid by {}", event.paymentIntentId(), e);
        }
    }

    /** Applies a payment's answer to the order waiting on it. Safe to call more than once. */
    void settle(UUID paymentIntentId) {
        try {
            newTx.executeWithoutResult(tx -> orders.lockByPaymentIntentId(paymentIntentId)
                    .filter(o -> o.getStatus() == Status.WAITING)
                    .ifPresent(order -> {
                        PaymentIntent.Status paid = intents.findById(paymentIntentId).orElseThrow().getStatus();
                        if (paid == PaymentIntent.Status.FAILED) order.declined(clock.instant());
                        else if (paid == PaymentIntent.Status.COMPLETED) order.completed(fulfil(order), clock.instant());
                    }));
        } catch (ApiException e) {
            // Paid, but it can't be delivered (already owned, taken down, …). The money stays as their credit.
            newTx.executeWithoutResult(tx -> orders.lockByPaymentIntentId(paymentIntentId)
                    .filter(o -> o.getStatus() == Status.WAITING)
                    .ifPresent(order -> order.credited(e.code(), e.getMessage(), clock.instant())));
        }
    }

    /** Spends credit on what was ordered. The order's id is the idempotency key, so it can only ever happen once. */
    private UUID fulfil(CheckoutOrder order) {
        String key = "checkout-" + order.getId();
        return switch (order.getKind()) {
            case TRACK -> purchases.buy(order.getUserId(), ItemKind.TRACK, order.getItemId(), key).transactionId();
            case RELEASE -> purchases.buy(order.getUserId(), ItemKind.RELEASE, order.getItemId(), key).transactionId();
            case GIFT -> gifts.send(order.getUserId(), order.getItemId(), order.getAmountUgx(), order.getNote(), key).transactionId();
        };
    }
}
