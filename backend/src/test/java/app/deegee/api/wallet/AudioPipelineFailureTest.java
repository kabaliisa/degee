package app.deegee.api.wallet;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

/** When processing fails, the artist is told why and can't submit until they upload again. */
@TestPropertySource(properties = "deegee.audio.ffmpeg=/no/such/ffmpeg")
class AudioPipelineFailureTest extends StudioTestSupport {

    @Test
    void aFailedSongBlocksSubmittingAndSaysWhatToDo() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Eddy"));
        String id = JsonPath.read(draftSingle(artist, "Broken", 1000), "$.id");
        call(get("/v1/artist/releases/" + id), artist)
                .andExpect(jsonPath("$.tracks[0].audioStatus").value("FAILED"))
                .andExpect(jsonPath("$.tracks[0].audioError").value(startsWith("We couldn't process this recording")))
                .andExpect(jsonPath("$.tracks[0].previewUrl").doesNotExist())
                .andExpect(jsonPath("$.problems", hasItem(startsWith("“Broken”: We couldn't process"))));
        call(post("/v1/artist/releases/" + id + "/submit"), artist).andExpect(status().isUnprocessableContent());
    }
}
