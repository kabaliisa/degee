package app.deegee.api.studio;

import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.CatalogViews;
import app.deegee.api.catalog.CatalogViews.WriterView;
import app.deegee.api.catalog.Release;
import app.deegee.api.catalog.Track;
import java.time.Instant;
import java.util.List;
import java.util.function.Function;

/** JSON for the artist's own studio (drafts, review status, private file links). */
public final class StudioViews {

    private StudioViews() {}

    public record ArtistProfile(String id, String name, String city, String bio, List<String> genres, List<String> colors,
                                String status, String reviewNote, boolean verified, String payoutPhone, String payoutProvider) {
        public static ArtistProfile of(Artist a) {
            return new ArtistProfile(a.getId(), a.getName(), a.getCity(), a.getBio(), a.getGenres(), a.getColors(),
                    a.getStatus().name(), a.getReviewNote(), a.isVerified(), a.getPayoutMsisdn(), a.getPayoutProvider());
        }
    }

    /**
     * {@code audioUrl}: a short-lived link to the uploaded recording, so the artist can listen back.
     * {@code audioStatus}: PROCESSING, READY or FAILED (null with no recording); {@code audioError} says why it failed.
     * {@code previewUrl}: the 30-second preview fans hear. {@code sourceLossy}: uploaded as MP3/M4A, not WAV/FLAC.
     */
    public record StudioTrack(String id, int trackNo, String title, long priceUGX, int durationSec, boolean hasAudio,
                              String audioUrl, String audioStatus, String audioError, String previewUrl, boolean sourceLossy,
                              Double loudnessLufs, List<WriterView> writers) {
        static StudioTrack of(Track t, Function<String, String> urlFor) {
            List<WriterView> writers = t.getWriters().stream().map(w -> new WriterView(w.getName(), w.getSharePct(), w.getSociety())).toList();
            return new StudioTrack(t.getId(), t.getTrackNo(), t.getTitle(), t.getPriceUgx(), t.getDurationSec(), t.hasAudio(),
                    urlFor.apply(t.getAudioKey()), t.getAudioStatus() == null ? null : t.getAudioStatus().name(), t.getAudioError(),
                    urlFor.apply(t.getPreviewKey()), t.isSourceLossy(), t.getLoudnessLufs(), writers);
        }
    }

    public record Declaration(String signedToLabel, String labelName, boolean releasedBefore, String previousDistributor,
                              boolean coverOrSamples, boolean hasLabelLetter, String labelLetterUrl, Instant acceptedAt) {
        static Declaration of(RightsDeclaration d, Function<String, String> urlFor) {
            return d == null ? null : new Declaration(d.getSignedToLabel().name(), d.getLabelName(), d.isReleasedBefore(),
                    d.getPreviousDistributor(), d.isCoverOrSamples(), d.getLabelLetterKey() != null, urlFor.apply(d.getLabelLetterKey()),
                    d.getAcceptedAt());
        }
    }

    /** {@code problems}: what still has to be done before it can be submitted, in plain words. Empty means ready. */
    public record StudioRelease(String id, String artistId, String title, String type, long priceUGX, List<String> colors, String coverUrl,
                                String status, String reviewNote, Instant submittedAt, Instant publishedAt,
                                List<StudioTrack> tracks, Declaration declaration, List<String> problems) {
        static StudioRelease of(Release r, List<Track> tracks, RightsDeclaration d, List<String> problems, Function<String, String> urlFor) {
            return new StudioRelease(r.getId(), r.getArtistId(), r.getTitle(), r.getType().label(), r.getPriceUgx(), r.getColors(),
                    CatalogViews.coverPath(r.getCoverKey()), r.getStatus().name(), r.getReviewNote(), r.getSubmittedAt(), r.getPublishedAt(),
                    tracks.stream().map(t -> StudioTrack.of(t, urlFor)).toList(), Declaration.of(d, urlFor), problems);
        }
    }
}
