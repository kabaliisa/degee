package app.deegee.api.wallet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

/**
 * The DusuPay webhook, end to end: a fan pays, DusuPay says so, the song changes hands.
 *
 * <p>Runs with the real DusuPay webhook controller wired up instead of the mock provider, so what
 * is exercised is the signature check and the status handling that will face the public internet.
 * The outbound call is not made -- nothing here can reach DusuPay -- so the collection is created
 * through the service directly and only the inbound half is under test. That half is the one that
 * can give away a song.
 */
@TestPropertySource(properties = {
        "deegee.payments.provider=dusupay",
        "deegee.payments.dusupay.base-url=http://localhost:1",
        "deegee.payments.dusupay.public-key=test-public",
        "deegee.payments.dusupay.secret-key=test-secret",
        "deegee.payments.dusupay.signing-key=" + DusuPayWebhookApiTest.SIGNING_KEY,
})
class DusuPayWebhookApiTest extends StudioTestSupport {

    static final String SIGNING_KEY = "TESTSIGNINGKEY12345";

    private static String signed(String event, String merchantRef, String internalRef, String type, String status) throws Exception {
        String payload = String.join(":", event, merchantRef, internalRef, type, status);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SIGNING_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "t=" + System.currentTimeMillis() + ",s="
                + HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    }

    private static String body(String event, String merchantRef, String status) {
        return """
                {"event":"%s","payload":{"id":"1","merchant_reference":"%s","internal_reference":"DUSUPAYREF1",
                 "transaction_type":"COLLECTION","transaction_status":"%s","status_message":"ok"}}"""
                .formatted(event, merchantRef, status);
    }

    @Test
    @DisplayName("an unsigned claim that a payment succeeded is refused")
    void unsignedIsRefused() throws Exception {
        // No signature header at all: unauthorized, not malformed. The body is perfectly good
        // JSON; what is missing is any reason to believe it.
        mvc.perform(post("/v1/webhooks/dusupay").contentType(MediaType.APPLICATION_JSON)
                        .content(body("transaction.completed", "anything", "COMPLETED")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("BAD_SIGNATURE"));

        mvc.perform(post("/v1/webhooks/dusupay").contentType(MediaType.APPLICATION_JSON)
                        .header("hmac-signature", "t=1,s=0000")
                        .content(body("transaction.completed", "anything", "COMPLETED")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("BAD_SIGNATURE"));
    }

    @Test
    @DisplayName("a correctly signed COMPLETED credits the fan's wallet")
    void completedCreditsTheWallet() throws Exception {
        String fan = signIn(newPhone());
        String ref = startTopUp(fan, newPhone(), 20_000);

        mvc.perform(post("/v1/webhooks/dusupay").contentType(MediaType.APPLICATION_JSON)
                        .header("hmac-signature", signed("transaction.completed", ref, "DUSUPAYREF1", "COLLECTION", "COMPLETED"))
                        .content(body("transaction.completed", ref, "COMPLETED")))
                .andExpect(status().isNoContent());

        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/v1/wallet"), fan)
                .andExpect(jsonPath("$.balanceUgx").value(20_000));
    }

    @Test
    @DisplayName("FAILED leaves the money where it was, and PROCESSING is not an answer at all")
    void failedAndProcessing() throws Exception {
        String fan = signIn(newPhone());
        String ref = startTopUp(fan, newPhone(), 15_000);

        // "we are prompting the customer" -- treating this as a failure would cancel orders that
        // are about to succeed.
        mvc.perform(post("/v1/webhooks/dusupay").contentType(MediaType.APPLICATION_JSON)
                        .header("hmac-signature", signed("transaction.processing", ref, "DUSUPAYREF1", "COLLECTION", "PROCESSING"))
                        .content(body("transaction.processing", ref, "PROCESSING")))
                .andExpect(status().isNoContent());
        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/v1/wallet"), fan)
                .andExpect(jsonPath("$.balanceUgx").value(0));

        mvc.perform(post("/v1/webhooks/dusupay").contentType(MediaType.APPLICATION_JSON)
                        .header("hmac-signature", signed("transaction.failed", ref, "DUSUPAYREF1", "COLLECTION", "FAILED"))
                        .content(body("transaction.failed", ref, "FAILED")))
                .andExpect(status().isNoContent());
        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/v1/wallet"), fan)
                .andExpect(jsonPath("$.balanceUgx").value(0));
    }

    @Test
    @DisplayName("a status nobody has seen before is not success")
    void unknownStatusIsNotSuccess() throws Exception {
        String fan = signIn(newPhone());
        String ref = startTopUp(fan, newPhone(), 10_000);

        // CANCELLED today, whatever they add next year. Anything but COMPLETED must leave the
        // money alone, or a new status value becomes a way to get songs for nothing.
        mvc.perform(post("/v1/webhooks/dusupay").contentType(MediaType.APPLICATION_JSON)
                        .header("hmac-signature", signed("transaction.cancelled", ref, "DUSUPAYREF1", "COLLECTION", "CANCELLED"))
                        .content(body("transaction.cancelled", ref, "CANCELLED")))
                .andExpect(status().isNoContent());

        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/v1/wallet"), fan)
                .andExpect(jsonPath("$.balanceUgx").value(0));
    }
}
