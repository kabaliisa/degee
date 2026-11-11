package app.deegee.api.wallet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.deegee.api.auth.OtpSender;
import com.jayway.jsonpath.JsonPath;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Boots the whole API on an in-memory database and gives tests a signed-in user in one call. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(ApiTestSupport.CapturedCodes.class)
abstract class ApiTestSupport {

    /** Keeps the last sign-in code per phone instead of sending an SMS. */
    @TestConfiguration
    static class CapturedCodes {
        static final Map<String, String> LAST_CODE = new ConcurrentHashMap<>();

        @Bean
        @Primary
        OtpSender capturingOtpSender() {
            return LAST_CODE::put;
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    PaymentIntentRepository intents;

    @Autowired
    PaymentsProperties payments;

    @Autowired
    Ledger ledger;

    /** A fresh MTN number, so tests never share a user. */
    static String newPhone() {
        return "+25677" + String.format("%07d", ThreadLocalRandom.current().nextInt(10_000_000));
    }

    static String newKey() {
        return UUID.randomUUID().toString();
    }

    static String json(String template, Object... args) {
        return template.formatted(args).replace('\'', '"');
    }

    ResultActions call(MockHttpServletRequestBuilder req, String token) throws Exception {
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON));
    }

    String requestCode(String phone) throws Exception {
        mvc.perform(post("/v1/auth/otp").contentType(MediaType.APPLICATION_JSON).content(json("{'phone':'%s'}", phone)))
                .andExpect(status().isAccepted());
        return CapturedCodes.LAST_CODE.get(phone);
    }

    /** Signs in and returns the full session JSON. */
    String signInJson(String phone) throws Exception {
        String code = requestCode(phone);
        return mvc.perform(post("/v1/auth/verify").contentType(MediaType.APPLICATION_JSON).content(json("{'phone':'%s','code':'%s'}", phone, code)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    String signIn(String phone) throws Exception {
        return JsonPath.read(signInJson(phone), "$.accessToken");
    }

    UUID userId(String token) throws Exception {
        String me = call(get("/v1/me"), token).andReturn().getResponse().getContentAsString();
        return UUID.fromString(JsonPath.read(me, "$.id"));
    }

    /** Starts a top-up and has the (mock) provider approve it through the signed webhook. */
    void topUp(String token, String phone, long amount) throws Exception {
        String body = call(post("/v1/wallet/topups").header("Idempotency-Key", newKey())
                .content(json("{'amountUgx':%d,'provider':'MTN_MOMO','phone':'%s'}", amount, phone)), token)
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        UUID intentId = UUID.fromString(JsonPath.read(body, "$.id"));
        String ref = intents.findById(intentId).orElseThrow().getProviderRef();
        webhook(ref, "SUCCESSFUL").andExpect(status().isNoContent());
    }

    ResultActions webhook(String providerRef, String status) throws Exception {
        return mvc.perform(post("/v1/webhooks/mock-mobile-money").contentType(MediaType.APPLICATION_JSON)
                .header(WebhookController.SIGNATURE_HEADER, WebhookController.sign(payments.webhookSecret(), providerRef, status))
                .content(json("{'providerRef':'%s','status':'%s'}", providerRef, status)));
    }

    long walletBalance(String token) throws Exception {
        String body = call(get("/v1/wallet"), token).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.balanceUgx")).longValue();
    }

    ResultActions buy(String token, String kind, String id, String key) throws Exception {
        return call(post("/v1/purchases").header("Idempotency-Key", key).content(json("{'kind':'%s','id':'%s'}", kind, id)), token);
    }
}
