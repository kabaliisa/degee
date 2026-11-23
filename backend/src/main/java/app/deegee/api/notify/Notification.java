package app.deegee.api.notify;

import java.util.Map;

/**
 * One thing worth telling somebody, in the words they will read on their lock screen.
 *
 * <p>The copy lives here rather than at each call site so that every notification Deegee sends can be
 * read in one place. {@code data} is what the app uses to decide where tapping it should go.
 */
public record Notification(Kind kind, String title, String body, Map<String, String> data) {

    public enum Kind { SALE, GIFT, PAYOUT_SENT, PAYOUT_RETURNED, RELEASE_LIVE, PAYOUT_NUMBER_CHANGED, CREDIT_HELD }

    /** Ugandan shillings as a person writes them: "1,400 UGX". */
    public static String ugx(long amount) {
        return "%,d UGX".formatted(amount);
    }

    /**
     * A fan bought something. The buyer is not named: they chose to buy music, not to be announced on
     * somebody's lock screen.
     */
    public static Notification sale(String what, long earnedUgx) {
        return new Notification(Kind.SALE, what + " just sold", "You earned " + ugx(earnedUgx),
                Map.of("to", "/studio"));
    }

    /** A gift is signed by its nature -- the fan chose to send it, usually with a note -- so the name stays. */
    public static Notification gift(String fromName, long amountUgx, String note) {
        String body = note == null || note.isBlank() ? "Open Deegee to see it" : "“" + note + "”";
        return new Notification(Kind.GIFT, fromName + " sent you " + ugx(amountUgx), body, Map.of("to", "/studio"));
    }

    public static Notification payoutSent(long amountUgx, String msisdn) {
        return new Notification(Kind.PAYOUT_SENT, "Your " + ugx(amountUgx) + " has been sent", "To " + msisdn,
                Map.of("to", "/studio/earnings"));
    }

    public static Notification payoutReturned(long amountUgx) {
        return new Notification(Kind.PAYOUT_RETURNED, "That withdrawal didn't go through",
                "Your " + ugx(amountUgx) + " is back in your earnings", Map.of("to", "/studio/earnings"));
    }

    public static Notification releaseLive(String title) {
        return new Notification(Kind.RELEASE_LIVE, title + " is live", "Fans can buy it now", Map.of("to", "/studio"));
    }

    /** Not switchable: somebody is moving where this artist's money goes. */
    public static Notification payoutNumberChanged(String msisdn) {
        return new Notification(Kind.PAYOUT_NUMBER_CHANGED, "Your payout number was changed",
                "Now " + msisdn + ". Withdrawals pause for a day.", Map.of("to", "/studio/profile"));
    }

    /** The fan paid and we couldn't deliver. Their money is not gone, and they are not watching. */
    public static Notification creditHeld(long amountUgx) {
        return new Notification(Kind.CREDIT_HELD, "You paid, but we couldn't deliver",
                "Your " + ugx(amountUgx) + " is kept for next time", Map.of("to", "/activity"));
    }
}
