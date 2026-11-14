package app.deegee.api.wallet;

import static app.deegee.api.common.CurrentUser.requireIdempotencyKey;

import app.deegee.api.auth.PhoneNumbers.Provider;
import app.deegee.api.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Pay for a song, a release or a gift with one mobile money prompt. */
@RestController
class CheckoutController {

    /**
     * @param kind      TRACK, RELEASE or GIFT
     * @param id        the song, the release, or (for a gift) the artist
     * @param amountUgx the size of a gift; music has its own price
     * @param provider  and {@code phone}: where the PIN prompt goes. May be left out when credit covers the price.
     */
    record CheckoutRequest(@NotNull CheckoutOrder.Kind kind, @NotBlank String id, @Positive Long amountUgx, @Size(max = 140) String note,
                           Provider provider, String phone) {}

    /**
     * {@code status}: WAITING (approve the prompt on your phone), COMPLETED, DECLINED (not approved, nothing
     * charged) or CREDITED (paid, couldn't be completed, money kept as credit: see {@code failureCode}).
     * {@code collectUgx}: what the phone was asked for; 0 when credit covered it. {@code trackIds}: the songs
     * now owned. {@code creditUgx}: Deegee credit left afterwards.
     */
    record OrderView(UUID id, CheckoutOrder.Status status, CheckoutOrder.Kind kind, String itemId, long amountUgx, long collectUgx,
                     List<String> trackIds, String failureCode, String failureMessage, long creditUgx) {}

    private final CheckoutService checkout;
    private final PurchaseService purchases;
    private final Ledger ledger;

    CheckoutController(CheckoutService checkout, PurchaseService purchases, Ledger ledger) {
        this.checkout = checkout;
        this.purchases = purchases;
        this.ledger = ledger;
    }

    /** Starts a checkout. While it is WAITING, poll GET /v1/checkout/{id}. */
    @PostMapping("/v1/checkout")
    @ResponseStatus(HttpStatus.ACCEPTED)
    OrderView start(@AuthenticationPrincipal Jwt jwt, @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody CheckoutRequest req) {
        UUID userId = CurrentUser.id(jwt);
        return view(checkout.start(userId, req.kind(), req.id(), req.amountUgx(), req.note(), req.provider(), req.phone(),
                requireIdempotencyKey(key)), userId);
    }

    @GetMapping("/v1/checkout/{id}")
    OrderView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID userId = CurrentUser.id(jwt);
        return view(checkout.get(userId, id), userId);
    }

    private OrderView view(CheckoutOrder o, UUID userId) {
        boolean music = o.getKind() != CheckoutOrder.Kind.GIFT;
        List<String> trackIds = music && o.getTransactionId() != null ? purchases.trackIdsFrom(o.getTransactionId()) : List.of();
        return new OrderView(o.getId(), o.getStatus(), o.getKind(), o.getItemId(), o.getAmountUgx(), o.getCollectUgx(), trackIds,
                o.getFailureCode(), o.getFailureMessage(), ledger.balance(Ledger.walletId(userId)));
    }
}
