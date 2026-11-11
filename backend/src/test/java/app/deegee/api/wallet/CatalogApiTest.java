package app.deegee.api.wallet;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

class CatalogApiTest extends ApiTestSupport {

    @Test
    void listsTheSeededCatalogue() throws Exception {
        mvc.perform(get("/v1/catalog/artists")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(5)));
        mvc.perform(get("/v1/catalog/releases")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(6)));
    }

    @Test
    void releasePageHasArtistAndOrderedSongsWithWriters() throws Exception {
        mvc.perform(get("/v1/catalog/releases/r1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.release.type").value("EP"))
                .andExpect(jsonPath("$.release.priceUGX").value(8000))
                .andExpect(jsonPath("$.artist.name").value("Nalu Kizza"))
                .andExpect(jsonPath("$.tracks", hasSize(4)))
                .andExpect(jsonPath("$.tracks[0].id").value("t1"))
                .andExpect(jsonPath("$.tracks[1].writers", hasSize(2)));
    }

    @Test
    void artistPageHasReleasesAndSongs() throws Exception {
        mvc.perform(get("/v1/catalog/artists/a1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.artist.genres", hasItem("Afrobeat")))
                .andExpect(jsonPath("$.releases", hasSize(2)))
                .andExpect(jsonPath("$.tracks", hasSize(5)));
    }

    @Test
    void searchFindsArtistsByGenreAndSongsByTitle() throws Exception {
        mvc.perform(get("/v1/catalog/search").param("q", "gospel"))
                .andExpect(jsonPath("$.artists[0].id").value("a4"));
        mvc.perform(get("/v1/catalog/search").param("q", "rolex"))
                .andExpect(jsonPath("$.tracks[0].id").value("t15"));
        mvc.perform(get("/v1/catalog/search").param("q", "  "))
                .andExpect(jsonPath("$.artists", hasSize(0)));
    }

    @Test
    void unknownIdsAre404WithACode() throws Exception {
        mvc.perform(get("/v1/catalog/releases/nope"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
