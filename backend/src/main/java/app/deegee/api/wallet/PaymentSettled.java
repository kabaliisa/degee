package app.deegee.api.wallet;

import java.util.UUID;

/** A mobile money payment got its answer (approved or not). Published in the transaction that records it. */
public record PaymentSettled(UUID paymentIntentId) {}
