package app.deegee.api.catalog;

import java.util.List;

/**
 * JSON shapes returned by the catalogue API. They match the app's types in src/api/types.ts,
 * so the app can switch from mock data to the API without changing its screens.
 */
public final class CatalogViews {

    private CatalogViews() {}

    public record ArtistView(String id, String name, String city, String bio, List<String> genres, boolean verified, List<String> colors) {
        static ArtistView of(Artist a) {
            return new ArtistView(a.getId(), a.getName(), a.getCity(), a.getBio(), a.getGenres(), a.isVerified(), a.getColors());
        }
    }

    public record ReleaseView(String id, String artistId, String title, String type, int year, long priceUGX, List<String> colors, boolean exclusive) {
        static ReleaseView of(Release r) {
            return new ReleaseView(r.getId(), r.getArtistId(), r.getTitle(), r.getType().label(), r.getYear(), r.getPriceUgx(), r.getColors(), r.isExclusive());
        }
    }

    public record WriterView(String name, int sharePct, String society) {}

    public record TrackView(String id, String releaseId, String artistId, String title, int durationSec, long priceUGX,
                            List<WriterView> writers, String audioUrl) {
        static TrackView of(Track t) {
            List<WriterView> writers = t.getWriters().stream()
                    .map(w -> new WriterView(w.getName(), w.getSharePct(), w.getSociety()))
                    .toList();
            return new TrackView(t.getId(), t.getReleaseId(), t.getArtistId(), t.getTitle(), t.getDurationSec(), t.getPriceUgx(), writers, t.getAudioUrl());
        }
    }

    public record ArtistPage(ArtistView artist, List<ReleaseView> releases, List<TrackView> tracks) {}

    public record ReleasePage(ReleaseView release, ArtistView artist, List<TrackView> tracks) {}

    public record SearchResults(List<ArtistView> artists, List<ReleaseView> releases, List<TrackView> tracks) {}
}
