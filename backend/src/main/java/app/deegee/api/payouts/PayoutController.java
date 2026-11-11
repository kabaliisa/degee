package app.deegee.api.payouts;

import static app.deegee.api.common.CurrentUser.requireIdempotencyKey;

import app.deegee.api.common.CurrentUser;
import app.deegee.api.payouts.PayoutService.Earnings;
import app.deegee.api.payouts.PayoutService.WithdrawalView;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class PayoutController {

    record WithdrawRequest(long amountUgx) {}

    private final PayoutService payouts;

    PayoutController(PayoutService payouts) {
        this.payouts = payouts;
    }

    @GetMapping("/v1/artist/earnings")
    Earnings earnings(@AuthenticationPrincipal Jwt jwt) {
        return payouts.earnings(CurrentUser.id(jwt));
    }

    /** Sends the money to the artist's payout number. Needs an Idempotency-Key header. */
    @PostMapping("/v1/artist/withdrawals")
    @ResponseStatus(HttpStatus.CREATED)
    WithdrawalView withdraw(@AuthenticationPrincipal Jwt jwt, @RequestHeader("Idempotency-Key") String key, @RequestBody WithdrawRequest req) {
        return payouts.withdraw(CurrentUser.id(jwt), req.amountUgx(), requireIdempotencyKey(key));
    }
}
