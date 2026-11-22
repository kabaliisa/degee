package app.deegee.api.wallet;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** What an artist sees about their own trade, and what they must never see about anyone else's. */
class InsightsApiTest extends StudioTestSupport {

    private String gift(String token, String artistId, long amount) throws Exception {
        return call(post("/v1/gifts").header("Idempotency-Key", newKey())
                .content(json("{'artistId':'%s','amountUgx':%d,'note':'Keep going'}", artistId, amount)), token)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    }

    @Test
    @DisplayName("counts people rather than purchases, and ranks them by what they have given")
    void countsPeopleNotPurchases() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Insightful"));
        String artistId = JsonPath.read(call(get("/v1/artist/me"), artist).andReturn().getResponse().getContentAsString(), "$.id");
        String releaseA = publishedSingle(artist, "First Tune", 10_000);
        String releaseB = publishedSingle(artist, "Second Tune", 10_000);

        // One fan buys twice. Two purchases, one supporter.
        String busy = signIn(newPhone());
        topUp(busy, newPhone(), 100_000);
        buy(busy, "RELEASE", releaseA, newKey()).andExpect(status().isCreated());
        buy(busy, "RELEASE", releaseB, newKey()).andExpect(status().isCreated());

        // Another buys once and sends a large gift, which should put them top.
        String generous = signIn(newPhone());
        topUp(generous, newPhone(), 100_000);
        buy(generous, "RELEASE", releaseA, newKey()).andExpect(status().isCreated());
        gift(generous, artistId, 60_000);

        call(get("/v1/artist/insights"), artist)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supporters").value(2))
                .andExpect(jsonPath("$.earnedAllTimeUgx", greaterThan(0)))
                .andExpect(jsonPath("$.topSupporters.length()").value(2))
                // the gift carries them past the fan who bought one more song
                .andExpect(jsonPath("$.topSupporters[0].giftedUgx").value(60_000))
                .andExpect(jsonPath("$.topSupporters[0].songs").value(1))
                .andExpect(jsonPath("$.topSupporters[1].songs").value(2))
                .andExpect(jsonPath("$.topSupporters[1].giftedUgx").value(0))
                // two people bought the first tune, one bought the second
                .andExpect(jsonPath("$.topSongs[0].title").value("First Tune"))
                .andExpect(jsonPath("$.topSongs[0].buyers").value(2))
                .andExpect(jsonPath("$.topSongs[1].buyers").value(1));
    }

    @Test
    @DisplayName("gives a day for every day of the window, including the empty ones")
    void fillsTheQuietDays() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Patient"));
        call(get("/v1/artist/insights"), artist)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.daily.length()").value(30))
                .andExpect(jsonPath("$.daily[0].ugx").value(0))
                .andExpect(jsonPath("$.supporters").value(0))
                .andExpect(jsonPath("$.earnedAllTimeUgx").value(0));
    }

    @Test
    @DisplayName("shows an artist their own trade and nobody else's")
    void neverAnotherArtistsNumbers() throws Exception {
        String seller = approvedArtist(newPhone(), uniqueName("Seller"));
        String release = publishedSingle(seller, "Sells Well", 20_000);
        String fan = signIn(newPhone());
        topUp(fan, newPhone(), 50_000);
        buy(fan, "RELEASE", release, newKey()).andExpect(status().isCreated());

        // A second artist, who has sold nothing, sees nothing -- there is no id to pass that
        // would let them ask about the first.
        String other = approvedArtist(newPhone(), uniqueName("Quiet"));
        call(get("/v1/artist/insights"), other)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supporters").value(0))
                .andExpect(jsonPath("$.earnedAllTimeUgx").value(0))
                .andExpect(jsonPath("$.topSongs.length()").value(0));
    }

    @Test
    @DisplayName("is not for people without an artist profile")
    void refusesNonArtists() throws Exception {
        call(get("/v1/artist/insights"), signIn(newPhone()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_AN_ARTIST"));
    }
}
