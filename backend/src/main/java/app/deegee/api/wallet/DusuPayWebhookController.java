package app.deegee.api.wallet;

import app.deegee.api.common.ApiException;
import app.deegee.api.wallet.MobileMoneyGateway.CollectionResult;
import app.deegee.api.wallet.MobileMoneyGateway.DisbursementResult;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Where DusuPay says whether a payment actually happened.
 *
 * <p>This endpoint is the boundary between "a customer says they paid" and "Deegee believes money
 * moved". It is public, it is the only thing that can hand out a song for free if it is wrong, and
 * it is the first place anyone will attack. So it believes nothing it is told until the signature
 * checks out, and it treats everything that is not an explicit COMPLETED as a failure.
 */
@RestController
@RequestMapping("/v1/webhooks")
@ConditionalOnProperty(name = "deegee.payments.provider", havingValue = "dusupay")
class DusuPayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(DusuPayWebhookController.class);

    /** How far out of step a webhook's own timestamp may be. Their samples suggest 30 seconds; a
     *  retried webhook after an outage is a normal event, so this is deliberately generous. */
    private static final long MAX_SKEW_MS = 10 * 60 * 1000L;

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Payload(String id, String merchant_reference, String internal_reference, String transaction_type,
                   String transaction_status, String status_message, Long total_credit) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Notification(String event, Payload payload) {}

    private final TopUpService topUps;
    private final DusuPayProperties props;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    DusuPayWebhookController(TopUpService topUps, DusuPayProperties props, ApplicationEventPublisher events, Clock clock) {
        this.topUps = topUps;
        this.props = props;
        this.events = events;
        this.clock = clock;
    }

    @PostMapping("/dusupay")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void notification(@RequestHeader(name = "hmac-signature", required = false) String signature,
                      @RequestBody Notification body) {
        if (body == null || body.payload() == null || body.payload().merchant_reference() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_PAYLOAD", "Not a DusuPay notification.");
        }
        Payload p = body.payload();

        DusuPaySignature.Match match = DusuPaySignature.verify(signature, props.signingKey(),
                body.event(), p.merchant_reference(), p.internal_reference(), p.transaction_type(), p.transaction_status());
        if (!match.valid()) {
            // Loud, because in production this is either a misconfiguration that silently loses
            // every payment, or somebody trying to be paid for nothing. Both want investigating.
            log.error("DusuPay webhook REJECTED: signature does not match, ref {}", p.merchant_reference());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "BAD_SIGNATURE", "Webhook signature does not match.");
        }
        // Their documentation does not say which encoding they use and their own samples disagree,
        // so the first real webhook tells us. Once the answer is known this can be narrowed.
        log.info("DusuPay webhook accepted: ref {}, status {}, signature form {}",
                p.merchant_reference(), p.transaction_status(), match.form());

        long sentAt = DusuPaySignature.timestampOf(signature);
        if (sentAt > 0 && Math.abs(clock.millis() - sentAt) > MAX_SKEW_MS) {
            // The signed string has no timestamp in it, so a captured webhook could be replayed
            // forever. It could only ever re-announce the same reference, and the services below
            // already ignore a reference they have settled -- but there is no reason to accept it.
            throw new ApiException(HttpStatus.UNAUTHORIZED, "STALE_WEBHOOK", "Webhook timestamp is too old.");
        }

        // Only COMPLETED is success. FAILED, CANCELLED and anything new they add later all mean the
        // song does not change hands, which is the right way for an unknown value to fail.
        boolean paid = "COMPLETED".equalsIgnoreCase(p.transaction_status());
        if (!paid && !"PROCESSING".equalsIgnoreCase(p.transaction_status())) {
            log.info("DusuPay reports {} for ref {}: {}", p.transaction_status(), p.merchant_reference(), p.status_message());
        }
        // PROCESSING is the "we are prompting the customer" notification, not an outcome. Treating
        // it as a failure would cancel orders that are about to succeed.
        if ("PROCESSING".equalsIgnoreCase(p.transaction_status())) return;

        if ("PAYOUT".equalsIgnoreCase(p.transaction_type())) {
            events.publishEvent(new DisbursementResult(p.merchant_reference(), paid));
        } else {
            topUps.onCollectionResult(new CollectionResult(p.merchant_reference(), paid));
        }
    }
}
