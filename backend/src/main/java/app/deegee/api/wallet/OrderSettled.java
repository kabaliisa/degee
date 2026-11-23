package app.deegee.api.wallet;

import java.util.UUID;

/**
 * A checkout order reached its end: delivered, declined, or paid but undeliverable. Published after
 * the order's own transaction commits, so a listener can tell somebody about it without being able to
 * roll the money back.
 */
public record OrderSettled(UUID orderId) {}
