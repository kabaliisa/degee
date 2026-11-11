package app.deegee.api.common;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Small crypto helpers. Secrets are never stored; only keyed hashes of them. */
public final class Hashing {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Hashing() {}

    /** HMAC-SHA256 of {@code value} under {@code key}, as lowercase hex. */
    public static String hmacHex(String key, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }

    /** Constant-time comparison, so response timing doesn't leak how much of a hash matched. */
    public static boolean constantTimeEquals(String a, String b) {
        return java.security.MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    /** A URL-safe random token with {@code bytes} bytes of entropy. */
    public static String randomToken(int bytes) {
        byte[] buf = new byte[bytes];
        RANDOM.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    /** A random numeric code of {@code digits} digits, e.g. "048213". */
    public static String randomDigits(int digits) {
        StringBuilder sb = new StringBuilder(digits);
        for (int i = 0; i < digits; i++) sb.append(RANDOM.nextInt(10));
        return sb.toString();
    }

    private static final String ID_CHARS = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o or 1/l, for ids people may read out

    /** A short random id such as {@code ar7kq2m9xw4p}, for new artists, releases and songs. */
    public static String randomId(String prefix) {
        StringBuilder id = new StringBuilder(prefix);
        for (int i = 0; i < 10; i++) id.append(ID_CHARS.charAt(RANDOM.nextInt(ID_CHARS.length())));
        return id.toString();
    }
}
