package app.deegee.api.wallet;

/**
 * A mobile money provider (an aggregator such as Flutterwave or Pesapal in production).
 * Requesting a collection makes the provider send a PIN prompt to the user's phone; the outcome
 * arrives later through a signed webhook, never through the app.
 */
public interface MobileMoneyGateway {

    /** Asks the provider to collect {@code intent.amountUgx} from {@code intent.msisdn}. */
    void requestCollection(PaymentIntent intent);

    /** The provider's answer, delivered by webhook (or, in development, by the mock). */
    record CollectionResult(String providerRef, boolean approved) {}
}
