package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AuthApiTest extends ApiTestSupport {

    @Test
    void firstSignInCreatesUserWithEmptyWallet() throws Exception {
        String phone = newPhone();
        String session = signInJson(phone);
        assertThat((Boolean) JsonPath.read(session, "$.isNewUser")).isTrue();
        assertThat((String) JsonPath.read(session, "$.user.phone")).isEqualTo(phone);

        String token = JsonPath.read(session, "$.accessToken");
        assertThat(walletBalance(token)).isZero();

        assertThat((Boolean) JsonPath.read(signInJson(phone), "$.isNewUser")).isFalse();
    }

    @Test
    void acceptsLocalNumberFormats() throws Exception {
        mvc.perform(post("/v1/auth/otp").contentType(MediaType.APPLICATION_JSON).content(json("{'phone':'0772 123 456'}")))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.phone").value("+256772123456"));
        mvc.perform(post("/v1/auth/otp").contentType(MediaType.APPLICATION_JSON).content(json("{'phone':'0412 345678'}")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PHONE"));
    }

    @Test
    void wrongCodesAreLimited() throws Exception {
        String phone = newPhone();
        String code = requestCode(phone);
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/v1/auth/verify").contentType(MediaType.APPLICATION_JSON).content(json("{'phone':'%s','code':'%s'}", phone, wrong)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("WRONG_CODE"));
        }
        // After five wrong tries the code is dead, even the right one.
        mvc.perform(post("/v1/auth/verify").contentType(MediaType.APPLICATION_JSON).content(json("{'phone':'%s','code':'%s'}", phone, code)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
    }

    @Test
    void tooManyCodeRequestsAreRefused() throws Exception {
        String phone = newPhone();
        for (int i = 0; i < 5; i++) requestCode(phone);
        mvc.perform(post("/v1/auth/otp").contentType(MediaType.APPLICATION_JSON).content(json("{'phone':'%s'}", phone)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("TOO_MANY_CODES"));
    }

    @Test
    void refreshTokensRotateAndReuseSignsOutEverywhere() throws Exception {
        String session = signInJson(newPhone());
        String first = JsonPath.read(session, "$.refreshToken");

        String rotated = mvc.perform(post("/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(json("{'refreshToken':'%s'}", first)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String second = JsonPath.read(rotated, "$.refreshToken");
        assertThat(second).isNotEqualTo(first);

        // Replaying the old token means it was copied: it fails and the new one is revoked too.
        mvc.perform(post("/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(json("{'refreshToken':'%s'}", first)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(json("{'refreshToken':'%s'}", second)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void privateEndpointsNeedATokenButTheCatalogueIsPublic() throws Exception {
        mvc.perform(get("/v1/wallet")).andExpect(status().isUnauthorized());
        mvc.perform(get("/v1/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/v1/catalog/releases")).andExpect(status().isOk());
        mvc.perform(get("/v1/wallet").header("Authorization", "Bearer not-a-real-token")).andExpect(status().isUnauthorized());
    }

    @Test
    void userCanSetTheirName() throws Exception {
        String token = signIn(newPhone());
        call(patch("/v1/me").content(json("{'name':'  Solomon  '}")), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Solomon"));
    }
}
