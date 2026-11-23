package app.deegee.api.wallet;

import app.deegee.api.auth.PhoneNumbers;
import app.deegee.api.common.ApiException;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Mobile money through DusuPay, who reach both MTN and Airtel in Uganda through one integration.
 *
 * <p>Nothing here decides whether a payment succeeded. This asks DusuPay to prompt the customer's
 * phone and then stops; the answer arrives later at {@link DusuPayWebhookController}, signed. That
 * split is the whole design: the app the customer is holding never tells the server it paid, so a
 * modified app cannot award itself a song.
 */
@Component("dusupay")
class DusuPayGateway implements MobileMoneyGateway {

    private static final Logger log = LoggerFactory.getLogger(DusuPayGateway.class);

    /** DusuPay's name for each network. Uganda is the only market Deegee sells in. */
    private static final Map<PhoneNumbers.Provider, String> PROVIDER_CODE = Map.of(
            PhoneNumbers.Provider.MTN_MOMO, "mtn_ug",
            PhoneNumbers.Provider.AIRTEL_MONEY, "airtel_ug");

    /** How long to wait on DusuPay before giving up; a customer is watching a spinner. */
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    private final RestClient http;
    private final boolean chargeCustomer;

    DusuPayGateway(DusuPayProperties props) {
        this.chargeCustomer = props.chargeCustomer();
        // Timeouts rather than the JDK defaults, which are "wait forever": a customer is watching a
        // spinner, and a request thread held open by an unresponsive provider is how one outage
        // becomes an outage of everything.
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) TIMEOUT.toMillis());
        factory.setReadTimeout((int) TIMEOUT.toMillis());
        this.http = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(props.baseUrl())
                .defaultHeader("x-api-version", "1")
                .defaultHeader("public-key", props.publicKey())
                .defaultHeader("secret-key", props.secretKey())
                .build();
    }

    @Override
    public void requestCollection(PaymentIntent intent) {
        // Deegee's own reference, not DusuPay's: it travels out in the request, comes back in the
        // webhook, and is inside the signed string, so the webhook can be tied to exactly one order.
        String reference = intent.getProviderRef();

        Map<String, Object> body = Map.of(
                "merchant_reference", reference,
                "transaction_method", "MOBILE_MONEY",
                "currency", "UGX",
                "amount", intent.getAmountUgx(),
                "provider_code", providerCodeFor(intent.getMsisdn()),
                // DusuPay wants no plus sign: 256772123456, where Deegee stores +256772123456.
                "msisdn", intent.getMsisdn().replace("+", ""),
                // 10 to 30 characters, and it is what the customer sees on their phone next to the
                // PIN prompt. "Deegee" alone would tell them nothing a month later on a statement.
                "description", "Deegee music purchase",
                // Who carries DusuPay's cut. Deegee's prices assume the buyer does, and DusuPay's
                // own default is the opposite, so leaving this out would silently move the fee
                // onto the artist's and Deegee's share of every sale.
                "charge_customer", chargeCustomer);

        try {
            Map<?, ?> response = http.post().uri("/collections/initialize").body(body)
                    .retrieve().body(Map.class);
            log.info("DusuPay collection requested: ref {}, UGX {}, response {}",
                    reference, intent.getAmountUgx(), response == null ? "none" : response.get("message"));
        } catch (Exception e) {
            // The customer is waiting on a screen, so this has to surface now rather than leaving
            // them watching a spinner for a PIN prompt that was never sent.
            log.error("DusuPay collection failed for ref {}: {}", reference, e.toString());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_UNAVAILABLE",
                    "Mobile money isn’t responding right now. Your money has not moved — try again in a minute.");
        }
    }

    @Override
    public void requestDisbursement(String providerRef, String msisdn, long amountUgx) {
        Map<String, Object> body = Map.of(
                "merchant_reference", providerRef,
                "transaction_method", "MOBILE_MONEY",
                "currency", "UGX",
                "amount", amountUgx,
                "provider_code", providerCodeFor(msisdn),
                "msisdn", msisdn.replace("+", ""),
                "description", "Deegee artist payout",
                "narration", "Deegee earnings");

        try {
            Map<?, ?> response = http.post().uri("/payouts/initialize").body(body)
                    .retrieve().body(Map.class);
            log.info("DusuPay payout requested: ref {}, UGX {}, response {}",
                    providerRef, amountUgx, response == null ? "none" : response.get("message"));
        } catch (Exception e) {
            // Unlike a collection, nobody is watching. The withdrawal stays in flight and the
            // ledger still says the money is owed, which is the correct state to be stuck in.
            log.error("DusuPay payout failed for ref {}: {}", providerRef, e.toString());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYOUT_UNAVAILABLE",
                    "Couldn’t reach mobile money to send this payout. It has not been sent.");
        }
    }

    /** Which network a number belongs to. Uganda's prefixes decide it, so nobody has to choose. */
    private String providerCodeFor(String msisdn) {
        return PhoneNumbers.provider(msisdn)
                .map(PROVIDER_CODE::get)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "UNSUPPORTED_NETWORK",
                        "That number isn’t MTN or Airtel. Those are the two networks Deegee can reach."));
    }

}
