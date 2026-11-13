package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** Uploads go through ffmpeg: a loudness-matched stream for buyers and a public 30-second preview for everyone. */
class AudioPipelineTest extends StudioTestSupport {

    @Test
    void anUploadBecomesALightStreamAndAPreviewAtTheSameLoudness() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Sheebah"));
        String release = call(post("/v1/artist/releases").content(json("{'title':'Loud One','type':'SINGLE','priceUgx':1000}")), artist)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(release, "$.id");
        String withTrack = call(post("/v1/artist/releases/" + id + "/tracks").content(json(
                "{'title':'Loud One','priceUgx':1000,'writers':[{'name':'Me','sharePct':100}]}")), artist)
                .andReturn().getResponse().getContentAsString();
        String trackId = JsonPath.read(withTrack, "$.tracks[0].id");

        // A loud 90-second master (a tone at half of full scale, about −9 LUFS).
        upload("/v1/artist/releases/" + id + "/tracks/" + trackId + "/audio", artist, "master.wav", tone(90, 0.5))
                .andExpect(status().isOk());

        String view = call(get("/v1/artist/releases/" + id), artist)
                .andExpect(jsonPath("$.tracks[0].audioStatus").value("READY"))
                .andExpect(jsonPath("$.tracks[0].sourceLossy").value(false))
                .andReturn().getResponse().getContentAsString();
        double masterLufs = ((Number) JsonPath.read(view, "$.tracks[0].loudnessLufs")).doubleValue();
        assertThat(masterLufs).isGreaterThan(-12);
        List<String> problems = JsonPath.read(view, "$.problems");
        assertThat(problems).noneMatch(p -> p.contains("processing"));

        // The preview is public (no signature), 30 seconds, and turned down to about −14 LUFS.
        String previewUrl = JsonPath.read(view, "$.tracks[0].previewUrl");
        assertThat(previewUrl).startsWith("/v1/media/previews/").endsWith(".m4a").doesNotContain("sig=");
        Path preview = save(mvc.perform(get(previewUrl)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
        assertThat(durationSec(preview)).isCloseTo(30, within(0.5));
        assertThat(lufs(preview)).isCloseTo(-14, within(1.5));

        // The artist's play link is the stream, not the master: AAC, and much smaller than the WAV.
        String link = JsonPath.read(call(get("/v1/tracks/" + trackId + "/play"), artist).andReturn().getResponse().getContentAsString(), "$.url");
        assertThat(link).contains("/v1/media/audio/").contains(".m4a?");
        byte[] streamBytes = mvc.perform(get(link)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(streamBytes.length).isLessThan(tone(90, 0.5).length);
        Path stream = save(streamBytes);
        assertThat(durationSec(stream)).isCloseTo(90, within(0.5));
        assertThat(lufs(stream)).isCloseTo(-14, within(1.0));

        // Once published, fans see the preview in the catalogue.
        call(put("/v1/artist/releases/" + id + "/declaration").content(json(
                "{'signedToLabel':'NO','releasedBefore':false,'coverOrSamples':false,'confirmOwnership':true}")), artist)
                .andExpect(status().isOk());
        call(post("/v1/artist/releases/" + id + "/submit"), artist).andExpect(status().isOk());
        call(post("/v1/admin/releases/" + id + "/approve"), adminToken());
        mvc.perform(get("/v1/catalog/releases/" + id))
                .andExpect(jsonPath("$.tracks[0].previewUrl").value(previewUrl));
    }

    private static Path save(byte[] bytes) throws Exception {
        Path p = Files.createTempFile("deegee-test-", ".m4a");
        Files.write(p, bytes);
        p.toFile().deleteOnExit();
        return p;
    }

    private static double durationSec(Path file) throws Exception {
        return Double.parseDouble(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file.toString()).strip());
    }

    private static double lufs(Path file) throws Exception {
        String log = run("ffmpeg", "-hide_banner", "-nostats", "-i", file.toString(), "-af", "ebur128", "-f", "null", "-");
        Matcher m = Pattern.compile("I:\\s+(-?[\\d.]+) LUFS").matcher(log);
        String last = null;
        while (m.find()) last = m.group(1);
        return Double.parseDouble(last);
    }

    private static String run(String... command) throws Exception {
        Process p = new ProcessBuilder(command).redirectErrorStream(true).start();
        String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        p.waitFor();
        return out;
    }
}
