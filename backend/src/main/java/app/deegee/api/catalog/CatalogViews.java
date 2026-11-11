package app.deegee.api.catalog;

import java.util.List;

/**
 * JSON shapes returned by the catalogue API. They match the app's types in src/api/types.ts,
 * so the app can switch from mock data to the API without changing its screens.
 */
public final class CatalogViews {

    private CatalogViews() {}

    public record ArtistView(String id, String name, String city, String bio, List<String> genres, boolean verified, List<String> colors) {
        public static ArtistView of(Artist a) {
            return new ArtistView(a.getId(), a.getName(), a.getCity(), a.getBio(), a.getGenres(), a.isVerified(), a.getColors());
        }
    }

    /** {@code coverUrl} is a path on this API (e.g. /v1/media/covers/…), or null to use the fallback art. */
    public record ReleaseView(String id, String artistId, String title, String type, int year, long priceUGX, List<String> colors,
                              boolean exclusive, String coverUrl) {
        public static ReleaseView of(Release r) {
            return new ReleaseView(r.getId(), r.getArtistId(), r.getTitle(), r.getType().label(), r.getYear(), r.getPriceUgx(), r.getColors(),
                    r.isExclusive(), coverPath(r.getCoverKey()));
        }
    }

    public static String coverPath(String coverKey) {
        return coverKey == null ? null : "/v1/media/" + coverKey;
    }

    public record WriterView(String name, int sharePct, String society) {}

    /** {@code hasAudio}: a real recording was uploaded; ask GET /v1/tracks/{id}/play for a link. */
    public record TrackView(String id, String releaseId, String artistId, String title, int durationSec, long priceUGX,
                            List<WriterView> writers, boolean hasAudio) {
        public static TrackView of(Track t) {
            List<WriterView> writers = t.getWriters().stream()
                    .map(w -> new WriterView(w.getName(), w.getSharePct(), w.getSociety()))
                    .toList();
            return new TrackView(t.getId(), t.getReleaseId(), t.getArtistId(), t.getTitle(), t.getDurationSec(), t.getPriceUgx(), writers, t.hasAudio());
        }
    }

    public record ArtistPage(ArtistView artist, List<ReleaseView> releases, List<TrackView> tracks) {}

    public record ReleasePage(ReleaseView release, ArtistView artist, List<TrackView> tracks) {}

    /** The whole catalogue in one response, while it is small enough for that. */
    public record CatalogSnapshot(List<ArtistView> artists, List<ReleaseView> releases, List<TrackView> tracks) {}

    public record SearchResults(List<ArtistView> artists, List<ReleaseView> releases, List<TrackView> tracks) {}
}
