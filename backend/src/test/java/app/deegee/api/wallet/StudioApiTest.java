package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.List;
import org.junit.jupiter.api.Test;

class StudioApiTest extends StudioTestSupport {

    @Test
    void applicationWaitsForAnAdminAndOnlyAdminsSeeTheQueue() throws Exception {
        String phone = newPhone();
        String token = signIn(phone);
        String name = uniqueName("Kizza");
        call(get("/v1/artist/me"), token).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_AN_ARTIST"));

        String body = call(post("/v1/artist/application").content(json(
                "{'name':'%s','city':'Gulu','bio':'Acholi pop','genres':['Afrobeat','Zouk'],'payoutPhone':'0701 234 567'}", name)), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.payoutPhone").value("+256701234567"))
                .andExpect(jsonPath("$.payoutProvider").value("AIRTEL_MONEY"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");

        // Pending artists aren't public yet.
        mvc.perform(get("/v1/catalog/artists/" + id)).andExpect(status().isNotFound());
        call(get("/v1/admin/queue"), token).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ADMIN_ONLY"));

        String admin = adminToken();
        call(get("/v1/me"), admin).andExpect(jsonPath("$.roles", hasItem("ADMIN")));
        call(get("/v1/admin/queue"), admin).andExpect(jsonPath("$.artists[*].id", hasItem(id)));
        call(post("/v1/admin/artists/" + id + "/approve"), admin).andExpect(status().isNoContent());

        call(get("/v1/artist/me"), token).andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.verified").value(true));
        mvc.perform(get("/v1/catalog/artists/" + id)).andExpect(status().isOk());
    }

    @Test
    void artistNamesAreUniqueAndGenresChecked() throws Exception {
        call(post("/v1/artist/application").content(json(
                "{'name':'nalu kizza','city':'Kampala','genres':['Afrobeat'],'payoutPhone':'0772123456'}")), signIn(newPhone()))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("NAME_TAKEN"));
        call(post("/v1/artist/application").content(json(
                "{'name':'%s','city':'Kampala','genres':['Polka'],'payoutPhone':'0772123456'}", uniqueName("X"))), signIn(newPhone()))
                .andExpect(jsonPath("$.code").value("GENRES"));
    }

    @Test
    void rejectedApplicationCanBeFixedAndResent() throws Exception {
        String token = signIn(newPhone());
        String id = JsonPath.read(call(post("/v1/artist/application").content(json(
                "{'name':'%s','city':'Mbale','genres':['Gospel'],'payoutPhone':'0772123456'}", uniqueName("Choir"))), token)
                .andReturn().getResponse().getContentAsString(), "$.id");
        call(post("/v1/admin/artists/" + id + "/reject").content(json("{'note':'Add a bio so fans know who you are.'}")), adminToken())
                .andExpect(status().isNoContent());
        call(get("/v1/artist/me"), token)
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.reviewNote").value("Add a bio so fans know who you are."));

        call(post("/v1/artist/application").content(json(
                "{'name':'%s','city':'Mbale','bio':'Church choir from Mbale','genres':['Gospel'],'payoutPhone':'0772123456'}", uniqueName("Choir"))), token)
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reviewNote").doesNotExist());
    }

    @Test
    void uploadReviewPublishBuyAndPlay() throws Exception {
        String phone = newPhone();
        String artist = approvedArtist(phone, uniqueName("Sheebah Jr"));

        // A draft says what's missing.
        String release = call(post("/v1/artist/releases").content(json("{'title':'Kampala Nights','type':'SINGLE','priceUgx':2500}")), artist)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.problems", hasItem("Add at least one song.")))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(release, "$.id");

        call(post("/v1/artist/releases/" + id + "/tracks").content(json(
                "{'title':'Kampala Nights','priceUgx':2500,'writers':[{'name':'Me','sharePct':60},{'name':'Producer','sharePct':30}]}")), artist)
                .andExpect(jsonPath("$.code").value("WRITER_SHARE"));
        String withTrack = call(post("/v1/artist/releases/" + id + "/tracks").content(json(
                "{'title':'Kampala Nights','priceUgx':2500,'writers':[{'name':'Me','sharePct':60,'society':'UPRS'},{'name':'Producer','sharePct':40}]}")), artist)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.problems", hasItem("Upload the recording for “Kampala Nights”.")))
                .andReturn().getResponse().getContentAsString();
        String trackId = JsonPath.read(withTrack, "$.tracks[0].id");

        // Bad files are refused before they're stored.
        upload("/v1/artist/releases/" + id + "/tracks/" + trackId + "/audio", artist, "song.mp3", "not audio".getBytes())
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("AUDIO_UNREADABLE"));
        upload("/v1/artist/releases/" + id + "/tracks/" + trackId + "/audio", artist, "clip.wav", wav(5))
                .andExpect(jsonPath("$.code").value("AUDIO_LENGTH"));
        upload("/v1/artist/releases/" + id + "/tracks/" + trackId + "/audio", artist, "song.wav", wav(31))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tracks[0].hasAudio").value(true))
                .andExpect(jsonPath("$.tracks[0].durationSec").value(31));
        upload("/v1/artist/releases/" + id + "/cover", artist, "cover.png", png(100))
                .andExpect(jsonPath("$.code").value("IMAGE_TOO_SMALL"));
        String withCover = upload("/v1/artist/releases/" + id + "/cover", artist, "cover.png", png(500))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        // Can't submit without the rights answers.
        call(post("/v1/artist/releases/" + id + "/submit"), artist)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("NOT_READY"))
                .andExpect(jsonPath("$.problems[0]").value("Answer the rights questions."));
        call(put("/v1/artist/releases/" + id + "/declaration").content(json(
                "{'signedToLabel':'NO','releasedBefore':false,'coverOrSamples':false,'confirmOwnership':false}")), artist)
                .andExpect(jsonPath("$.code").value("OWNERSHIP_NOT_CONFIRMED"));
        call(put("/v1/artist/releases/" + id + "/declaration").content(json(
                "{'signedToLabel':'NOT_SURE','labelName':'Swangz Avenue?','releasedBefore':true,'previousDistributor':'Audiomack','coverOrSamples':false,'confirmOwnership':true}")), artist)
                .andExpect(jsonPath("$.problems").isEmpty());

        call(post("/v1/artist/releases/" + id + "/submit"), artist).andExpect(jsonPath("$.status").value("IN_REVIEW"));
        call(post("/v1/artist/releases/" + id + "/tracks").content(json("{'title':'B-side','priceUgx':1000,'writers':[{'name':'Me','sharePct':100}]}")), artist)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("NOT_EDITABLE"));
        mvc.perform(get("/v1/catalog/releases/" + id)).andExpect(status().isNotFound());

        // The reviewer sees the flags and can listen.
        String admin = adminToken();
        String queue = call(get("/v1/admin/queue"), admin).andReturn().getResponse().getContentAsString();
        List<String> flags = JsonPath.read(queue, "$.releases[?(@.release.id == '" + id + "')].flags[*]");
        assertThat(flags).anyMatch(f -> f.startsWith("Not sure about a label deal")).anyMatch(f -> f.startsWith("Released before via Audiomack"))
                .anyMatch(f -> f.startsWith("First release"));
        List<String> audio = JsonPath.read(queue, "$.releases[?(@.release.id == '" + id + "')].release.tracks[0].audioUrl");
        mvc.perform(get(audio.getFirst())).andExpect(status().isOk()).andExpect(content().bytes(wav(31)));
        mvc.perform(get(audio.getFirst().replaceAll("sig=[0-9a-f]+", "sig=00"))).andExpect(status().isForbidden());

        call(post("/v1/admin/releases/" + id + "/approve"), admin).andExpect(status().isNoContent());

        // Published: in the catalogue with its cover, newest first.
        String coverPath = JsonPath.read(withCover, "$.coverUrl");
        mvc.perform(get("/v1/catalog"))
                .andExpect(jsonPath("$.releases[0].id").value(id))
                .andExpect(jsonPath("$.releases[0].coverUrl").value(coverPath))
                .andExpect(jsonPath("$.tracks[?(@.id == '" + trackId + "')].hasAudio").value(hasItem(true)));
        mvc.perform(get(coverPath)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));

        // Only buyers, the artist and admins get the full recording.
        String fanPhone = newPhone();
        String fan = signIn(fanPhone);
        call(get("/v1/tracks/" + trackId + "/play"), fan).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("NOT_OWNED"));
        topUp(fan, fanPhone, 5000);
        buy(fan, "RELEASE", id, newKey()).andExpect(status().isCreated());
        String link = JsonPath.read(call(get("/v1/tracks/" + trackId + "/play"), fan).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.url");
        mvc.perform(get(link)).andExpect(status().isOk());
        call(get("/v1/tracks/" + trackId + "/play"), artist).andExpect(status().isOk());

        // Artists hear their own songs without buying them, and can't buy or gift to themselves.
        topUp(artist, phone, 5000);
        buy(artist, "RELEASE", id, newKey()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OWN_MUSIC"));
        String artistId = JsonPath.read(call(get("/v1/artist/me"), artist).andReturn().getResponse().getContentAsString(), "$.id");
        call(post("/v1/gifts").header("Idempotency-Key", newKey()).content(json("{'artistId':'%s','amountUgx':1000}", artistId)), artist)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OWN_MUSIC"));

        // 2,500 sale: 250 song share (60% UPRS = 150, 40% direct = 100), Deegee 450, artist 1,800.
        call(get("/v1/artist/earnings"), artist)
                .andExpect(jsonPath("$.balanceUgx").value(1800))
                .andExpect(jsonPath("$.activity[0].description").value("Sale: Kampala Nights (Single)"));
    }

    @Test
    void labelDealsNeedALetterAndCoversAreBlocked() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Label Act"));
        String id = JsonPath.read(draftSingle(artist, "Signed Song", 2000), "$.id");

        call(put("/v1/artist/releases/" + id + "/declaration").content(json(
                "{'signedToLabel':'YES','releasedBefore':false,'coverOrSamples':false,'confirmOwnership':true}")), artist)
                .andExpect(jsonPath("$.code").value("LABEL_NAME"));
        call(put("/v1/artist/releases/" + id + "/declaration").content(json(
                "{'signedToLabel':'YES','labelName':'Black Market','releasedBefore':false,'coverOrSamples':false,'confirmOwnership':true}")), artist)
                .andExpect(jsonPath("$.problems[0]").value("Upload your label’s signed permission letter."));
        call(post("/v1/artist/releases/" + id + "/submit"), artist).andExpect(jsonPath("$.code").value("NOT_READY"));

        upload("/v1/artist/releases/" + id + "/label-letter", artist, "letter.pdf", "hello".getBytes())
                .andExpect(jsonPath("$.code").value("FILE_UNREADABLE"));
        upload("/v1/artist/releases/" + id + "/label-letter", artist, "letter.pdf", "%PDF-1.4 signed".getBytes())
                .andExpect(jsonPath("$.declaration.hasLabelLetter").value(true))
                .andExpect(jsonPath("$.problems").isEmpty());

        call(put("/v1/artist/releases/" + id + "/declaration").content(json(
                "{'signedToLabel':'NO','releasedBefore':false,'coverOrSamples':true,'confirmOwnership':true}")), artist)
                .andExpect(jsonPath("$.declaration.hasLabelLetter").value(false))
                .andExpect(jsonPath("$.problems[0]").value(org.hamcrest.Matchers.startsWith("Covers and songs with samples")));
    }

    @Test
    void pendingArtistsCanPrepareButNotSubmit() throws Exception {
        String token = signIn(newPhone());
        call(post("/v1/artist/application").content(json(
                "{'name':'%s','city':'Jinja','genres':['Dancehall'],'payoutPhone':'0772123456'}", uniqueName("Waiting"))), token);
        String id = JsonPath.read(draftSingle(token, "Early Bird", 1500), "$.id");
        call(post("/v1/artist/releases/" + id + "/submit"), token)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ARTIST_NOT_APPROVED"));
    }

    @Test
    void releasesBelongToTheirArtistAndDraftsCanBeDeleted() throws Exception {
        String owner = approvedArtist(newPhone(), uniqueName("Owner"));
        String other = approvedArtist(newPhone(), uniqueName("Other"));
        String id = JsonPath.read(draftSingle(owner, "Mine", 1500), "$.id");

        call(get("/v1/artist/releases/" + id), other).andExpect(status().isNotFound());
        call(delete("/v1/artist/releases/" + id), other).andExpect(status().isNotFound());
        call(delete("/v1/artist/releases/" + id), owner).andExpect(status().isNoContent());
        call(get("/v1/artist/releases"), owner).andExpect(jsonPath("$[*].id", not(hasItem(id))));
    }

    @Test
    void albumsNeedEnoughSongsAndAFairPrice() throws Exception {
        String artist = approvedArtist(newPhone(), uniqueName("Album Act"));
        String id = JsonPath.read(call(post("/v1/artist/releases").content(json("{'title':'Big One','type':'ALBUM','priceUgx':9000}")), artist)
                .andReturn().getResponse().getContentAsString(), "$.id");
        for (int i = 1; i <= 2; i++) {
            call(post("/v1/artist/releases/" + id + "/tracks").content(json(
                    "{'title':'Song %d','priceUgx':1000,'writers':[{'name':'Me','sharePct':100}]}", i)), artist);
        }
        call(get("/v1/artist/releases/" + id), artist)
                .andExpect(jsonPath("$.tracks", hasSize(2)))
                .andExpect(jsonPath("$.problems", hasItem("An album has 5 to 40 songs; this one has 2.")))
                .andExpect(jsonPath("$.problems", hasItem("The release price can’t be more than buying every song separately (UGX 2,000).")));
    }
}
