package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.deegee.api.wallet.LedgerAccount.Kind;
import com.jayway.jsonpath.JsonPath;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

class WalletApiTest extends ApiTestSupport {

    @Autowired
    JdbcTemplate jdbc;

    private long account(java.util.UUID id) {
        return ledger.balance(id);
    }

    @Test
    void topUpThenBuyASongSplitsTheMoneyCorrectly() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 5000);
        assertThat(walletBalance(token)).isEqualTo(5000);

        long artistBefore = account(Ledger.artistEarningsId("a1"));
        long uprsBefore = account(Ledger.systemId(Kind.UPRS_PAYABLE));
        long platformBefore = account(Ledger.systemId(Kind.PLATFORM_REVENUE));

        // t1: UGX 2,000, written by a UPRS member → 200 UPRS, 1,440 artist, 360 Deegee (same as the app).
        buy(token, "TRACK", "t1", newKey())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.chargedUgx").value(2000))
                .andExpect(jsonPath("$.balanceUgx").value(3000))
                .andExpect(jsonPath("$.trackIds[0]").value("t1"));

        assertThat(walletBalance(token)).isEqualTo(3000);
        assertThat(account(Ledger.artistEarningsId("a1")) - artistBefore).isEqualTo(1440);
        assertThat(account(Ledger.systemId(Kind.UPRS_PAYABLE)) - uprsBefore).isEqualTo(200);
        assertThat(account(Ledger.systemId(Kind.PLATFORM_REVENUE)) - platformBefore).isEqualTo(360);

        call(get("/v1/me/library"), token).andExpect(jsonPath("$.trackIds", hasItem("t1")));
        buy(token, "TRACK", "t1", newKey())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_OWNED"));
    }

    @Test
    void notEnoughMoneyIsRefusedAndNothingMoves() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 5000);

        buy(token, "RELEASE", "r3", newKey()) // UGX 15,000 album
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_FUNDS"))
                .andExpect(jsonPath("$.shortBy").value(10000));
        assertThat(walletBalance(token)).isEqualTo(5000);
        call(get("/v1/me/library"), token).andExpect(jsonPath("$.trackIds").isEmpty());
    }

    @Test
    void buyingAReleaseGrantsOnlyTheSongsYouDontOwn() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 20000);
        buy(token, "TRACK", "t2", newKey()).andExpect(status().isCreated());

        buy(token, "RELEASE", "r1", newKey())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.chargedUgx").value(8000))
                .andExpect(jsonPath("$.trackIds.length()").value(3));
        buy(token, "RELEASE", "r1", newKey()).andExpect(jsonPath("$.code").value("ALREADY_OWNED"));
    }

    @Test
    void retryingWithTheSameKeyChargesOnce() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 5000);
        String key = newKey();

        String first = buy(token, "TRACK", "t10", key).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String again = buy(token, "TRACK", "t10", key).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

        assertThat((String) JsonPath.read(again, "$.transactionId")).isEqualTo(JsonPath.read(first, "$.transactionId"));
        assertThat(walletBalance(token)).isEqualTo(4000);
    }

    @Test
    void giftGoes95PercentToTheArtistAndShowsInActivity() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 5000);
        long artistBefore = account(Ledger.artistEarningsId("a4"));

        call(post("/v1/gifts").header("Idempotency-Key", newKey())
                .content(json("{'artistId':'a4','amountUgx':2000,'note':'Webale nnyo!'}")), token)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.artistReceivesUgx").value(1900))
                .andExpect(jsonPath("$.balanceUgx").value(3000));
        assertThat(account(Ledger.artistEarningsId("a4")) - artistBefore).isEqualTo(1900);

        call(get("/v1/wallet"), token)
                .andExpect(jsonPath("$.activity[0].type").value("GIFT"))
                .andExpect(jsonPath("$.activity[0].amountUgx").value(-2000))
                .andExpect(jsonPath("$.activity[0].note").value("Webale nnyo!"))
                .andExpect(jsonPath("$.activity[1].type").value("TOPUP"))
                .andExpect(jsonPath("$.activity[1].provider").value("MTN_MOMO"));

        call(post("/v1/gifts").header("Idempotency-Key", newKey()).content(json("{'artistId':'a4','amountUgx':100}")), token)
                .andExpect(jsonPath("$.code").value("GIFT_TOO_SMALL"));
    }

    @Test
    void topUpsAreOnlyCreditedOnceByASignedWebhook() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        String body = call(post("/v1/wallet/topups").header("Idempotency-Key", newKey())
                .content(json("{'amountUgx':3000,'provider':'MTN_MOMO','phone':'%s'}", phone)), token)
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");
        String ref = intents.findById(java.util.UUID.fromString(id)).orElseThrow().getProviderRef();

        mvc.perform(post("/v1/webhooks/mock-mobile-money").contentType("application/json")
                        .header(WebhookController.SIGNATURE_HEADER, "forged")
                        .content(json("{'providerRef':'%s','status':'SUCCESSFUL'}", ref)))
                .andExpect(status().isUnauthorized());
        assertThat(walletBalance(token)).isZero();

        webhook(ref, "SUCCESSFUL").andExpect(status().isNoContent());
        webhook(ref, "SUCCESSFUL").andExpect(status().isNoContent()); // delivered twice
        assertThat(walletBalance(token)).isEqualTo(3000);
        call(get("/v1/wallet/topups/" + id), token).andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void declinedTopUpAddsNothing() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        String body = call(post("/v1/wallet/topups").header("Idempotency-Key", newKey())
                .content(json("{'amountUgx':3000,'provider':'MTN_MOMO','phone':'%s'}", phone)), token)
                .andReturn().getResponse().getContentAsString();
        String ref = intents.findById(java.util.UUID.fromString(JsonPath.read(body, "$.id"))).orElseThrow().getProviderRef();

        webhook(ref, "FAILED").andExpect(status().isNoContent());
        assertThat(walletBalance(token)).isZero();
        call(get("/v1/wallet"), token).andExpect(jsonPath("$.activity[0].status").value("FAILED"));
    }

    @Test
    void topUpRulesAreChecked() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        call(post("/v1/wallet/topups").header("Idempotency-Key", newKey())
                .content(json("{'amountUgx':500,'provider':'MTN_MOMO','phone':'%s'}", phone)), token)
                .andExpect(jsonPath("$.code").value("AMOUNT_OUT_OF_RANGE"));
        call(post("/v1/wallet/topups").header("Idempotency-Key", newKey())
                .content(json("{'amountUgx':5000,'provider':'AIRTEL_MONEY','phone':'%s'}", phone)), token)
                .andExpect(jsonPath("$.code").value("WRONG_NETWORK"));
        call(post("/v1/wallet/topups").content(json("{'amountUgx':5000,'provider':'MTN_MOMO','phone':'%s'}", phone)), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MISSING_HEADER"));
    }

    @Test
    void simultaneousPurchasesCannotOverspendTheWallet() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 2000); // enough for exactly one UGX 2,000 song

        List<String> songs = List.of("t3", "t4", "t6", "t7", "t8");
        ExecutorService pool = Executors.newFixedThreadPool(songs.size());
        List<Future<Integer>> results = new ArrayList<>();
        for (String song : songs) {
            Callable<Integer> task = () -> buy(token, "TRACK", song, newKey()).andReturn().getResponse().getStatus();
            results.add(pool.submit(task));
        }
        int created = 0;
        for (Future<Integer> f : results) if (f.get() == 201) created++;
        pool.shutdown();

        assertThat(created).isEqualTo(1);
        assertThat(walletBalance(token)).isZero();
    }

    @Test
    void theWholeLedgerAlwaysBalancesToZero() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        topUp(token, phone, 15000);
        buy(token, "RELEASE", "r6", newKey()).andExpect(status().isCreated()); // co-written + foreign-society songs
        call(post("/v1/gifts").header("Idempotency-Key", newKey()).content(json("{'artistId':'a5','amountUgx':1999}")), token)
                .andExpect(status().isCreated());

        Long accounts = jdbc.queryForObject("select coalesce(sum(balance_ugx), 0) from ledger_accounts", Long.class);
        Long entries = jdbc.queryForObject("select coalesce(sum(amount_ugx), 0) from ledger_entries", Long.class);
        Long unbalanced = jdbc.queryForObject(
                "select count(*) from (select transaction_id from ledger_entries group by transaction_id having sum(amount_ugx) <> 0) x", Long.class);
        assertThat(accounts).isZero();
        assertThat(entries).isZero();
        assertThat(unbalanced).isZero();
    }
}
