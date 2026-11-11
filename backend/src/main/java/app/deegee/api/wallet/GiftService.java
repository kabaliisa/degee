package app.deegee.api.wallet;

import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.common.ApiException;
import app.deegee.api.wallet.LedgerAccount.Kind;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Fans sending artists a thank-you from their wallet. */
@Service
public class GiftService {

    public record Result(UUID transactionId, long amountUgx, long artistReceivesUgx, long balanceUgx) {}

    private static final int MAX_NOTE = 140;

    private final ArtistRepository artists;
    private final GiftRepository gifts;
    private final Ledger ledger;
    private final Clock clock;
    private final MoneySplits.Terms terms = MoneySplits.Terms.DEFAULT;

    GiftService(ArtistRepository artists, GiftRepository gifts, Ledger ledger, Clock clock) {
        this.artists = artists;
        this.gifts = gifts;
        this.ledger = ledger;
        this.clock = clock;
    }

    @Transactional
    public Result send(UUID userId, String artistId, long amountUgx, String note, String idempotencyKey) {
        String key = userId + ":" + idempotencyKey;
        long balance = ledger.lockWallet(userId);

        var previous = ledger.findByIdempotencyKey(key);
        if (previous.isPresent()) {
            UUID txId = previous.get().getId();
            long amount = -ledger.walletAmount(txId, userId);
            return new Result(txId, amount, MoneySplits.splitGift(amount, terms).artist(), balance);
        }

        Artist artist = artists.findPublicById(artistId).orElseThrow(() -> ApiException.notFound("Artist"));
        if (userId.equals(artist.getOwnerUserId())) throw PurchaseService.ownMusic("You can't send a gift to yourself.");
        if (amountUgx < terms.minGift()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "GIFT_TOO_SMALL", "The smallest gift is UGX %,d.".formatted(terms.minGift()));
        }
        if (balance < amountUgx) {
            throw new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_FUNDS", "Add money to your wallet first.",
                    Map.of("shortBy", amountUgx - balance, "balanceUgx", balance));
        }

        MoneySplits.GiftSplit split = MoneySplits.splitGift(amountUgx, terms);
        LedgerTransaction tx = ledger.post(LedgerTransaction.Type.GIFT, userId, artistId, artist.getName(), key, List.of(
                new Ledger.Posting(Ledger.walletId(userId), -amountUgx),
                new Ledger.Posting(Ledger.artistEarningsId(artistId), split.artist()),
                new Ledger.Posting(Ledger.systemId(Kind.PLATFORM_REVENUE), split.platform())));

        String clean = note == null || note.isBlank() ? null : note.strip().substring(0, Math.min(note.strip().length(), MAX_NOTE));
        gifts.save(new Gift(userId, artistId, amountUgx, clean, tx.getId(), clock.instant()));
        return new Result(tx.getId(), amountUgx, split.artist(), balance - amountUgx);
    }
}
