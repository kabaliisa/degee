package app.deegee.api.media;

import app.deegee.api.auth.Roles;
import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.catalog.Track;
import app.deegee.api.catalog.TrackRepository;
import app.deegee.api.common.ApiException;
import app.deegee.api.common.CurrentUser;
import app.deegee.api.wallet.PurchaseService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * A short-lived link to play a whole song: for people who bought it, its artist, and admins. It points to the
 * light, loudness-matched stream once the song is processed (the master until then). Everyone else hears the
 * public 30-second preview listed with the song in the catalogue.
 */
@RestController
class PlayController {

    record PlayLink(String url, Instant expiresAt) {}

    private final TrackRepository tracks;
    private final ArtistRepository artists;
    private final PurchaseService purchases;
    private final Roles roles;
    private final MediaUrls urls;
    private final MediaProperties props;

    PlayController(TrackRepository tracks, ArtistRepository artists, PurchaseService purchases, Roles roles, MediaUrls urls, MediaProperties props) {
        this.tracks = tracks;
        this.artists = artists;
        this.purchases = purchases;
        this.roles = roles;
        this.urls = urls;
        this.props = props;
    }

    @GetMapping("/v1/tracks/{id}/play")
    @Transactional(readOnly = true)
    PlayLink play(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        UUID userId = CurrentUser.id(jwt);
        Track track = tracks.findById(id).filter(Track::hasAudio).orElseThrow(() -> ApiException.notFound("Recording"));
        boolean isArtist = artists.findById(track.getArtistId()).map(Artist::getOwnerUserId).map(userId::equals).orElse(false);
        boolean allowed = isArtist || purchases.library(userId).contains(id) || roles.isAdmin(userId);
        if (!allowed) throw new ApiException(HttpStatus.FORBIDDEN, "NOT_OWNED", "Buy this song to play it in full.");
        String key = track.getStreamKey() != null ? track.getStreamKey() : track.getAudioKey();
        return new PlayLink(urls.urlFor(key), Instant.now().plus(props.signedUrlTtl()));
    }
}
