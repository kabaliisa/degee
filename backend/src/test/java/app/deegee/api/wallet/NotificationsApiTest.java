package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.deegee.api.notify.Notification;
import app.deegee.api.notify.PushSender;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.ResultActions;

/** What lands on somebody's phone when money moves. */
@Import(NotificationsApiTest.CapturedPushes.class)
class NotificationsApiTest extends StudioTestSupport {

    /** Stands in for Expo: keeps every notification instead of sending it. */
    @TestConfiguration
    static class CapturedPushes {
        static final List<PushSender.Push> SENT = new CopyOnWriteArrayList<>();

        @Bean
        @Primary
        PushSender capturingPushSender() {
            return pushes -> {
                SENT.addAll(pushes);
                return List.of(); // nothing dead
            };
        }
    }

    @Autowired
    CheckoutOrderRepository orders;

    @BeforeEach
    void clearSent() {
        CapturedPushes.SENT.clear();
    }

    private List<PushSender.Push> to(String token) {
        return CapturedPushes.SENT.stream().filter(p -> p.token().equals(token)).toList();
    }

    private PushSender.Push only(String pushToken, Notification.Kind kind) {
        List<PushSender.Push> matching = to(pushToken).stream().filter(p -> p.notification().kind() == kind).toList();
        assertThat(matching).as("one %s for %s", kind, pushToken).hasSize(1);
        return matching.getFirst();
    }

    private void registerPhone(String authToken, String pushToken) throws Exception {
        call(post("/v1/me/push-tokens").content(json("{'token':'%s','platform':'android'}", pushToken)), authToken)
                .andExpect(status().isNoContent());
    }

    private ResultActions checkout(String authToken, String phone, String body, String key) throws Exception {
        String full = body.replace("}", ",'provider':'MTN_MOMO','phone':'%s'}".formatted(phone));
        return call(post("/v1/checkout").header("Idempotency-Key", key).content(json(full)), authToken);
    }

    private String paymentRef(String orderId) {
        UUID intentId = orders.findById(UUID.fromString(orderId)).orElseThrow().getPaymentIntentId();
        return intents.findById(intentId).orElseThrow().getProviderRef();
    }

    @Test
    @DisplayName("a phone is registered, forgotten, and its preferences round-trip")
    void tokensAndPrefs() throws Exception {
        String authToken = signIn(newPhone());
        registerPhone(authToken, "ExponentPushToken[round-trip]");

        // Everything is on for somebody who has never opened settings.
        call(get("/v1/me/notifications"), authToken)
                .andExpect(jsonPath("$.sales").value(true))
                .andExpect(jsonPath("$.gifts").value(true))
                .andExpect(jsonPath("$.payouts").value(true))
                .andExpect(jsonPath("$.releases").value(true));

        // One switch at a time: the others must not move with it.
        call(put("/v1/me/notifications").content(json("{'sales':false}")), authToken)
                .andExpect(jsonPath("$.sales").value(false))
                .andExpect(jsonPath("$.gifts").value(true));
        call(get("/v1/me/notifications"), authToken).andExpect(jsonPath("$.sales").value(false));

        call(delete("/v1/me/push-tokens").content(json("{'token':'ExponentPushToken[round-trip]'}")), authToken)
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("somebody else's token can't be silenced by knowing it")
    void unregisterIsScopedToTheOwner() throws Exception {
        String mine = signIn(newPhone());
        String theirs = signIn(newPhone());
        registerPhone(mine, "ExponentPushToken[mine]");

        call(delete("/v1/me/push-tokens").content(json("{'token':'ExponentPushToken[mine]'}")), theirs)
                .andExpect(status().isNoContent()); // quietly does nothing

        String artistPhone = newPhone();
        String artist = approvedArtist(artistPhone, uniqueName("Silencer"));
        String release = publishedSingle(artist, uniqueName("Still Here"), 2000L);
        assertThat(release).isNotBlank();

        // The token survived, so its owner still hears things.
        CapturedPushes.SENT.clear();
        call(put("/v1/me/notifications").content(json("{'sales':true}")), mine);
        registerPhone(mine, "ExponentPushToken[mine]"); // same row, not a second one
        assertThat(CapturedPushes.SENT).isEmpty();
    }

    @Test
    @DisplayName("a sale tells the artist what they earned, and names no buyer")
    void aSaleTellsTheArtist() throws Exception {
        String artistPhone = newPhone();
        String artist = approvedArtist(artistPhone, uniqueName("Seller"));
        String artistPush = "ExponentPushToken[seller]";
        registerPhone(artist, artistPush);

        String song = uniqueName("Ekyo Omukwano");
        String releaseId = publishedSingle(artist, song, 2000L);
        String trackId = JsonPath.read(call(get("/v1/artist/releases/" + releaseId), artist)
                .andReturn().getResponse().getContentAsString(), "$.tracks[0].id");

        // Publishing is its own notification; the sale is what this test is about.
        only(artistPush, Notification.Kind.RELEASE_LIVE);
        CapturedPushes.SENT.clear();

        String fanPhone = newPhone();
        String fan = signIn(fanPhone);
        String orderId = JsonPath.read(checkout(fan, fanPhone, "{'kind':'TRACK','id':'%s'}".formatted(trackId), newKey())
                .andReturn().getResponse().getContentAsString(), "$.id");
        webhook(paymentRef(orderId), "SUCCESSFUL").andExpect(status().isNoContent());

        Notification sale = only(artistPush, Notification.Kind.SALE).notification();
        assertThat(sale.title()).isEqualTo(song + " just sold");
        // 2,000 less the songwriter share and Deegee's cut: the same 1,440 the ledger posts.
        assertThat(sale.body()).isEqualTo("You earned 1,440 UGX");
        // The fan is not announced on anybody's lock screen.
        assertThat(sale.title() + sale.body()).doesNotContain(fanPhone);
    }

    @Test
    @DisplayName("switching sales off stops the notification but not the sale")
    void salesCanBeSwitchedOff() throws Exception {
        String artistPhone = newPhone();
        String artist = approvedArtist(artistPhone, uniqueName("Quiet"));
        String artistPush = "ExponentPushToken[quiet]";
        registerPhone(artist, artistPush);
        call(put("/v1/me/notifications").content(json("{'sales':false}")), artist).andExpect(status().isOk());

        String releaseId = publishedSingle(artist, uniqueName("Unheard"), 2000L);
        String trackId = JsonPath.read(call(get("/v1/artist/releases/" + releaseId), artist)
                .andReturn().getResponse().getContentAsString(), "$.tracks[0].id");
        CapturedPushes.SENT.clear();

        String fanPhone = newPhone();
        String fan = signIn(fanPhone);
        long before = ledger.balance(Ledger.artistEarningsId(JsonPath.read(
                call(get("/v1/artist/me"), artist).andReturn().getResponse().getContentAsString(), "$.id")));
        String orderId = JsonPath.read(checkout(fan, fanPhone, "{'kind':'TRACK','id':'%s'}".formatted(trackId), newKey())
                .andReturn().getResponse().getContentAsString(), "$.id");
        webhook(paymentRef(orderId), "SUCCESSFUL").andExpect(status().isNoContent());

        assertThat(to(artistPush)).isEmpty();
        // The money still moved: a switched-off notification is not a switched-off sale.
        String artistId = JsonPath.read(call(get("/v1/artist/me"), artist).andReturn().getResponse().getContentAsString(), "$.id");
        assertThat(ledger.balance(Ledger.artistEarningsId(artistId)) - before).isEqualTo(1440);
    }

    @Test
    @DisplayName("a payout number change reaches the artist even with everything switched off")
    void payoutChangeCannotBeSwitchedOff() throws Exception {
        String artistPhone = newPhone();
        String artist = approvedArtist(artistPhone, uniqueName("Hijacked"));
        String artistPush = "ExponentPushToken[hijacked]";
        registerPhone(artist, artistPush);
        call(put("/v1/me/notifications").content(json("{'sales':false,'gifts':false,'payouts':false,'releases':false}")), artist)
                .andExpect(status().isOk());
        CapturedPushes.SENT.clear();

        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/v1/artist/profile")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(json("{'name':'Hijacked','city':'Kampala','bio':'Still me.','genres':['Afrobeat'],'payoutPhone':'0772999888'}")), artist)
                .andExpect(status().isOk());

        Notification warned = only(artistPush, Notification.Kind.PAYOUT_NUMBER_CHANGED).notification();
        assertThat(warned.title()).isEqualTo("Your payout number was changed");
        assertThat(warned.body()).contains("256772999888");
    }

    @Test
    @DisplayName("saving the profile without touching the number warns nobody")
    void anUnchangedNumberIsNotNews() throws Exception {
        String artistPhone = newPhone();
        String artist = approvedArtist(artistPhone, uniqueName("Same"));
        String artistPush = "ExponentPushToken[same]";
        registerPhone(artist, artistPush);

        String current = JsonPath.read(call(get("/v1/artist/me"), artist).andReturn().getResponse().getContentAsString(), "$.payoutPhone");
        CapturedPushes.SENT.clear();

        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/v1/artist/profile")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(json("{'name':'Same','city':'Mbarara','bio':'Moved house, same number.','genres':['Afrobeat'],'payoutPhone':'%s'}", current)), artist)
                .andExpect(status().isOk());

        assertThat(to(artistPush)).isEmpty();
    }
}
