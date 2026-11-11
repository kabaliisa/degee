package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

class PayoutApiTest extends StudioTestSupport {

    @Autowired
    JdbcTemplate jdbc;

    private ResultActions withdraw(String token, long amount) throws Exception {
        return call(post("/v1/artist/withdrawals").header("Idempotency-Key", newKey()).content(json("{'amountUgx':%d}", amount)), token);
    }

    private String refOf(String withdrawalJson) throws Exception {
        String id = JsonPath.read(withdrawalJson, "$.id");
        return jdbc.queryForObject("select provider_ref from withdrawals where id = ?", String.class, java.util.UUID.fromString(id));
    }

    /** An approved artist whose single (UGX 50,000) a fan just bought: UGX 36,000 earned. */
    private String artistWithASale() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Earner"));
        String release = publishedSingle(artist, "Big Tune", 50_000);
        String fanPhone = newPhone();
        String fan = signIn(fanPhone);
        topUp(fan, fanPhone, 50_000);
        buy(fan, "RELEASE", release, newKey()).andExpect(status().isCreated());
        return artist;
    }

    @Test
    void firstWithdrawalIsReviewedThenPaid() throws Exception {
        String artist = artistWithASale();
        call(get("/v1/artist/earnings"), artist)
                .andExpect(jsonPath("$.balanceUgx").value(36_000))
                .andExpect(jsonPath("$.availableUgx").value(36_000))
                .andExpect(jsonPath("$.minWithdrawalUgx").value(10_000));

        withdraw(artist, 5_000).andExpect(jsonPath("$.code").value("WITHDRAWAL_TOO_SMALL"));
        withdraw(artist, 40_000).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_ENOUGH_AVAILABLE"))
                .andExpect(jsonPath("$.availableUgx").value(36_000));

        String first = withdraw(artist, 20_000).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(first, "$.id");
        // The money is set aside at once, so it can't be withdrawn twice.
        call(get("/v1/artist/earnings"), artist).andExpect(jsonPath("$.balanceUgx").value(16_000));

        String admin = adminToken();
        call(get("/v1/admin/queue"), admin).andExpect(jsonPath("$.withdrawals[*].id", hasItem(id)));
        call(post("/v1/admin/withdrawals/" + id + "/approve"), admin).andExpect(status().isNoContent());
        call(get("/v1/artist/earnings"), artist).andExpect(jsonPath("$.withdrawals[0].status").value("SENT"));

        webhook(refOf(first), "SUCCESSFUL").andExpect(status().isNoContent());
        webhook(refOf(first), "SUCCESSFUL").andExpect(status().isNoContent()); // delivered twice, paid once
        call(get("/v1/artist/earnings"), artist)
                .andExpect(jsonPath("$.withdrawals[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$.balanceUgx").value(16_000));

        // Later withdrawals go straight out. A failed one comes back.
        String second = withdraw(artist, 10_000).andExpect(jsonPath("$.status").value("SENT")).andReturn().getResponse().getContentAsString();
        webhook(refOf(second), "FAILED").andExpect(status().isNoContent());
        call(get("/v1/artist/earnings"), artist)
                .andExpect(jsonPath("$.withdrawals[0].status").value("FAILED"))
                .andExpect(jsonPath("$.balanceUgx").value(16_000))
                .andExpect(jsonPath("$.activity[0].description").value("Withdrawal returned"));

        assertBooksBalance();
    }

    @Test
    void rejectedWithdrawalReturnsTheMoney() throws Exception {
        String artist = artistWithASale();
        String id = JsonPath.read(withdraw(artist, 30_000).andReturn().getResponse().getContentAsString(), "$.id");
        call(post("/v1/admin/withdrawals/" + id + "/reject").content(json("{'note':'Payout number is not in your name.'}")), adminToken())
                .andExpect(status().isNoContent());
        call(get("/v1/artist/earnings"), artist)
                .andExpect(jsonPath("$.balanceUgx").value(36_000))
                .andExpect(jsonPath("$.withdrawals[0].status").value("REJECTED"))
                .andExpect(jsonPath("$.withdrawals[0].reviewNote").value("Payout number is not in your name."));
        assertBooksBalance();
    }

    @Test
    void sameKeyWithdrawsOnce() throws Exception {
        String artist = artistWithASale();
        String key = newKey();
        for (int i = 0; i < 2; i++) {
            call(post("/v1/artist/withdrawals").header("Idempotency-Key", key).content(json("{'amountUgx':15000}")), artist)
                    .andExpect(status().isCreated());
        }
        call(get("/v1/artist/earnings"), artist).andExpect(jsonPath("$.balanceUgx").value(21_000));
    }

    @Test
    void fansCantUseArtistEndpoints() throws Exception {
        String fan = signIn(newPhone());
        call(get("/v1/artist/earnings"), fan).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_AN_ARTIST"));
        call(post("/v1/admin/withdrawals/" + java.util.UUID.randomUUID() + "/approve"), fan).andExpect(status().isForbidden());
    }

    private void assertBooksBalance() {
        Long accounts = jdbc.queryForObject("select coalesce(sum(balance_ugx), 0) from ledger_accounts", Long.class);
        Long unbalanced = jdbc.queryForObject(
                "select count(*) from (select transaction_id from ledger_entries group by transaction_id having sum(amount_ugx) <> 0) x", Long.class);
        assertThat(accounts).isZero();
        assertThat(unbalanced).isZero();
    }
}
