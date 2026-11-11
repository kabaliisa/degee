package app.deegee.api.wallet;

import app.deegee.api.auth.PhoneNumbers;
import app.deegee.api.auth.PhoneNumbers.Provider;
import app.deegee.api.common.ApiException;
import app.deegee.api.common.Hashing;
import app.deegee.api.wallet.LedgerAccount.Kind;
import app.deegee.api.wallet.MobileMoneyGateway.CollectionResult;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Adding money to a wallet with mobile money. */
@Service
public class TopUpService {

    private static final Logger log = LoggerFactory.getLogger(TopUpService.class);

    private final PaymentIntentRepository intents;
    private final MobileMoneyGateway gateway;
    private final Ledger ledger;
    private final Clock clock;
    private final MoneySplits.Terms terms = MoneySplits.Terms.DEFAULT;

    TopUpService(PaymentIntentRepository intents, MobileMoneyGateway gateway, Ledger ledger, Clock clock) {
        this.intents = intents;
        this.gateway = gateway;
        this.ledger = ledger;
        this.clock = clock;
    }

    /** Starts a top-up. Repeating a request with the same idempotency key returns the original top-up. */
    @Transactional
    public PaymentIntent start(UUID userId, long amountUgx, Provider provider, String rawPhone, String idempotencyKey) {
        String key = userId + ":" + idempotencyKey;
        var existing = intents.findByIdempotencyKey(key);
        if (existing.isPresent()) return existing.get();

        if (amountUgx < terms.minTopUp() || amountUgx > terms.maxTopUp()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "AMOUNT_OUT_OF_RANGE",
                    "Add between UGX %,d and UGX %,d.".formatted(terms.minTopUp(), terms.maxTopUp()));
        }
        String msisdn = PhoneNumbers.normalize(rawPhone)
                .orElseThrow(() -> ApiException.badRequest("INVALID_PHONE", "Enter a valid Ugandan mobile number, e.g. 0772 123456."));
        PhoneNumbers.provider(msisdn).filter(p -> p == provider).orElseThrow(() -> ApiException.badRequest(
                "WRONG_NETWORK", "That number isn't on " + (provider == Provider.MTN_MOMO ? "MTN" : "Airtel") + "."));

        PaymentIntent intent = intents.save(new PaymentIntent(userId, provider, msisdn, amountUgx,
                "MOCK-" + Hashing.randomToken(12), key, clock.instant()));
        gateway.requestCollection(intent);
        return intent;
    }

    @Transactional(readOnly = true)
    public PaymentIntent get(UUID userId, UUID intentId) {
        return intents.findById(intentId)
                .filter(i -> i.getUserId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Top-up"));
    }

    @Transactional(readOnly = true)
    public List<PaymentIntent> recent(UUID userId) {
        return intents.findTop50ByUserIdOrderByCreatedAtDesc(userId);
    }

    /** Applies the provider's answer. Safe to call more than once for the same top-up: later calls do nothing. */
    @EventListener
    @Transactional
    public void onCollectionResult(CollectionResult result) {
        PaymentIntent intent = intents.lockByProviderRef(result.providerRef()).orElse(null);
        if (intent == null) {
            log.warn("Mobile money result for unknown reference {}", result.providerRef());
            return;
        }
        if (intent.getStatus() != PaymentIntent.Status.PENDING) return; // already applied

        if (!result.approved()) {
            intent.fail(clock.instant());
            return;
        }
        LedgerTransaction tx = ledger.post(LedgerTransaction.Type.TOPUP, intent.getUserId(), intent.getId().toString(),
                "Added money", null, List.of(
                        new Ledger.Posting(Ledger.systemId(Kind.PROVIDER_CLEARING), -intent.getAmountUgx()),
                        new Ledger.Posting(Ledger.walletId(intent.getUserId()), intent.getAmountUgx())));
        intent.complete(tx.getId(), clock.instant());
    }
}
