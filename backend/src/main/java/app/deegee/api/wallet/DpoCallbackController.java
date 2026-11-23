package app.deegee.api.wallet;

import app.deegee.api.wallet.MobileMoneyGateway.CollectionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Where DPO says a payment finished.
 *
 * <p><strong>Nothing this endpoint is told is believed.</strong> DPO's BackURL callback carries no
 * signature, so anyone on the internet can send one claiming any transaction succeeded. The
 * callback is therefore treated as a nudge and nothing more: it names a token, and Deegee then
 * asks DPO directly, over a connection authenticated with the company token, what happened to it.
 * The answer to that question is what moves money.
 *
 * <p>That makes a forged callback worthless. The worst it can do is make Deegee ask DPO about a
 * transaction, and DPO's answer will be the truth.
 *
 * <p>DusuPay's webhook is signed and handled the other way round, in
 * {@link DusuPayWebhookController} — the difference is in the providers, not in the care taken.
 */
@RestController
@RequestMapping("/v1/webhooks")
class DpoCallbackController {

    private static final Logger log = LoggerFactory.getLogger(DpoCallbackController.class);

    private final TopUpService topUps;
    private final PaymentIntentRepository intents;
    private final DpoGateway dpo;

    DpoCallbackController(TopUpService topUps, PaymentIntentRepository intents, DpoGateway dpo) {
        this.topUps = topUps;
        this.intents = intents;
        this.dpo = dpo;
    }

    /** DPO has been seen to call back by either method, so both are accepted. */
    @PostMapping("/dpo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void posted(@RequestParam(name = "TransactionToken", required = false) String token,
                @RequestParam(name = "CompanyRef", required = false) String companyRef) {
        settle(token, companyRef);
    }

    @GetMapping("/dpo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void redirected(@RequestParam(name = "TransactionToken", required = false) String token,
                    @RequestParam(name = "CompanyRef", required = false) String companyRef) {
        settle(token, companyRef);
    }

    private void settle(String token, String companyRef) {
        PaymentIntent intent = find(token, companyRef);
        if (intent == null) {
            // Not an error worth returning: a stranger poking the endpoint gets the same silence
            // as DPO calling about something already settled.
            log.warn("DPO callback for an unknown transaction: token {}, ref {}", token, companyRef);
            return;
        }
        String providerToken = intent.getProviderToken();
        if (providerToken == null) {
            log.warn("DPO callback for ref {} with no stored token; nothing to verify", intent.getProviderRef());
            return;
        }

        // The actual decision. Not what the caller said -- what DPO says when asked.
        String result = dpo.verify(providerToken).orElse(null);
        if (result == null) {
            // Leaving the intent pending is the safe failure: the money is either with DPO or
            // still with the fan, and a later callback or a manual check can settle it. Awarding
            // the song now would be guessing with somebody else's catalogue.
            log.error("DPO verifyToken gave no answer for ref {}; leaving it pending", intent.getProviderRef());
            return;
        }
        boolean paid = Dpo.OK.equals(result);
        log.info("DPO verified ref {}: result {} ({})", intent.getProviderRef(), result, paid ? "paid" : "not paid");
        topUps.onCollectionResult(new CollectionResult(intent.getProviderRef(), paid));
    }

    private PaymentIntent find(String token, String companyRef) {
        if (token != null && !token.isBlank()) {
            PaymentIntent byToken = intents.findByProviderToken(token).orElse(null);
            if (byToken != null) return byToken;
        }
        if (companyRef != null && !companyRef.isBlank()) {
            return intents.findByProviderRef(companyRef).orElse(null);
        }
        return null;
    }
}
