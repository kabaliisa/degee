package app.deegee.api.studio;

import app.deegee.api.catalog.Release;
import app.deegee.api.catalog.Track;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** What a release needs before it can be sent for review. Placeholder limits until the business sets them. */
final class StudioRules {

    private StudioRules() {}

    static final long MIN_PRICE_UGX = 500;
    static final long MAX_PRICE_UGX = 500_000;
    static final int MAX_WRITERS = 10;
    static final Set<String> GENRES = Set.of("Afrobeat", "Kadongo Kamu", "Dancehall", "Gospel", "Zouk", "Hip Hop");

    static int minTracks(Release.Type type) {
        return switch (type) { case SINGLE -> 1; case EP -> 2; case ALBUM -> 5; };
    }

    static int maxTracks(Release.Type type) {
        return switch (type) { case SINGLE -> 3; case EP -> 8; case ALBUM -> 40; };
    }

    /** Everything still missing, in the order the artist would fix it. */
    static List<String> problems(Release release, List<Track> tracks, RightsDeclaration declaration) {
        List<String> problems = new ArrayList<>();
        Release.Type type = release.getType();
        if (tracks.isEmpty()) {
            problems.add("Add at least one song.");
        } else if (tracks.size() < minTracks(type) || tracks.size() > maxTracks(type)) {
            problems.add("%s has %d to %d songs; this one has %d.".formatted(article(type), minTracks(type), maxTracks(type), tracks.size()));
        }
        for (Track t : tracks) {
            if (!t.hasAudio()) {
                problems.add("Upload the recording for “%s”.".formatted(t.getTitle()));
            } else if (t.getAudioStatus() == Track.AudioStatus.PROCESSING) {
                problems.add("“%s” is still processing. This takes a minute or two.".formatted(t.getTitle()));
            } else if (t.getAudioStatus() == Track.AudioStatus.FAILED) {
                problems.add("“%s”: %s".formatted(t.getTitle(), t.getAudioError()));
            }
        }
        long separately = tracks.stream().mapToLong(Track::getPriceUgx).sum();
        if (tracks.size() > 1 && release.getPriceUgx() > separately) {
            problems.add("The release price can’t be more than buying every song separately (UGX %,d).".formatted(separately));
        }
        if (declaration == null) {
            problems.add("Answer the rights questions.");
        } else {
            if (declaration.isCoverOrSamples()) {
                problems.add("Covers and songs with samples need the original owner’s permission. Deegee can’t sell them yet.");
            }
            if (declaration.getSignedToLabel() == RightsDeclaration.LabelDeal.YES && declaration.getLabelLetterKey() == null) {
                problems.add("Upload your label’s signed permission letter.");
            }
        }
        return problems;
    }

    private static String article(Release.Type type) {
        return switch (type) { case SINGLE -> "A single"; case EP -> "An EP"; case ALBUM -> "An album"; };
    }
}
