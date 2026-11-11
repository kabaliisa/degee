package app.deegee.api.wallet;

import java.time.Instant;
import java.util.UUID;

/** One movement on a user's wallet, newest first in history. {@code amountUgx} is negative for money out. */
public record WalletLine(UUID transactionId, LedgerTransaction.Type type, long amountUgx, String description, String reference, Instant createdAt) {}
