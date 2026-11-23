package app.deegee.api.wallet;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Credentials and endpoint for DusuPay, the mobile money aggregator.
 *
 * @param baseUrl    sandboxapi.dusupay.com while testing, api.dusupay.com for real money
 * @param publicKey  sent as the public-key header on every request
 * @param secretKey  sent as the secret-key header; never leaves the server
 * @param signingKey what webhook signatures are keyed with. From the merchant dashboard, and a
 *                   different value from the two above: a leaked public key costs nothing, a
 *                   leaked signing key lets anyone tell Deegee a payment succeeded.
 * @param chargeCustomer who pays DusuPay's cut. True means it is added to what the buyer is
 *                       charged, which is the processing-fee model Deegee's prices are built
 *                       around; false means Deegee absorbs it out of its own 20%. If this is ever
 *                       turned off, take the "mobile money adds its own charge" line out of the
 *                       checkout screen too, or the app will be warning about a fee nobody pays.
 */
@ConfigurationProperties("deegee.payments.dusupay")
public record DusuPayProperties(String baseUrl, String publicKey, String secretKey, String signingKey,
                                boolean chargeCustomer) {}
