package app.deegee.api.auth;

import app.deegee.api.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/me")
class MeController {

    record UpdateMe(@NotBlank @Size(max = 40) String name) {}

    private final UserRepository users;

    MeController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    AuthController.UserView me(@AuthenticationPrincipal Jwt jwt) {
        return AuthController.UserView.of(load(jwt));
    }

    @PatchMapping
    @Transactional
    AuthController.UserView update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateMe req) {
        User user = load(jwt);
        user.setName(req.name().trim());
        return AuthController.UserView.of(user);
    }

    private User load(Jwt jwt) {
        return users.findById(UUID.fromString(jwt.getSubject())).orElseThrow(() -> ApiException.notFound("User"));
    }
}
