package app.deegee.api.wallet;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Checks that a webhook really came from DusuPay.
 *
 * <p>This is the only thing standing between Deegee and anyone who can POST to a public URL. Without
 * it, a stranger could announce that a payment succeeded and walk away with a song, or with an
 * artist's catalogue.
 *
 * <p>The signature covers five fields joined by colons, not the request body:
 * {@code event:merchant_reference:internal_reference:transaction_type:transaction_status}. That
 * means a forger would have to guess Deegee's own reference, which is a UUID, so replaying a real
 * webhook for a different order is not possible.
 *
 * <p><strong>Why this accepts four encodings.</strong> DusuPay's own documentation does not say
 * how the hash is encoded, and its samples disagree: PHP, Node and Python compare a hex digest
 * while Java, C# and Ruby compare Base64, and the Java and C# samples Base64-decode the signing key
 * before use where the others treat it as raw text. Picking one and guessing wrong means every
 * payment silently fails to complete. So all four combinations are computed and compared, and the
 * one that matched is reported, so the first real webhook settles the question. This widens nothing:
 * an attacker still has to produce a correct HMAC under the signing key, and four chances to do
 * that are no easier than one.
 */
final class DusuPaySignature {

    /** Which spelling of the signature matched, so the ambiguity above can be resolved from a log line. */
    record Match(boolean valid, String form) {
        static final Match NONE = new Match(false, "none");
    }

    private DusuPaySignature() {}

    /**
     * @param header the {@code hmac-signature} header, of the form {@code t=<millis>,s=<hash>}
     */
    static Match verify(String header, String signingKey, String event, String merchantRef,
                        String internalRef, String transactionType, String status) {
        if (header == null || signingKey == null || signingKey.isBlank()) return Match.NONE;
        String given = valueOf(header, "s");
        if (given == null) return Match.NONE;

        String payload = String.join(":", event, merchantRef, internalRef, transactionType, status);
        for (String form : List.of("hex/raw-key", "base64/raw-key", "hex/decoded-key", "base64/decoded-key")) {
            byte[] key = form.endsWith("decoded-key") ? decodeKey(signingKey) : signingKey.getBytes(StandardCharsets.UTF_8);
            if (key == null) continue;
            byte[] mac = hmac(key, payload);
            if (mac == null) continue;
            String expected = form.startsWith("hex") ? HexFormat.of().formatHex(mac) : Base64.getEncoder().encodeToString(mac);
            // Constant time: a comparison that returns early leaks how much of the hash was right,
            // one byte at a time, to anyone willing to send enough webhooks.
            if (MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), given.getBytes(StandardCharsets.UTF_8))) {
                return new Match(true, form);
            }
        }
        return Match.NONE;
    }

    /** The timestamp DusuPay signed with, in epoch millis, or -1 if the header does not carry one. */
    static long timestampOf(String header) {
        String t = valueOf(header, "t");
        try {
            return t == null ? -1 : Long.parseLong(t);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private static String valueOf(String header, String name) {
        for (String part : header.split(",")) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length == 2 && kv[0].trim().equals(name)) return kv[1].trim();
        }
        return null;
    }

    private static byte[] decodeKey(String key) {
        try {
            return Base64.getDecoder().decode(key);
        } catch (IllegalArgumentException e) {
            return null; // not Base64, so that pair of forms simply does not apply
        }
    }

    private static byte[] hmac(byte[] key, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return null;
        }
    }
}
