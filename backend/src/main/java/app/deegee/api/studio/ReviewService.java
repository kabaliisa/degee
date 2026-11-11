package app.deegee.api.studio;

import app.deegee.api.auth.User;
import app.deegee.api.auth.UserRepository;
import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.catalog.Release;
import app.deegee.api.catalog.ReleaseRepository;
import app.deegee.api.common.ApiException;
import app.deegee.api.studio.StudioViews.StudioRelease;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Deegee's side of the studio: approving artists and releases. Callers check the admin role. */
@Service
public class ReviewService {

    public record PendingArtist(String id, String name, String city, String bio, List<String> genres, String accountPhone,
                                String payoutPhone, String payoutProvider, Instant appliedAt) {}

    /** A release waiting for review, with the things a reviewer should look at first. */
    public record PendingRelease(StudioRelease release, String artistName, boolean firstRelease, List<String> flags) {}

    private final ArtistRepository artists;
    private final ReleaseRepository releases;
    private final RightsDeclarationRepository declarations;
    private final UserRepository users;
    private final StudioService studio;
    private final Clock clock;

    ReviewService(ArtistRepository artists, ReleaseRepository releases, RightsDeclarationRepository declarations,
                  UserRepository users, StudioService studio, Clock clock) {
        this.artists = artists;
        this.releases = releases;
        this.declarations = declarations;
        this.users = users;
        this.studio = studio;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<PendingArtist> pendingArtists() {
        return artists.findByStatusOrderByCreatedAt(Artist.Status.PENDING).stream().map(a -> new PendingArtist(
                a.getId(), a.getName(), a.getCity(), a.getBio(), a.getGenres(),
                users.findById(a.getOwnerUserId()).map(User::getPhone).orElse(null),
                a.getPayoutMsisdn(), a.getPayoutProvider(), a.getCreatedAt())).toList();
    }

    @Transactional(readOnly = true)
    public List<PendingRelease> pendingReleases() {
        return releases.findByStatusOrderBySubmittedAt(Release.Status.IN_REVIEW).stream().map(r -> {
            Artist artist = artists.findById(r.getArtistId()).orElseThrow();
            boolean first = releases.findPublishedByArtist(r.getArtistId()).isEmpty();
            return new PendingRelease(studio.view(r), artist.getName(), first, flags(r, first));
        }).toList();
    }

    @Transactional
    public void approveArtist(String artistId) {
        Artist artist = artists.findById(artistId).filter(a -> a.getStatus() == Artist.Status.PENDING)
                .orElseThrow(() -> ApiException.notFound("Pending artist"));
        artist.activate(clock.instant());
    }

    @Transactional
    public void rejectArtist(String artistId, String note) {
        Artist artist = artists.findById(artistId).filter(a -> a.getStatus() == Artist.Status.PENDING)
                .orElseThrow(() -> ApiException.notFound("Pending artist"));
        artist.reject(requireNote(note));
    }

    /** Puts the release in the catalogue, dated today. */
    @Transactional
    public void approveRelease(String releaseId) {
        Release release = inReview(releaseId);
        Artist artist = artists.findById(release.getArtistId()).orElseThrow();
        if (!artist.isActive()) throw new ApiException(HttpStatus.CONFLICT, "ARTIST_NOT_APPROVED", "Approve the artist first.");
        Instant now = clock.instant();
        release.publish(LocalDate.ofInstant(now, StudioService.UGANDA).getYear(), now);
    }

    @Transactional
    public void rejectRelease(String releaseId, String note) {
        inReview(releaseId).reject(requireNote(note));
    }

    private Release inReview(String releaseId) {
        return releases.findById(releaseId).filter(r -> r.getStatus() == Release.Status.IN_REVIEW)
                .orElseThrow(() -> ApiException.notFound("Release in review"));
    }

    private List<String> flags(Release r, boolean first) {
        List<String> flags = new ArrayList<>();
        declarations.findById(r.getId()).ifPresent(d -> {
            switch (d.getSignedToLabel()) {
                case YES -> flags.add("Signed to %s. Check the permission letter is from them and covers these songs.".formatted(d.getLabelName()));
                case NOT_SURE -> flags.add("Not sure about a label deal%s. Ask the artist before approving."
                        .formatted(d.getLabelName() == null ? "" : " (mentions " + d.getLabelName() + ")"));
                case NO -> { }
            }
            if (d.isReleasedBefore()) flags.add("Released before via %s. Check it isn't already controlled by them.".formatted(d.getPreviousDistributor()));
        });
        if (first) flags.add("First release by this artist. Listen to every song.");
        return flags;
    }

    private static String requireNote(String note) {
        String n = note == null ? "" : note.strip();
        if (n.isEmpty()) throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "NOTE_REQUIRED", "Tell the artist what to fix.");
        return n.length() > 300 ? n.substring(0, 300) : n;
    }
}
