package app.deegee.api.payouts;

import java.util.UUID;

/**
 * A withdrawal stopped being in flight: either the provider paid it, or the money went back to the
 * artist's earnings (declined by the provider, or rejected in review).
 */
public record WithdrawalSettled(UUID withdrawalId, boolean paid) {}
