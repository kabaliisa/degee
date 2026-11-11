package app.deegee.api.wallet;

import app.deegee.api.common.ApiException;
import app.deegee.api.common.Hashing;
import app.deegee.api.wallet.MobileMoneyGateway.CollectionResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Where the mobile money provider reports payment results. Public, so every call is checked against
 * a shared-secret signature. A real provider will have its own payload and signature scheme; it gets
 * its own endpoint that turns the payload into the same {@link CollectionResult}.
 */
@RestController
@RequestMapping("/v1/webhooks")
class WebhookController {

    static final String SIGNATURE_HEADER = "X-Deegee-Signature";

    record MockResult(@NotBlank String providerRef, @NotBlank @Pattern(regexp = "SUCCESSFUL|FAILED") String status) {}

    private final TopUpService topUps;
    private final PaymentsProperties props;

    WebhookController(TopUpService topUps, PaymentsProperties props) {
        this.topUps = topUps;
        this.props = props;
    }

    /** Signature: HMAC-SHA256 of "{providerRef}:{status}" with the webhook secret, as hex. */
    @PostMapping("/mock-mobile-money")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void mockResult(@RequestHeader(SIGNATURE_HEADER) String signature, @Valid @RequestBody MockResult body) {
        String expected = sign(props.webhookSecret(), body.providerRef(), body.status());
        if (!Hashing.constantTimeEquals(expected, signature)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "BAD_SIGNATURE", "Webhook signature does not match.");
        }
        topUps.onCollectionResult(new CollectionResult(body.providerRef(), "SUCCESSFUL".equals(body.status())));
    }

    static String sign(String secret, String providerRef, String status) {
        return Hashing.hmacHex(secret, providerRef + ":" + status);
    }
}
