package app.deegee.api.wallet;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Deegee's own numbers: the float has to balance, the volume and the cut have to stay apart. */
class AdminInsightsApiTest extends StudioTestSupport {

    @Test
    @DisplayName("the float balances: cash in equals what is owed plus what Deegee earned")
    void floatBalances() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Floaty"));
        String release = publishedSingle(artist, "Balance Sheet", 10_000);

        String fan = signIn(newPhone());
        topUp(fan, newPhone(), 50_000);
        buy(fan, "RELEASE", release, newKey()).andExpect(status().isCreated());

        call(get("/v1/admin/insights"), adminToken())
                .andExpect(status().isOk())
                // the whole point of the screen: a gap means money is missing somewhere
                .andExpect(jsonPath("$.held.gapUgx").value(0))
                .andExpect(jsonPath("$.held.cashUgx", greaterThanOrEqualTo(50_000)))
                .andExpect(jsonPath("$.held.artistEarningsUgx", greaterThan(0)))
                .andExpect(jsonPath("$.held.platformRevenueUgx", greaterThan(0)));
    }

    @Test
    @DisplayName("keeps volume and Deegee's own cut as separate numbers")
    void volumeIsNotRevenue() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Cutty"));
        String release = publishedSingle(artist, "Twenty Percent", 20_000);

        String fan = signIn(newPhone());
        topUp(fan, newPhone(), 40_000);
        buy(fan, "RELEASE", release, newKey()).andExpect(status().isCreated());

        String body = call(get("/v1/admin/insights"), adminToken()).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long sold = ((Number) JsonPath.read(body, "$.money.soldThroughUgx")).longValue();
        long revenue = ((Number) JsonPath.read(body, "$.money.revenueUgx")).longValue();

        // Deegee takes a slice, never the whole thing -- if these are ever equal the labels are lying.
        org.assertj.core.api.Assertions.assertThat(revenue).isGreaterThan(0).isLessThan(sold);
    }

    @Test
    @DisplayName("gives a day for every day of the window and counts the people")
    void daysAndPeople() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Countable"));
        String release = publishedSingle(artist, "One Buyer", 5_000);
        String fan = signIn(newPhone());
        topUp(fan, newPhone(), 20_000);
        buy(fan, "RELEASE", release, newKey()).andExpect(status().isCreated());

        call(get("/v1/admin/insights"), adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.daily.length()").value(30))
                .andExpect(jsonPath("$.people.fans", greaterThan(0)))
                .andExpect(jsonPath("$.people.buyers", greaterThan(0)))
                .andExpect(jsonPath("$.people.artistsLive", greaterThan(0)))
                .andExpect(jsonPath("$.people.earning", greaterThan(0)))
                .andExpect(jsonPath("$.topArtists.length()", greaterThan(0)));
    }

    @Test
    @DisplayName("an artist cannot read Deegee's numbers")
    void artistsAreNotAdmins() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Nosy"));
        call(get("/v1/admin/insights"), artist)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_ONLY"));
    }
}
