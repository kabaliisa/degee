package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

/** With the real holds on: a new artist's sales wait 30 days before they can be withdrawn. */
@TestPropertySource(properties = {"deegee.payouts.sale-hold=7d", "deegee.payouts.new-artist-hold=30d"})
class EarningsHoldTest extends StudioTestSupport {

    @Test
    void newArtistsSalesAreHeldForThirtyDays() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Newcomer"));
        String release = publishedSingle(artist, "Fresh", 20_000);
        String fanPhone = newPhone();
        String fan = signIn(fanPhone);
        topUp(fan, fanPhone, 20_000);
        buy(fan, "RELEASE", release, newKey()).andExpect(status().isCreated());

        String earnings = call(get("/v1/artist/earnings"), artist)
                .andExpect(jsonPath("$.balanceUgx").value(14_400))
                .andExpect(jsonPath("$.heldUgx").value(14_400))
                .andExpect(jsonPath("$.availableUgx").value(0))
                .andExpect(jsonPath("$.holdDays").value(30))
                .andReturn().getResponse().getContentAsString();
        Instant unlock = Instant.parse(JsonPath.read(earnings, "$.nextUnlockAt"));
        assertThat(Duration.between(Instant.now(), unlock).toDays()).isBetween(29L, 30L);

        call(post("/v1/artist/withdrawals").header("Idempotency-Key", newKey()).content(json("{'amountUgx':10000}")), artist)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("NOT_ENOUGH_AVAILABLE"));
    }
}
