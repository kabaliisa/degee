package app.deegee.api.notify;

import app.deegee.api.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Registering a phone for notifications, and choosing which ones to get. */
@RestController
class NotifyController {

    record RegisterRequest(@NotBlank @Size(max = 255) String token, @Size(max = 32) String platform) {}

    record UnregisterRequest(@NotBlank @Size(max = 255) String token) {}

    /** Null means "leave this one alone", so the app can send just the switch that moved. */
    record PrefsRequest(Boolean sales, Boolean gifts, Boolean payouts, Boolean releases) {}

    record PrefsView(boolean sales, boolean gifts, boolean payouts, boolean releases) {
        static PrefsView of(NotificationPrefs p) {
            return new PrefsView(p.sales(), p.gifts(), p.payouts(), p.releases());
        }
    }

    private final Notifier notifier;

    NotifyController(Notifier notifier) {
        this.notifier = notifier;
    }

    @PostMapping("/v1/me/push-tokens")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void register(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RegisterRequest body) {
        notifier.register(CurrentUser.id(jwt), body.token(), body.platform());
    }

    @DeleteMapping("/v1/me/push-tokens")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unregister(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UnregisterRequest body) {
        notifier.unregister(CurrentUser.id(jwt), body.token());
    }

    @GetMapping("/v1/me/notifications")
    PrefsView prefs(@AuthenticationPrincipal Jwt jwt) {
        return PrefsView.of(notifier.prefsFor(CurrentUser.id(jwt)));
    }

    @PutMapping("/v1/me/notifications")
    PrefsView update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PrefsRequest body) {
        return PrefsView.of(notifier.update(CurrentUser.id(jwt), body.sales(), body.gifts(), body.payouts(), body.releases()));
    }
}
