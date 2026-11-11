package app.deegee.api.admin;

import app.deegee.api.auth.Roles;
import app.deegee.api.common.CurrentUser;
import app.deegee.api.payouts.PayoutService;
import app.deegee.api.payouts.PayoutService.PendingWithdrawal;
import app.deegee.api.studio.ReviewService;
import app.deegee.api.studio.ReviewService.PendingArtist;
import app.deegee.api.studio.ReviewService.PendingRelease;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Deegee staff: everything waiting for a decision, and the decisions. Admin role only. */
@RestController
@RequestMapping("/v1/admin")
class AdminController {

    record Queue(List<PendingArtist> artists, List<PendingRelease> releases, List<PendingWithdrawal> withdrawals) {}

    record Note(String note) {}

    private final Roles roles;
    private final ReviewService reviews;
    private final PayoutService payouts;

    AdminController(Roles roles, ReviewService reviews, PayoutService payouts) {
        this.roles = roles;
        this.reviews = reviews;
        this.payouts = payouts;
    }

    @GetMapping("/queue")
    Queue queue(@AuthenticationPrincipal Jwt jwt) {
        admin(jwt);
        return new Queue(reviews.pendingArtists(), reviews.pendingReleases(), payouts.pending());
    }

    @PostMapping("/artists/{id}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void approveArtist(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        admin(jwt);
        reviews.approveArtist(id);
    }

    @PostMapping("/artists/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void rejectArtist(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody Note body) {
        admin(jwt);
        reviews.rejectArtist(id, body.note());
    }

    @PostMapping("/releases/{id}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void approveRelease(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        admin(jwt);
        reviews.approveRelease(id);
    }

    @PostMapping("/releases/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void rejectRelease(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody Note body) {
        admin(jwt);
        reviews.rejectRelease(id, body.note());
    }

    @PostMapping("/withdrawals/{id}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void approveWithdrawal(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        admin(jwt);
        payouts.approve(id);
    }

    @PostMapping("/withdrawals/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void rejectWithdrawal(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Note body) {
        admin(jwt);
        payouts.reject(id, body.note());
    }

    private void admin(Jwt jwt) {
        roles.requireAdmin(CurrentUser.id(jwt));
    }
}
