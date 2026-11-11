package app.deegee.api.auth;

import java.util.Optional;
import java.util.Set;

/** Ugandan mobile numbers. Mirrors src/lib/phone.ts in the app. */
public final class PhoneNumbers {

    public enum Provider { MTN_MOMO, AIRTEL_MONEY }

    private static final Set<String> MTN = Set.of("76", "77", "78");
    private static final Set<String> AIRTEL = Set.of("70", "74", "75");

    private PhoneNumbers() {}

    /** "0772 123456", "+256 772 123456" or "256772123456" → "+256772123456". Empty if not a Ugandan mobile. */
    public static Optional<String> normalize(String input) {
        if (input == null) return Optional.empty();
        String digits = input.replaceAll("\\D", "");
        String local;
        if (digits.startsWith("256")) local = digits.substring(3);
        else if (digits.startsWith("0")) local = digits.substring(1);
        else local = digits;
        return local.matches("7\\d{8}") ? Optional.of("+256" + local) : Optional.empty();
    }

    /** Network for a normalized number, if it's one we can charge. */
    public static Optional<Provider> provider(String e164) {
        if (e164 == null || e164.length() < 6) return Optional.empty();
        String prefix = e164.substring(4, 6);
        if (MTN.contains(prefix)) return Optional.of(Provider.MTN_MOMO);
        if (AIRTEL.contains(prefix)) return Optional.of(Provider.AIRTEL_MONEY);
        return Optional.empty();
    }
}
