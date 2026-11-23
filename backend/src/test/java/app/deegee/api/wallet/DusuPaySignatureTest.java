package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The webhook signature is the only thing between Deegee and anyone who can POST to a public URL,
 * so it gets tested on its own rather than only through the endpoint.
 */
class DusuPaySignatureTest {

    private static final String KEY = "SGNKYUEMYFDEHRWGPEUG";
    private static final String EVENT = "transaction.completed";
    private static final String MERCHANT_REF = "MCTREFT2WMNWZ23SBN6Y";
    private static final String INTERNAL_REF = "DUSUPAYRMGRXNNYBWATKJ";
    private static final String TYPE = "COLLECTION";
    private static final String STATUS = "COMPLETED";

    /** The five colon-joined fields DusuPay documents, in their order. */
    private static final String PAYLOAD = "transaction.completed:MCTREFT2WMNWZ23SBN6Y:DUSUPAYRMGRXNNYBWATKJ:COLLECTION:COMPLETED";

    private static byte[] mac(byte[] key, String payload) throws Exception {
        Mac m = Mac.getInstance("HmacSHA256");
        m.init(new SecretKeySpec(key, "HmacSHA256"));
        return m.doFinal(payload.getBytes(StandardCharsets.UTF_8));
    }

    private static DusuPaySignature.Match verify(String header) {
        return DusuPaySignature.verify(header, KEY, EVENT, MERCHANT_REF, INTERNAL_REF, TYPE, STATUS);
    }

    @Test
    @DisplayName("signs exactly the five documented fields, joined by colons")
    void signsTheDocumentedString() throws Exception {
        String hex = HexFormat.of().formatHex(mac(KEY.getBytes(StandardCharsets.UTF_8), PAYLOAD));
        assertThat(verify("t=1720633393293,s=" + hex).valid()).isTrue();
    }

    @Test
    @DisplayName("accepts all four encodings their own samples disagree about, and says which matched")
    void acceptsEitherEncoding() throws Exception {
        byte[] raw = KEY.getBytes(StandardCharsets.UTF_8);
        String hex = HexFormat.of().formatHex(mac(raw, PAYLOAD));
        String b64 = Base64.getEncoder().encodeToString(mac(raw, PAYLOAD));

        assertThat(verify("t=1,s=" + hex).form()).isEqualTo("hex/raw-key");
        assertThat(verify("t=1,s=" + b64).form()).isEqualTo("base64/raw-key");
        // If the key turns out to be Base64 of the real bytes, that works too -- which is the point
        // of trying all four, because guessing wrong means every payment silently fails.
        byte[] decoded = Base64.getDecoder().decode(KEY);
        assertThat(verify("t=1,s=" + HexFormat.of().formatHex(mac(decoded, PAYLOAD))).form())
                .isEqualTo("hex/decoded-key");
    }

    @Test
    @DisplayName("a wrong key, a tampered field or a missing header is not a signature")
    void refusesEverythingElse() throws Exception {
        String wrongKey = HexFormat.of().formatHex(mac("not-the-key".getBytes(StandardCharsets.UTF_8), PAYLOAD));
        assertThat(verify("t=1,s=" + wrongKey).valid()).isFalse();

        // The attack this exists to stop: a real webhook for someone else's order, re-pointed at mine.
        String otherOrder = HexFormat.of().formatHex(mac(KEY.getBytes(StandardCharsets.UTF_8),
                "transaction.completed:SOMEONE-ELSES-REF:" + INTERNAL_REF + ":COLLECTION:COMPLETED"));
        assertThat(verify("t=1,s=" + otherOrder).valid()).isFalse();

        // And the cheapest attack of all: claim success with no signature at all.
        assertThat(verify(null).valid()).isFalse();
        assertThat(verify("t=1").valid()).isFalse();
        assertThat(verify("garbage").valid()).isFalse();
        assertThat(DusuPaySignature.verify("t=1,s=x", "", EVENT, MERCHANT_REF, INTERNAL_REF, TYPE, STATUS).valid())
                .as("an unconfigured signing key must never accept anything")
                .isFalse();
    }

    @Test
    @DisplayName("reads the timestamp out of the header, and tolerates it being absent")
    void readsTimestamp() {
        assertThat(DusuPaySignature.timestampOf("t=1720633393293,s=abc")).isEqualTo(1720633393293L);
        assertThat(DusuPaySignature.timestampOf("s=abc")).isEqualTo(-1);
        assertThat(DusuPaySignature.timestampOf("t=notanumber,s=abc")).isEqualTo(-1);
    }
}
