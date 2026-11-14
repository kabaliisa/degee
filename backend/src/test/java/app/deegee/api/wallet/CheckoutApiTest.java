package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.deegee.api.wallet.LedgerAccount.Kind;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.ResultActions;

/** Paying for music and gifts directly with mobile money: one prompt, no wallet to top up. */
class CheckoutApiTest extends ApiTestSupport {

    @Autowired
    CheckoutOrderRepository orders;

    private ResultActions checkout(String token, String phone, String body, String key) throws Exception {
        String full = body.replace("}", ",'provider':'MTN_MOMO','phone':'%s'}".formatted(phone));
        return call(post("/v1/checkout").header("Idempotency-Key", key).content(json(full)), token);
    }

    private String orderId(ResultActions started) throws Exception {
        return JsonPath.read(started.andReturn().getResponse().getContentAsString(), "$.id");
    }

    /** The reference the (mock) provider knows this order's payment by. */
    private String paymentRef(String orderId) {
        UUID intentId = orders.findById(UUID.fromString(orderId)).orElseThrow().getPaymentIntentId();
        return intents.findById(intentId).orElseThrow().getProviderRef();
    }

    private ResultActions order(String token, String orderId) throws Exception {
        return call(get("/v1/checkout/" + orderId), token);
    }

    @Test
    void oneApprovedPromptBuysTheSongAndPaysTheArtist() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        long artistBefore = ledger.balance(Ledger.artistEarningsId("a1"));

        // t1 costs UGX 2,000. Nothing in credit, so the phone is asked for all of it.
        ResultActions started = checkout(token, phone, "{'kind':'TRACK','id':'t1'}", newKey())
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.amountUgx").value(2000))
                .andExpect(jsonPath("$.collectUgx").value(2000));
        String id = orderId(started);
        call(get("/v1/me/library"), token).andExpect(jsonPath("$.trackIds").isEmpty()); // not theirs until they pay

        webhook(paymentRef(id), "SUCCESSFUL").andExpect(status().isNoContent());

        order(token, id)
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.trackIds[0]").value("t1"))
                .andExpect(jsonPath("$.creditUgx").value(0));
        call(get("/v1/me/library"), token).andExpect(jsonPath("$.trackIds", hasItem("t1")));
        assertThat(ledger.balance(Ledger.artistEarningsId("a1")) - artistBefore).isEqualTo(1440); // same split as a wallet purchase
    }

    @Test
    void aDeclinedPromptBuysNothingAndChargesNothing() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        String id = orderId(checkout(token, phone, "{'kind':'TRACK','id':'t1'}", newKey()));

        webhook(paymentRef(id), "FAILED").andExpect(status().isNoContent());

        order(token, id).andExpect(jsonPath("$.status").value("DECLINED")).andExpect(jsonPath("$.creditUgx").value(0));
        call(get("/v1/me/library"), token).andExpect(jsonPath("$.trackIds").isEmpty());
    }

    @Test
    void creditIsUsedFirstAndOnlyTheRestIsAskedFor() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 5000); // credit left over from before

        // Credit covers t1 (2,000): done at once, no prompt.
        checkout(token, phone, "{'kind':'TRACK','id':'t1'}", newKey())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.collectUgx").value(0))
                .andExpect(jsonPath("$.creditUgx").value(3000));

        // The album r3 is 15,000: 3,000 from credit, 12,000 from the phone.
        ResultActions album = checkout(token, phone, "{'kind':'RELEASE','id':'r3'}", newKey())
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.collectUgx").value(12000));
        String id = orderId(album);
        webhook(paymentRef(id), "SUCCESSFUL");
        order(token, id).andExpect(jsonPath("$.status").value("COMPLETED")).andExpect(jsonPath("$.creditUgx").value(0));
    }

    @Test
    void aTinyRemainderCollectsTheSmallestPaymentAndKeepsTheChange() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 1600);

        // 2,000 − 1,600 = 400, below mobile money's smallest payment, so 500 is collected and 100 stays as credit.
        String id = orderId(checkout(token, phone, "{'kind':'TRACK','id':'t1'}", newKey())
                .andExpect(jsonPath("$.collectUgx").value(500)));
        webhook(paymentRef(id), "SUCCESSFUL");
        order(token, id).andExpect(jsonPath("$.status").value("COMPLETED")).andExpect(jsonPath("$.creditUgx").value(100));
    }

    @Test
    void whatCantBeBoughtIsRefusedBeforeAnyPrompt() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 2000);
        buy(token, "TRACK", "t1", newKey()).andExpect(status().isCreated());
        long intentsBefore = intents.count();

        checkout(token, phone, "{'kind':'TRACK','id':'t1'}", newKey())
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_OWNED"));
        checkout(token, phone, "{'kind':'TRACK','id':'no-such-song'}", newKey()).andExpect(status().isNotFound());
        checkout(token, phone, "{'kind':'GIFT','id':'a1','amountUgx':100}", newKey())
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("GIFT_TOO_SMALL"));
        call(post("/v1/checkout").header("Idempotency-Key", newKey()).content(json("{'kind':'TRACK','id':'t2'}")), token)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PAYMENT_METHOD_REQUIRED"));

        assertThat(intents.count()).isEqualTo(intentsBefore); // nobody's phone was asked for money
    }

    @Test
    void payingForSomethingBoughtMeanwhileKeepsTheMoneyAsCredit() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        String id = orderId(checkout(token, phone, "{'kind':'TRACK','id':'t1'}", newKey()));

        // While the prompt is open, they buy the same song another way (say, on another phone).
        topUp(token, phone, 2000);
        buy(token, "TRACK", "t1", newKey()).andExpect(status().isCreated());

        webhook(paymentRef(id), "SUCCESSFUL");

        order(token, id)
                .andExpect(jsonPath("$.status").value("CREDITED"))
                .andExpect(jsonPath("$.failureCode").value("ALREADY_OWNED"))
                .andExpect(jsonPath("$.creditUgx").value(2000)); // paid once for the song; the second payment is theirs to spend
        // …and it comes off the next thing they buy, with no prompt.
        checkout(token, phone, "{'kind':'TRACK','id':'t2'}", newKey()).andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void aGiftIsOnePromptToo() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        long artistBefore = ledger.balance(Ledger.artistEarningsId("a1"));
        long platformBefore = ledger.balance(Ledger.systemId(Kind.PLATFORM_REVENUE));

        String id = orderId(checkout(token, phone, "{'kind':'GIFT','id':'a1','amountUgx':2000,'note':'Webale nnyo!'}", newKey())
                .andExpect(jsonPath("$.status").value("WAITING")).andExpect(jsonPath("$.collectUgx").value(2000)));
        webhook(paymentRef(id), "SUCCESSFUL");

        order(token, id).andExpect(jsonPath("$.status").value("COMPLETED")).andExpect(jsonPath("$.creditUgx").value(0));
        assertThat(ledger.balance(Ledger.artistEarningsId("a1")) - artistBefore).isEqualTo(1900); // 5% to Deegee
        assertThat(ledger.balance(Ledger.systemId(Kind.PLATFORM_REVENUE)) - platformBefore).isEqualTo(100);
    }

    @Test
    void retriesAndRepeatedWebhooksNeverChargeOrDeliverTwice() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        String key = newKey();
        long artistBefore = ledger.balance(Ledger.artistEarningsId("a1"));

        String first = orderId(checkout(token, phone, "{'kind':'TRACK','id':'t1'}", key));
        String again = orderId(checkout(token, phone, "{'kind':'TRACK','id':'t1'}", key)); // the app retried
        assertThat(again).isEqualTo(first);

        String ref = paymentRef(first);
        webhook(ref, "SUCCESSFUL");
        webhook(ref, "SUCCESSFUL"); // the provider told us twice

        order(token, first).andExpect(jsonPath("$.status").value("COMPLETED")).andExpect(jsonPath("$.creditUgx").value(0));
        assertThat(ledger.balance(Ledger.artistEarningsId("a1")) - artistBefore).isEqualTo(1440);
    }

    @Test
    void someoneElsesOrderCantBeSeen() throws Exception {
        String phone = newPhone();
        String id = orderId(checkout(signIn(phone), phone, "{'kind':'TRACK','id':'t1'}", newKey()));
        order(signIn(newPhone()), id).andExpect(status().isNotFound());
    }
}
