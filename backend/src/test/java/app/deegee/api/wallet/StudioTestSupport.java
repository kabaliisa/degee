package app.deegee.api.wallet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.ThreadLocalRandom;
import javax.imageio.ImageIO;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

/** Helpers for artist-side tests: real (tiny) audio and image files, and a published release in one call. */
abstract class StudioTestSupport extends ApiTestSupport {

    static final String ADMIN_PHONE = "+256700000001"; // listed in application-test.yml

    /** A silent mono WAV of the given length: small, but a real file the server can decode. */
    static byte[] wav(int seconds) {
        int rate = 8000, samples = rate * seconds;
        ByteBuffer b = ByteBuffer.allocate(44 + samples).order(ByteOrder.LITTLE_ENDIAN);
        b.put("RIFF".getBytes()).putInt(36 + samples).put("WAVE".getBytes());
        b.put("fmt ".getBytes()).putInt(16).putShort((short) 1).putShort((short) 1).putInt(rate).putInt(rate).putShort((short) 1).putShort((short) 8);
        b.put("data".getBytes()).putInt(samples);
        for (int i = 0; i < samples; i++) b.put((byte) 128);
        return b.array();
    }

    static byte[] png(int size) throws IOException {
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    static String uniqueName(String base) {
        return base + " " + Integer.toString(ThreadLocalRandom.current().nextInt(1_000_000), 36);
    }

    ResultActions upload(String path, String token, String filename, byte[] bytes) throws Exception {
        return mvc.perform(multipart(HttpMethod.PUT, path).file(new MockMultipartFile("file", filename, "application/octet-stream", bytes))
                .header("Authorization", "Bearer " + token));
    }

    private static String adminToken; // one sign-in for the whole run: codes are limited to 5 an hour per phone

    String adminToken() throws Exception {
        if (adminToken == null) adminToken = signIn(ADMIN_PHONE);
        return adminToken;
    }

    /** Signs up an artist and has the admin approve them. Returns the artist's token. */
    String approvedArtist(String phone, String name) throws Exception {
        String token = signIn(phone);
        String body = call(post("/v1/artist/application").content(json(
                "{'name':'%s','city':'Kampala','bio':'Test artist','genres':['Afrobeat'],'payoutPhone':'%s'}", name, phone)), token)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");
        call(post("/v1/admin/artists/" + id + "/approve"), adminToken()).andExpect(status().isNoContent());
        return token;
    }

    /** A single with one song by the artist (no society, so the song share is paid to them directly). Returns the release JSON. */
    String draftSingle(String token, String title, long price) throws Exception {
        String release = call(post("/v1/artist/releases").content(json("{'title':'%s','type':'SINGLE','priceUgx':%d}", title, price)), token)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(release, "$.id");
        String withTrack = call(post("/v1/artist/releases/" + id + "/tracks").content(json(
                "{'title':'%s','priceUgx':%d,'writers':[{'name':'Me','sharePct':100,'society':null}]}", title, price)), token)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String trackId = JsonPath.read(withTrack, "$.tracks[0].id");
        upload("/v1/artist/releases/" + id + "/tracks/" + trackId + "/audio", token, "song.wav", wav(31)).andExpect(status().isOk());
        return call(put("/v1/artist/releases/" + id + "/declaration").content(json(
                "{'signedToLabel':'NO','releasedBefore':false,'coverOrSamples':false,'confirmOwnership':true}")), token)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    /** Draft → submitted → approved. Returns the release id. */
    String publishedSingle(String token, String title, long price) throws Exception {
        String id = JsonPath.read(draftSingle(token, title, price), "$.id");
        call(post("/v1/artist/releases/" + id + "/submit"), token).andExpect(status().isOk());
        call(post("/v1/admin/releases/" + id + "/approve"), adminToken()).andExpect(status().isNoContent());
        return id;
    }
}
