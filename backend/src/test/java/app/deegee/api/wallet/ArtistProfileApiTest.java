package app.deegee.api.wallet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** An approved artist editing their own page, and the two edits that carry a cost. */
class ArtistProfileApiTest extends StudioTestSupport {

    private String edit(String name, String city, String bio, String genres, String slug, String phone) {
        return """
                {"name":"%s","city":"%s","bio":"%s","genres":[%s]%s%s}"""
                .formatted(name, city, bio, genres,
                        slug == null ? "" : ",\"slug\":\"" + slug + "\"",
                        phone == null ? "" : ",\"payoutPhone\":\"" + phone + "\"");
    }

    @Test
    @DisplayName("an approved artist edits their page without losing approval or the verified badge")
    void editKeepsStatus() throws Exception {
        String token = approvedArtist(newPhone(), uniqueName("Editable"));

        call(patch("/v1/artist/profile").contentType(MediaType.APPLICATION_JSON)
                .content(edit("Editable Renamed", "Jinja", "Now recording in Jinja.", "\"Afrobeat\"", null, null)), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Editable Renamed"))
                .andExpect(jsonPath("$.city").value("Jinja"))
                // the whole point: a typo fix must not take a live catalogue off sale
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.verified").value(true));
    }

    @Test
    @DisplayName("renaming does not move the artist's address")
    void renameKeepsTheHandle() throws Exception {
        String name = uniqueName("Stable");
        String token = approvedArtist(newPhone(), name);

        String before = field(call(get("/v1/artist/me"), token), "$.slug");

        call(patch("/v1/artist/profile").contentType(MediaType.APPLICATION_JSON)
                .content(edit(name + " and the Band", "Kampala", "Same page, new name.", "\"Afrobeat\"", null, null)), token)
                .andExpect(status().isOk())
                // a poster printed yesterday still works
                .andExpect(jsonPath("$.slug").value(before));
    }

    @Test
    @DisplayName("a handle can be moved deliberately, but not onto a taken one or one of Deegee's own pages")
    void handleRules() throws Exception {
        String token = approvedArtist(newPhone(), uniqueName("Mover"));
        String otherToken = approvedArtist(newPhone(), uniqueName("Squatter"));
        String taken = field(call(get("/v1/artist/me"), otherToken), "$.slug");

        call(patch("/v1/artist/profile").contentType(MediaType.APPLICATION_JSON)
                .content(edit("Mover", "Kampala", "", "\"Afrobeat\"", "library", null)), token)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("BAD_HANDLE"));

        call(patch("/v1/artist/profile").contentType(MediaType.APPLICATION_JSON)
                .content(edit("Mover", "Kampala", "", "\"Afrobeat\"", taken, null)), token)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("HANDLE_TAKEN"));

        call(patch("/v1/artist/profile").contentType(MediaType.APPLICATION_JSON)
                .content(edit("Mover", "Kampala", "", "\"Afrobeat\"", "mover-official", null)), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("mover-official"));
    }

    @Test
    @DisplayName("changing the payout number pauses withdrawals for a day")
    void payoutChangeHoldsWithdrawals() throws Exception {
        String artistName = uniqueName("Payee");
        String token = approvedArtist(newPhone(), artistName);
        String release = publishedSingle(token, "Something To Sell", 50_000);

        String fan = signIn(newPhone());
        topUp(fan, newPhone(), 100_000);
        buy(fan, "RELEASE", release, newKey()).andExpect(status().isCreated());

        call(patch("/v1/artist/profile").contentType(MediaType.APPLICATION_JSON)
                .content(edit(artistName, "Kampala", "", "\"Afrobeat\"", null, "0772 998877")), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payoutHeldUntil").exists());

        // the money is still theirs; it just cannot leave yet
        call(post("/v1/artist/withdrawals").contentType(MediaType.APPLICATION_JSON)
                .content("{\"amountUgx\":20000}").header("Idempotency-Key", newKey()), token)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAYOUT_NUMBER_JUST_CHANGED"));
    }

    @Test
    @DisplayName("re-sending the same payout number is not a change, so nothing is paused")
    void sameNumberIsNotAChange() throws Exception {
        String artistName = uniqueName("Unchanged");
        String token = approvedArtist(newPhone(), artistName);
        String phone = field(call(get("/v1/artist/me"), token), "$.payoutPhone");

        call(patch("/v1/artist/profile").contentType(MediaType.APPLICATION_JSON)
                .content(edit(artistName, "Gulu", "Moved to Gulu.", "\"Afrobeat\"", null, phone)), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payoutHeldUntil").doesNotExist());
    }

    @Test
    @DisplayName("an artist still waiting for review is sent back to the application, not here")
    void pendingArtistsUseTheApplication() throws Exception {
        String token = pendingArtist(newPhone(), uniqueName("Waiting"));

        call(patch("/v1/artist/profile").contentType(MediaType.APPLICATION_JSON)
                .content(edit("Waiting Still", "Kampala", "", "\"Afrobeat\"", null, null)), token)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_APPROVED_YET"));
    }
}
