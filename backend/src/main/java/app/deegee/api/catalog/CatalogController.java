package app.deegee.api.catalog;

import app.deegee.api.catalog.CatalogViews.ArtistPage;
import app.deegee.api.catalog.CatalogViews.ArtistView;
import app.deegee.api.catalog.CatalogViews.CatalogSnapshot;
import app.deegee.api.catalog.CatalogViews.ReleasePage;
import app.deegee.api.catalog.CatalogViews.ReleaseView;
import app.deegee.api.catalog.CatalogViews.SearchResults;
import app.deegee.api.catalog.CatalogViews.TrackView;
import app.deegee.api.common.ApiException;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public, read-only catalogue. */
@RestController
@RequestMapping("/v1/catalog")
@Transactional(readOnly = true)
class CatalogController {

    private static final int MAX_QUERY = 60;

    private final ArtistRepository artists;
    private final ReleaseRepository releases;
    private final TrackRepository tracks;

    CatalogController(ArtistRepository artists, ReleaseRepository releases, TrackRepository tracks) {
        this.artists = artists;
        this.releases = releases;
        this.tracks = tracks;
    }

    /**
     * Everything at once, so the app can browse offline and without a request per screen.
     * Fine for hundreds of releases; replace with paged endpoints before the catalogue gets large.
     */
    @GetMapping
    CatalogSnapshot all() {
        return new CatalogSnapshot(
                artists.findPublic().stream().map(ArtistView::of).toList(),
                releases.findPublished().stream().map(ReleaseView::of).toList(),
                tracks.findPublished().stream().map(TrackView::of).toList());
    }

    @GetMapping("/artists")
    List<ArtistView> artists() {
        return artists.findPublic().stream().map(ArtistView::of).toList();
    }

    @GetMapping("/artists/{id}")
    ArtistPage artist(@PathVariable String id) {
        Artist artist = artists.findPublicById(id).orElseThrow(() -> ApiException.notFound("Artist"));
        return new ArtistPage(
                ArtistView.of(artist),
                releases.findPublishedByArtist(id).stream().map(ReleaseView::of).toList(),
                tracks.findPublishedByArtist(id).stream().map(TrackView::of).toList());
    }

    @GetMapping("/releases")
    List<ReleaseView> releases() {
        return releases.findPublished().stream().map(ReleaseView::of).toList();
    }

    @GetMapping("/releases/{id}")
    ReleasePage release(@PathVariable String id) {
        Release release = releases.findPublishedById(id).orElseThrow(() -> ApiException.notFound("Release"));
        Artist artist = artists.findPublicById(release.getArtistId()).orElseThrow(() -> ApiException.notFound("Artist"));
        return new ReleasePage(
                ReleaseView.of(release),
                ArtistView.of(artist),
                tracks.findByReleaseIdOrderByTrackNo(id).stream().map(TrackView::of).toList());
    }

    /** Several tracks at once, e.g. the songs in a user's library: {@code ?ids=t1,t2}. */
    @GetMapping("/tracks")
    List<TrackView> tracks(@RequestParam List<String> ids) {
        if (ids.size() > 200) throw ApiException.badRequest("TOO_MANY_IDS", "Ask for at most 200 tracks at a time.");
        return tracks.findPublishedByIdIn(ids).stream().map(TrackView::of).toList();
    }

    @GetMapping("/search")
    SearchResults search(@RequestParam(defaultValue = "") String q) {
        String query = q.trim();
        if (query.isEmpty()) return new SearchResults(List.of(), List.of(), List.of());
        if (query.length() > MAX_QUERY) query = query.substring(0, MAX_QUERY);
        return new SearchResults(
                artists.search(query).stream().map(ArtistView::of).toList(),
                releases.search(query).stream().map(ReleaseView::of).toList(),
                tracks.search(query).stream().map(TrackView::of).toList());
    }
}
