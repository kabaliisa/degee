package app.deegee.api.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
class AuthController {

    record CodeRequest(@NotBlank String phone) {}

    record VerifyRequest(@NotBlank String phone, @NotBlank @Size(min = 4, max = 8) String code) {}

    record RefreshRequest(@NotBlank String refreshToken) {}

    /** {@code roles}: e.g. ["ADMIN"]; empty for most users. */
    record UserView(UUID id, String phone, String name, List<String> roles) {
        static UserView of(User u, List<String> roles) { return new UserView(u.getId(), u.getPhone(), u.getName(), roles); }
    }

    record SessionView(String accessToken, long expiresInSec, String refreshToken, UserView user, boolean isNewUser) {}

    record TokensView(String accessToken, long expiresInSec, String refreshToken) {}

    private final OtpService otp;
    private final TokenService tokens;
    private final Roles roles;

    AuthController(OtpService otp, TokenService tokens, Roles roles) {
        this.otp = otp;
        this.tokens = tokens;
        this.roles = roles;
    }

    /** Sends a 6-digit code by SMS (logged in development). */
    @PostMapping("/otp")
    @ResponseStatus(HttpStatus.ACCEPTED)
    OtpService.CodeSent requestCode(@Valid @RequestBody CodeRequest req) {
        return otp.requestCode(req.phone());
    }

    @PostMapping("/verify")
    SessionView verify(@Valid @RequestBody VerifyRequest req) {
        OtpService.SignedIn s = otp.verify(req.phone(), req.code());
        return new SessionView(s.tokens().accessToken(), s.tokens().expiresInSec(), s.tokens().refreshToken(), UserView.of(s.user(), roles.of(s.user().getId())), s.isNewUser());
    }

    @PostMapping("/refresh")
    TokensView refresh(@Valid @RequestBody RefreshRequest req) {
        TokenService.Tokens t = tokens.rotate(req.refreshToken());
        return new TokensView(t.accessToken(), t.expiresInSec(), t.refreshToken());
    }
}
