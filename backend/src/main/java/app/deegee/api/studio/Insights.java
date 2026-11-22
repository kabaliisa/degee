package app.deegee.api.studio;

import java.time.LocalDate;
import java.util.List;

/**
 * What an artist can see about their own trade: what has come in, who it came from, and which songs
 * people are actually buying.
 *
 * <p>Nothing here crosses between artists. The service builds it from the caller's own artist id, so
 * there is no parameter an artist could change to see somebody else's.
 */
public record Insights(
        /** Everything ever credited to this artist, before any withdrawal. */
        long earnedAllTimeUgx,
        long earnedLast30Ugx,
        /** One entry per day for the last 30 days, oldest first, including the days with nothing. */
        List<Day> daily,
        /** People who have ever bought a song or sent a gift. A person is counted once. */
        int supporters,
        List<Supporter> topSupporters,
        List<Song> topSongs) {

    public record Day(LocalDate date, long ugx) {}

    /**
     * A person who has bought from this artist. Songs and gifts are kept apart rather than added
     * together: a gift is a decision to give, and collapsing it into a purchase total loses that.
     * No phone number -- the artist sees who supports them, not how to reach them directly.
     */
    public record Supporter(String name, int songs, long giftedUgx, long estimatedSpentUgx) {}

    /** {@code buyers} is people, not plays: this is a shop, and what matters is who bought it. */
    public record Song(String trackId, String title, int buyers, long grossUgx) {}
}
