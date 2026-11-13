package app.deegee.api.studio;

import app.deegee.api.audio.AudioUploaded;
import app.deegee.api.auth.PhoneNumbers;
import app.deegee.api.catalog.Artist;
import app.deegee.api.catalog.ArtistRepository;
import app.deegee.api.catalog.Release;
import app.deegee.api.catalog.ReleaseRepository;
import app.deegee.api.catalog.Track;
import app.deegee.api.catalog.TrackRepository;
import app.deegee.api.common.ApiException;
import app.deegee.api.common.Hashing;
import app.deegee.api.media.MediaStorage;
import app.deegee.api.media.MediaStorage.Folder;
import app.deegee.api.media.MediaUrls;
import app.deegee.api.studio.RightsDeclaration.LabelDeal;
import app.deegee.api.studio.StudioViews.StudioRelease;
import app.deegee.api.wallet.Ledger;
import app.deegee.api.wallet.LedgerAccount.Kind;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Everything an artist does in Artist mode: apply, make releases, upload, declare rights, submit. */
@Service
public class StudioService {

    public record Application(String name, String city, String bio, List<String> genres, String payoutPhone) {}

    public record ReleaseInput(String title, Release.Type type, long priceUgx) {}

    public record WriterInput(String name, int sharePct, String society) {}

    public record TrackInput(String title, long priceUgx, List<WriterInput> writers) {}

    public record DeclarationInput(LabelDeal signedToLabel, String labelName, boolean releasedBefore, String previousDistributor,
                                   boolean coverOrSamples, boolean confirmOwnership) {}

    static final ZoneId UGANDA = ZoneId.of("Africa/Kampala");

    /** Fallback art colours in the Deegee palette, picked per release so the shelf isn't all one colour. */
    private static final List<List<String>> PALETTE = List.of(
            List.of("#FFFFFF", "#1A1A1A"), List.of("#9DBFFF", "#101B30"), List.of("#2F7BFF", "#0A1A3A"),
            List.of("#BDBDBD", "#121212"), List.of("#E6E6E6", "#202020"));

    private final ArtistRepository artists;
    private final ReleaseRepository releases;
    private final TrackRepository tracks;
    private final RightsDeclarationRepository declarations;
    private final UploadChecks uploads;
    private final MediaStorage storage;
    private final MediaUrls urls;
    private final Ledger ledger;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    StudioService(ArtistRepository artists, ReleaseRepository releases, TrackRepository tracks, RightsDeclarationRepository declarations,
                  UploadChecks uploads, MediaStorage storage, MediaUrls urls, Ledger ledger, Clock clock, ApplicationEventPublisher events) {
        this.artists = artists;
        this.releases = releases;
        this.tracks = tracks;
        this.declarations = declarations;
        this.uploads = uploads;
        this.storage = storage;
        this.urls = urls;
        this.ledger = ledger;
        this.clock = clock;
        this.events = events;
    }

    // ---- artist profile ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Artist myArtist(UUID userId) {
        return artists.findByOwnerUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_AN_ARTIST", "You haven't set up an artist profile yet."));
    }

    /** A new application, or an update to a pending or rejected one (which goes back to review). */
    @Transactional
    public Artist apply(UUID userId, Application a) {
        String name = required(a.name(), 2, 60, "Artist name");
        String city = required(a.city(), 2, 60, "City");
        String bio = a.bio() == null ? "" : a.bio().strip();
        if (bio.length() > 500) throw invalid("BIO_TOO_LONG", "Keep the bio under 500 characters.");
        List<String> genres = a.genres() == null ? List.of() : a.genres().stream().distinct().toList();
        if (genres.isEmpty() || genres.size() > 3 || !StudioRules.GENRES.containsAll(genres)) {
            throw invalid("GENRES", "Pick one to three genres.");
        }
        String msisdn = PhoneNumbers.normalize(a.payoutPhone())
                .orElseThrow(() -> invalid("INVALID_PHONE", "Enter the MTN or Airtel number you want to be paid on, e.g. 0772 123456."));
        String provider = PhoneNumbers.provider(msisdn).map(Enum::name)
                .orElseThrow(() -> invalid("INVALID_PHONE", "Payouts go to MTN MoMo or Airtel Money numbers."));

        Artist existing = artists.findByOwnerUserId(userId).orElse(null);
        boolean renamed = existing == null || !existing.getName().equalsIgnoreCase(name);
        if (renamed && artists.existsByNameIgnoreCase(name)) {
            throw new ApiException(HttpStatus.CONFLICT, "NAME_TAKEN",
                    "An artist called %s is already on Deegee. If that's you, contact support.".formatted(name));
        }
        if (existing != null) {
            if (existing.isActive()) throw new ApiException(HttpStatus.CONFLICT, "ALREADY_AN_ARTIST", "Your artist profile is already approved.");
            existing.reapply(name, city, bio, genres, msisdn, provider);
            return existing;
        }
        String id = Hashing.randomId("ar");
        Artist artist = artists.save(new Artist(id, userId, name, city, bio, genres, msisdn, provider, colorsFor(id), clock.instant()));
        ledger.ensureAccount(Kind.ARTIST_EARNINGS, id);
        return artist;
    }

    // ---- releases -----------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<StudioRelease> myReleases(UUID userId) {
        Artist artist = myArtist(userId);
        return releases.findByArtistIdOrderByCreatedAtDesc(artist.getId()).stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public StudioRelease myRelease(UUID userId, String releaseId) {
        return view(own(userId, releaseId, false));
    }

    @Transactional
    public StudioRelease createRelease(UUID userId, ReleaseInput in) {
        Artist artist = myArtist(userId);
        if (artist.getStatus() == Artist.Status.REJECTED) {
            throw new ApiException(HttpStatus.CONFLICT, "ARTIST_REJECTED", "Update your artist profile first.");
        }
        validate(in);
        String id = Hashing.randomId("r");
        int year = LocalDate.now(clock.withZone(UGANDA)).getYear();
        Release release = releases.save(new Release(id, artist.getId(), in.title().strip(), in.type(), in.priceUgx(), colorsFor(id), year, clock.instant()));
        return view(release);
    }

    @Transactional
    public StudioRelease editRelease(UUID userId, String releaseId, ReleaseInput in) {
        Release release = own(userId, releaseId, true);
        validate(in);
        release.edit(in.title().strip(), in.type(), in.priceUgx());
        return view(release);
    }

    /** Only releases that were never published can be deleted; their files go too. */
    @Transactional
    public void deleteRelease(UUID userId, String releaseId) {
        Release release = own(userId, releaseId, true);
        List<Track> songs = tracks.findByReleaseIdOrderByTrackNo(releaseId);
        songs.forEach(t -> t.mediaKeys().forEach(storage::delete));
        tracks.deleteAll(songs);
        declarations.findById(releaseId).ifPresent(d -> {
            storage.delete(d.getLabelLetterKey());
            declarations.delete(d);
        });
        storage.delete(release.getCoverKey());
        releases.delete(release);
    }

    @Transactional
    public StudioRelease uploadCover(UUID userId, String releaseId, MultipartFile file) {
        Release release = own(userId, releaseId, true);
        UploadChecks.Staged staged = uploads.cover(file);
        String old = release.getCoverKey();
        release.setCoverKey(storage.store(Folder.COVERS, staged.file(), staged.extension()));
        storage.delete(old);
        return view(release);
    }

    // ---- songs ------------------------------------------------------------------------------

    @Transactional
    public StudioRelease addTrack(UUID userId, String releaseId, TrackInput in) {
        Release release = own(userId, releaseId, true);
        int count = tracks.countByReleaseId(releaseId);
        if (count >= StudioRules.maxTracks(Release.Type.ALBUM)) throw invalid("TOO_MANY_SONGS", "A release can have up to 40 songs.");
        tracks.save(new Track(Hashing.randomId("t"), releaseId, release.getArtistId(), count + 1, title(in), price(in.priceUgx()), writers(in)));
        return view(release);
    }

    @Transactional
    public StudioRelease editTrack(UUID userId, String releaseId, String trackId, TrackInput in) {
        Release release = own(userId, releaseId, true);
        ownTrack(release, trackId).edit(title(in), price(in.priceUgx()), writers(in));
        return view(release);
    }

    @Transactional
    public StudioRelease deleteTrack(UUID userId, String releaseId, String trackId) {
        Release release = own(userId, releaseId, true);
        Track track = ownTrack(release, trackId);
        track.mediaKeys().forEach(storage::delete);
        tracks.delete(track);
        tracks.flush();
        List<Track> rest = tracks.findByReleaseIdOrderByTrackNo(releaseId);
        for (int i = 0; i < rest.size(); i++) rest.get(i).setTrackNo(i + 1);
        return view(release);
    }

    /** Replaces the song's recording. The length shown to fans comes from the file itself. */
    @Transactional
    public StudioRelease uploadAudio(UUID userId, String releaseId, String trackId, MultipartFile file) {
        Release release = own(userId, releaseId, true);
        Track track = ownTrack(release, trackId);
        UploadChecks.Audio audio = uploads.audio(file);
        String key = storage.store(Folder.AUDIO, audio.file(), audio.extension());
        List<String> old = track.setAudio(key, audio.durationSec(), audio.lossy());
        old.forEach(storage::delete);
        events.publishEvent(new AudioUploaded(track.getId(), key)); // processed once this is saved
        return view(release);
    }

    // ---- rights -----------------------------------------------------------------------------

    @Transactional
    public StudioRelease declare(UUID userId, String releaseId, DeclarationInput in) {
        Release release = own(userId, releaseId, true);
        if (in.signedToLabel() == null) throw invalid("DECLARATION_INCOMPLETE", "Say whether you're signed to a record label.");
        if (!in.confirmOwnership()) {
            throw invalid("OWNERSHIP_NOT_CONFIRMED", "You need to confirm you own or control the rights to these recordings.");
        }
        String labelName = trimToNull(in.labelName());
        if (in.signedToLabel() == LabelDeal.YES && labelName == null) throw invalid("LABEL_NAME", "Enter the name of your label.");
        String distributor = trimToNull(in.previousDistributor());
        if (in.releasedBefore() && distributor == null) {
            throw invalid("DISTRIBUTOR_NAME", "Say where it was released before (a distributor, label or platform).");
        }
        RightsDeclaration d = declarations.findById(releaseId).orElseGet(() -> new RightsDeclaration(releaseId));
        d.answer(in.signedToLabel(), clip(labelName, 120), in.releasedBefore(), clip(distributor, 120), in.coverOrSamples(), userId, clock.instant());
        if (in.signedToLabel() != LabelDeal.YES && d.getLabelLetterKey() != null) {
            storage.delete(d.getLabelLetterKey());
            d.setLabelLetterKey(null);
        }
        declarations.save(d);
        return view(release);
    }

    @Transactional
    public StudioRelease uploadLabelLetter(UUID userId, String releaseId, MultipartFile file) {
        Release release = own(userId, releaseId, true);
        RightsDeclaration d = declarations.findById(releaseId)
                .filter(x -> x.getSignedToLabel() == LabelDeal.YES)
                .orElseThrow(() -> invalid("NO_LABEL_DEAL", "A permission letter is only needed if you're signed to a label."));
        UploadChecks.Staged staged = uploads.letter(file);
        String old = d.getLabelLetterKey();
        d.setLabelLetterKey(storage.store(Folder.LETTERS, staged.file(), staged.extension()));
        storage.delete(old);
        return view(release);
    }

    /** Sends the release to Deegee's review. Refuses with the list of what's missing. */
    @Transactional
    public StudioRelease submit(UUID userId, String releaseId) {
        Release release = own(userId, releaseId, true);
        Artist artist = myArtist(userId);
        if (!artist.isActive()) {
            throw new ApiException(HttpStatus.CONFLICT, "ARTIST_NOT_APPROVED",
                    "You can submit once your artist profile is approved. Keep preparing your release in the meantime.");
        }
        List<String> problems = StudioRules.problems(release, tracks.findByReleaseIdOrderByTrackNo(releaseId), declarations.findById(releaseId).orElse(null));
        if (!problems.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "NOT_READY", problems.getFirst(), Map.of("problems", problems));
        }
        release.submit(clock.instant());
        return view(release);
    }

    // ---- helpers ----------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public StudioRelease view(Release r) {
        List<Track> songs = tracks.findByReleaseIdOrderByTrackNo(r.getId());
        RightsDeclaration d = declarations.findById(r.getId()).orElse(null);
        List<String> problems = r.getStatus().editable() ? StudioRules.problems(r, songs, d) : List.of();
        return StudioRelease.of(r, songs, d, problems, urls::urlFor);
    }

    private Release own(UUID userId, String releaseId, boolean mustBeEditable) {
        Artist artist = myArtist(userId);
        Release release = releases.findById(releaseId)
                .filter(r -> r.getArtistId().equals(artist.getId()))
                .orElseThrow(() -> ApiException.notFound("Release"));
        if (mustBeEditable && !release.getStatus().editable()) {
            String why = release.getStatus() == Release.Status.IN_REVIEW
                    ? "This release is being reviewed. You can change it if it's sent back."
                    : "Published releases can't be changed here yet. Contact support for corrections.";
            throw new ApiException(HttpStatus.CONFLICT, "NOT_EDITABLE", why);
        }
        return release;
    }

    private Track ownTrack(Release release, String trackId) {
        return tracks.findById(trackId).filter(t -> t.getReleaseId().equals(release.getId()))
                .orElseThrow(() -> ApiException.notFound("Song"));
    }

    private static void validate(ReleaseInput in) {
        required(in.title(), 1, 120, "Title");
        if (in.type() == null) throw invalid("RELEASE_TYPE", "Choose single, EP or album.");
        price(in.priceUgx());
    }

    private static String title(TrackInput in) {
        return required(in.title(), 1, 120, "Song title");
    }

    private static long price(long priceUgx) {
        if (priceUgx < StudioRules.MIN_PRICE_UGX || priceUgx > StudioRules.MAX_PRICE_UGX) {
            throw invalid("PRICE", "Prices go from UGX %,d to UGX %,d.".formatted(StudioRules.MIN_PRICE_UGX, StudioRules.MAX_PRICE_UGX));
        }
        return priceUgx;
    }

    /** Who wrote the song: 1–10 writers with shares adding up to 100. Decides who gets the song share of each sale. */
    private static List<Track.Writer> writers(TrackInput in) {
        List<WriterInput> list = in.writers() == null ? List.of() : in.writers();
        if (list.isEmpty()) throw invalid("WRITERS", "Add at least one songwriter (that may be you).");
        if (list.size() > StudioRules.MAX_WRITERS) throw invalid("WRITERS", "Up to 10 songwriters per song.");
        Set<String> seen = new HashSet<>();
        int total = 0;
        for (WriterInput w : list) {
            String name = required(w.name(), 1, 80, "Songwriter name");
            if (!seen.add(name.toLowerCase(Locale.ROOT))) throw invalid("WRITERS", "%s is listed twice.".formatted(name));
            if (w.sharePct() < 1 || w.sharePct() > 100) throw invalid("WRITER_SHARE", "Each songwriter's share is between 1% and 100%.");
            String society = trimToNull(w.society());
            if (society != null && !society.equals("UPRS") && !society.equals("FOREIGN")) {
                throw invalid("SOCIETY", "Collecting society must be UPRS, another country's society, or none.");
            }
            total += w.sharePct();
        }
        if (total != 100) throw invalid("WRITER_SHARE", "Songwriter shares must add up to 100%% (they add up to %d%%).".formatted(total));
        return list.stream().map(w -> new Track.Writer(w.name().strip(), w.sharePct(), trimToNull(w.society()))).toList();
    }

    private static String required(String value, int min, int max, String field) {
        String v = value == null ? "" : value.strip();
        if (v.length() < min) throw invalid("MISSING_" + field.toUpperCase(Locale.ROOT).replace(' ', '_'), field + " is required.");
        if (v.length() > max) throw invalid("TOO_LONG", "%s can be up to %d characters.".formatted(field, max));
        return v;
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private static String clip(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    static List<String> colorsFor(String id) {
        return PALETTE.get(Math.floorMod(id.hashCode(), PALETTE.size()));
    }

    private static ApiException invalid(String code, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, code, message);
    }
}
