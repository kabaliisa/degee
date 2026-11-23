package app.deegee.api.wallet;

import app.deegee.api.auth.PhoneNumbers;
import app.deegee.api.common.ApiException;
import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.w3c.dom.Document;

/**
 * Mobile money through DPO Pay, part of Network International.
 *
 * <p>A payment takes two calls rather than one. {@code createToken} registers the order and returns
 * a transaction token; {@code ChargeTokenMobile} then asks the customer's network to prompt them.
 * The token is what ties everything together afterwards, so it is stored on the payment intent.
 *
 * <p><strong>Collections only.</strong> DPO publishes no payout API, so artist withdrawals have to
 * go somewhere else — see {@link MobileMoneyRouter}, which lets collections and payouts use
 * different providers precisely because of this.
 */
@Component("dpo")
class DpoGateway implements MobileMoneyGateway {

    private static final Logger log = LoggerFactory.getLogger(DpoGateway.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    /** DPO wants "2026/11/23 10:30" in the service date, and Kampala is where the sale happens. */
    private static final DateTimeFormatter SERVICE_DATE = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");
    private static final ZoneId KAMPALA = ZoneId.of("Africa/Kampala");

    private final DpoProperties props;
    private final PaymentIntentRepository intents;
    private final RestClient http;

    DpoGateway(DpoProperties props, PaymentIntentRepository intents) {
        this.props = props;
        this.intents = intents;
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) TIMEOUT.toMillis());
        factory.setReadTimeout((int) TIMEOUT.toMillis());
        this.http = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(props.baseUrl())
                .defaultHeader("Content-Type", "application/xml; charset=utf-8")
                .defaultHeader("Accept", "application/xml")
                .build();
    }

    @Override
    public void requestCollection(PaymentIntent intent) {
        String token = createToken(intent);
        // Kept because the callback DPO sends later is not signed: the only way to find out what
        // really happened is to ask DPO about this token, and without it stored there is nothing
        // to ask about. See DpoCallbackController.
        intent.rememberProviderToken(token);
        intents.save(intent);
        chargeMobile(intent, token);
    }

    /** Registers the order with DPO and gets back the token everything else hangs off. */
    private String createToken(PaymentIntent intent) {
        String body = """
                <?xml version="1.0" encoding="utf-8"?>
                <API3G>
                  <CompanyToken>%s</CompanyToken>
                  <Request>createToken</Request>
                  <Transaction>
                    <PaymentAmount>%d</PaymentAmount>
                    <PaymentCurrency>UGX</PaymentCurrency>
                    <CompanyRef>%s</CompanyRef>
                    <BackURL>%s</BackURL>
                    <RedirectURL>%s</RedirectURL>
                    <CompanyRefUnique>1</CompanyRefUnique>
                    <PTL>%d</PTL>
                    <customerPhone>%s</customerPhone>
                    <DefaultPaymentCountry>%s</DefaultPaymentCountry>
                    <DefaultPaymentMNO>%s</DefaultPaymentMNO>
                  </Transaction>
                  <Services>
                    <Service>
                      <ServiceType>%s</ServiceType>
                      <ServiceDescription>Deegee music purchase</ServiceDescription>
                      <ServiceDate>%s</ServiceDate>
                    </Service>
                  </Services>
                </API3G>"""
                .formatted(Dpo.xml(props.companyToken()), intent.getAmountUgx(),
                        // CompanyRefUnique is 1 so DPO refuses a reference it has seen before. A
                        // retry that reaches DPO twice is then its problem, not a double charge.
                        Dpo.xml(intent.getProviderRef()),
                        Dpo.xml(props.backUrl()), Dpo.xml(props.redirectUrl()),
                        props.paymentTimeLimitMinutes(),
                        Dpo.xml(msisdn(intent.getMsisdn())),
                        Dpo.xml(props.mnoCountry()), Dpo.xml(mnoFor(intent.getMsisdn())),
                        Dpo.xml(props.serviceType()),
                        ZonedDateTime.now(KAMPALA).format(SERVICE_DATE));

        Document response = post(body, "createToken");
        String result = Dpo.field(response, "Result").orElse("");
        if (!Dpo.OK.equals(result)) {
            String why = Dpo.field(response, "ResultExplanation").orElse("no explanation given");
            log.error("DPO createToken refused ref {}: {} {}", intent.getProviderRef(), result, why);
            throw unavailable();
        }
        return Dpo.field(response, "TransToken").orElseThrow(this::unavailable);
    }

    /** Asks the customer's network to put a PIN prompt on their phone. */
    private void chargeMobile(PaymentIntent intent, String token) {
        String body = """
                <?xml version="1.0" encoding="UTF-8"?>
                <API3G>
                  <CompanyToken>%s</CompanyToken>
                  <Request>ChargeTokenMobile</Request>
                  <TransactionToken>%s</TransactionToken>
                  <PhoneNumber>%s</PhoneNumber>
                  <MNO>%s</MNO>
                  <MNOcountry>%s</MNOcountry>
                </API3G>"""
                .formatted(Dpo.xml(props.companyToken()), Dpo.xml(token),
                        Dpo.xml(msisdn(intent.getMsisdn())),
                        Dpo.xml(mnoFor(intent.getMsisdn())), Dpo.xml(props.mnoCountry()));

        Document response = post(body, "ChargeTokenMobile");
        String result = Dpo.field(response, "Result").orElse("");
        if (!Dpo.OK.equals(result)) {
            String why = Dpo.field(response, "ResultExplanation").orElse("no explanation given");
            log.error("DPO ChargeTokenMobile refused ref {}: {} {}", intent.getProviderRef(), result, why);
            throw unavailable();
        }
        // Code=1 means the customer has to be sent to the network's own page instead of getting a
        // PIN prompt. Deegee's checkout has nowhere to send them, so this is logged loudly rather
        // than failing silently into a payment that never completes.
        Dpo.field(response, "redirectOption").filter("1"::equals).ifPresent(x ->
                log.warn("DPO wants a redirect for ref {}, which this checkout cannot do: {}",
                        intent.getProviderRef(), Dpo.field(response, "redirectUrl").orElse("no url")));
        log.info("DPO prompt requested: ref {}, UGX {}, instructions: {}", intent.getProviderRef(),
                intent.getAmountUgx(), Dpo.field(response, "instructions").orElse("none"));
    }

    /**
     * Asks DPO what actually happened to a transaction. This, not the callback, is what decides
     * whether a fan gets their song: DPO's callback carries no signature, so anyone could send one.
     */
    Optional<String> verify(String token) {
        String body = """
                <?xml version="1.0" encoding="utf-8"?>
                <API3G>
                  <CompanyToken>%s</CompanyToken>
                  <Request>verifyToken</Request>
                  <TransactionToken>%s</TransactionToken>
                </API3G>""".formatted(Dpo.xml(props.companyToken()), Dpo.xml(token));
        try {
            Document response = post(body, "verifyToken");
            return Dpo.field(response, "Result");
        } catch (Exception e) {
            log.error("DPO verifyToken failed for token {}: {}", token, e.toString());
            return Optional.empty();
        }
    }

    @Override
    public void requestDisbursement(String providerRef, String msisdn, long amountUgx) {
        // Deliberately loud rather than a quiet no-op. DPO publishes no payout API, so if Deegee
        // is configured to pay artists through it, every withdrawal would otherwise sit in flight
        // forever with the money neither sent nor returned.
        throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "PAYOUTS_NOT_CONFIGURED",
                "DPO does not do payouts. Set deegee.payments.payout-provider to a provider that does.");
    }

    private Document post(String body, String what) {
        try {
            String response = http.post().contentType(MediaType.APPLICATION_XML).body(body)
                    .retrieve().body(String.class);
            if (response == null) throw new IllegalStateException("empty response");
            return Dpo.parse(response);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("DPO {} failed: {}", what, e.toString());
            throw unavailable();
        }
    }

    private ApiException unavailable() {
        return new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_UNAVAILABLE",
                "Mobile money isn’t responding right now. Your money has not moved — try again in a minute.");
    }

    /** DPO wants no plus sign: 256772123456, where Deegee stores +256772123456. */
    private String msisdn(String stored) {
        return stored.replace("+", "");
    }

    /**
     * The MNO name DPO expects. Their documentation says these depend on the merchant's own
     * terminal settings and to ask their team, so they are configuration rather than constants:
     * guessing here means every payment is refused with an unhelpful message.
     */
    private String mnoFor(String stored) {
        return PhoneNumbers.provider(stored)
                .map(p -> p == PhoneNumbers.Provider.MTN_MOMO ? props.mtnMno() : props.airtelMno())
                .filter(name -> name != null && !name.isBlank())
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "UNSUPPORTED_NETWORK",
                        "That number isn’t MTN or Airtel. Those are the two networks Deegee can reach."));
    }
}
