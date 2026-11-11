package app.deegee.api.wallet;

import static app.deegee.api.common.CurrentUser.requireIdempotencyKey;

import app.deegee.api.auth.PhoneNumbers.Provider;
import app.deegee.api.common.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
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

/** Wallet, top-ups, purchases, gifts and the user's library. Every money action needs an Idempotency-Key header. */
@RestController
class WalletController {

    private static final String IDEMPOTENCY_KEY = "Idempotency-Key";
    private static final int HISTORY_LIMIT = 50;

    record TopUpRequest(@Positive long amountUgx, @NotNull Provider provider, @NotBlank String phone) {}

    record TopUpView(UUID id, PaymentIntent.Status status, long amountUgx, Provider provider, String msisdn, Instant createdAt) {
        static TopUpView of(PaymentIntent p) {
            return new TopUpView(p.getId(), p.getStatus(), p.getAmountUgx(), p.getProvider(), p.getMsisdn(), p.getCreatedAt());
        }
    }

    record PurchaseRequest(@NotNull PurchaseService.ItemKind kind, @NotBlank String id) {}

    record GiftRequest(@NotBlank String artistId, @Positive long amountUgx, @Size(max = 140) String note) {}

    /** One row of wallet activity. Pending and failed top-ups appear too, so the app can show "waiting for your PIN". */
    record ActivityItem(String id, String type, String status, long amountUgx, String description, String note, Provider provider, Instant at) {}

    record WalletView(long balanceUgx, List<ActivityItem> activity) {}

    record LibraryView(List<String> trackIds) {}

    private final Ledger ledger;
    private final TopUpService topUps;
    private final PurchaseService purchases;
    private final GiftService giftService;
    private final GiftRepository gifts;

    WalletController(Ledger ledger, TopUpService topUps, PurchaseService purchases, GiftService giftService, GiftRepository gifts) {
        this.ledger = ledger;
        this.topUps = topUps;
        this.purchases = purchases;
        this.giftService = giftService;
        this.gifts = gifts;
    }

    @GetMapping("/v1/wallet")
    WalletView wallet(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = CurrentUser.id(jwt);
        List<WalletLine> lines = ledger.walletHistory(userId, HISTORY_LIMIT);
        List<PaymentIntent> intents = topUps.recent(userId);
        Map<UUID, PaymentIntent> intentByTx = intents.stream()
                .filter(i -> i.getTransactionId() != null)
                .collect(Collectors.toMap(PaymentIntent::getTransactionId, Function.identity()));
        Map<UUID, Gift> giftByTx = gifts.findByTransactionIdIn(lines.stream().map(WalletLine::transactionId).toList()).stream()
                .collect(Collectors.toMap(Gift::getTransactionId, Function.identity()));

        List<ActivityItem> activity = new ArrayList<>();
        for (WalletLine l : lines) {
            PaymentIntent intent = intentByTx.get(l.transactionId());
            Gift gift = giftByTx.get(l.transactionId());
            activity.add(new ActivityItem(l.transactionId().toString(), l.type().name(), "COMPLETED", l.amountUgx(), l.description(),
                    gift == null ? null : gift.getNote(), intent == null ? null : intent.getProvider(), l.createdAt()));
        }
        intents.stream()
                .filter(i -> i.getStatus() != PaymentIntent.Status.COMPLETED)
                .forEach(i -> activity.add(new ActivityItem(i.getId().toString(), "TOPUP", i.getStatus().name(), i.getAmountUgx(),
                        "Added money", null, i.getProvider(), i.getCreatedAt())));
        activity.sort(Comparator.comparing(ActivityItem::at).reversed());

        return new WalletView(ledger.balance(Ledger.walletId(userId)), activity.subList(0, Math.min(activity.size(), HISTORY_LIMIT)));
    }

    /** Sends a PIN prompt to the phone. Poll GET /v1/wallet/topups/{id} until it is COMPLETED or FAILED. */
    @PostMapping("/v1/wallet/topups")
    @ResponseStatus(HttpStatus.ACCEPTED)
    TopUpView startTopUp(@AuthenticationPrincipal Jwt jwt, @RequestHeader(IDEMPOTENCY_KEY) String key, @Valid @RequestBody TopUpRequest req) {
        return TopUpView.of(topUps.start(CurrentUser.id(jwt), req.amountUgx(), req.provider(), req.phone(), requireIdempotencyKey(key)));
    }

    @GetMapping("/v1/wallet/topups/{id}")
    TopUpView topUp(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return TopUpView.of(topUps.get(CurrentUser.id(jwt), id));
    }

    @PostMapping("/v1/purchases")
    @ResponseStatus(HttpStatus.CREATED)
    PurchaseService.Result buy(@AuthenticationPrincipal Jwt jwt, @RequestHeader(IDEMPOTENCY_KEY) String key, @Valid @RequestBody PurchaseRequest req) {
        return purchases.buy(CurrentUser.id(jwt), req.kind(), req.id(), requireIdempotencyKey(key));
    }

    @PostMapping("/v1/gifts")
    @ResponseStatus(HttpStatus.CREATED)
    GiftService.Result gift(@AuthenticationPrincipal Jwt jwt, @RequestHeader(IDEMPOTENCY_KEY) String key, @Valid @RequestBody GiftRequest req) {
        return giftService.send(CurrentUser.id(jwt), req.artistId(), req.amountUgx(), req.note(), requireIdempotencyKey(key));
    }

    @GetMapping("/v1/me/library")
    LibraryView library(@AuthenticationPrincipal Jwt jwt) {
        return new LibraryView(purchases.library(CurrentUser.id(jwt)));
    }
}
