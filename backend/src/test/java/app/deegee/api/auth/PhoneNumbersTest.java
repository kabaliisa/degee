package app.deegee.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import app.deegee.api.auth.PhoneNumbers.Provider;
import org.junit.jupiter.api.Test;

/** Same cases as the app's src/lib/phone.test.ts. */
class PhoneNumbersTest {

    @Test
    void normalizesUgandanMobileNumbers() {
        assertThat(PhoneNumbers.normalize("0772 123456")).contains("+256772123456");
        assertThat(PhoneNumbers.normalize("+256 701 234 567")).contains("+256701234567");
        assertThat(PhoneNumbers.normalize("256751234567")).contains("+256751234567");
        assertThat(PhoneNumbers.normalize("0412 345678")).isEmpty(); // landline
        assertThat(PhoneNumbers.normalize("077212")).isEmpty();
        assertThat(PhoneNumbers.normalize(null)).isEmpty();
    }

    @Test
    void guessesProviderFromPrefix() {
        assertThat(PhoneNumbers.provider("+256772123456")).contains(Provider.MTN_MOMO);
        assertThat(PhoneNumbers.provider("+256701234567")).contains(Provider.AIRTEL_MONEY);
        assertThat(PhoneNumbers.provider("+256791234567")).isEmpty();
    }
}
