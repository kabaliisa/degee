package app.deegee.api.studio;

import app.deegee.api.catalog.Release;
import app.deegee.api.common.CurrentUser;
import app.deegee.api.studio.RightsDeclaration.LabelDeal;
import app.deegee.api.studio.StudioService.Application;
import app.deegee.api.studio.StudioService.DeclarationInput;
import app.deegee.api.studio.StudioService.ReleaseInput;
import app.deegee.api.studio.StudioService.TrackInput;
import app.deegee.api.studio.StudioService.WriterInput;
import app.deegee.api.studio.StudioViews.ArtistProfile;
import app.deegee.api.studio.StudioViews.StudioRelease;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Artist mode. Files are sent as multipart/form-data with a single part named "file". */
@RestController
@RequestMapping("/v1/artist")
class StudioController {

    record ApplicationRequest(String name, String city, String bio, List<String> genres, String payoutPhone) {}

    record ReleaseRequest(String title, Release.Type type, long priceUgx) {}

    record TrackRequest(String title, long priceUgx, List<WriterInput> writers) {}

    record DeclarationRequest(LabelDeal signedToLabel, String labelName, boolean releasedBefore, String previousDistributor,
                              boolean coverOrSamples, boolean confirmOwnership) {}

    private final StudioService studio;

    StudioController(StudioService studio) {
        this.studio = studio;
    }

    @GetMapping("/me")
    ArtistProfile me(@AuthenticationPrincipal Jwt jwt) {
        return ArtistProfile.of(studio.myArtist(CurrentUser.id(jwt)));
    }

    /** Apply to sell on Deegee, or update a pending or rejected application. */
    @PostMapping("/application")
    ArtistProfile apply(@AuthenticationPrincipal Jwt jwt, @RequestBody ApplicationRequest r) {
        return ArtistProfile.of(studio.apply(CurrentUser.id(jwt), new Application(r.name(), r.city(), r.bio(), r.genres(), r.payoutPhone())));
    }

    @GetMapping("/releases")
    List<StudioRelease> releases(@AuthenticationPrincipal Jwt jwt) {
        return studio.myReleases(CurrentUser.id(jwt));
    }

    @PostMapping("/releases")
    @ResponseStatus(HttpStatus.CREATED)
    StudioRelease create(@AuthenticationPrincipal Jwt jwt, @RequestBody ReleaseRequest r) {
        return studio.createRelease(CurrentUser.id(jwt), new ReleaseInput(r.title(), r.type(), r.priceUgx()));
    }

    @GetMapping("/releases/{id}")
    StudioRelease release(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return studio.myRelease(CurrentUser.id(jwt), id);
    }

    @PatchMapping("/releases/{id}")
    StudioRelease edit(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody ReleaseRequest r) {
        return studio.editRelease(CurrentUser.id(jwt), id, new ReleaseInput(r.title(), r.type(), r.priceUgx()));
    }

    @DeleteMapping("/releases/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        studio.deleteRelease(CurrentUser.id(jwt), id);
    }

    @PutMapping(path = "/releases/{id}/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    StudioRelease cover(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestParam("file") MultipartFile file) {
        return studio.uploadCover(CurrentUser.id(jwt), id, file);
    }

    @PostMapping("/releases/{id}/tracks")
    @ResponseStatus(HttpStatus.CREATED)
    StudioRelease addTrack(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody TrackRequest r) {
        return studio.addTrack(CurrentUser.id(jwt), id, new TrackInput(r.title(), r.priceUgx(), r.writers()));
    }

    @PatchMapping("/releases/{id}/tracks/{trackId}")
    StudioRelease editTrack(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @PathVariable String trackId, @RequestBody TrackRequest r) {
        return studio.editTrack(CurrentUser.id(jwt), id, trackId, new TrackInput(r.title(), r.priceUgx(), r.writers()));
    }

    @DeleteMapping("/releases/{id}/tracks/{trackId}")
    StudioRelease deleteTrack(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @PathVariable String trackId) {
        return studio.deleteTrack(CurrentUser.id(jwt), id, trackId);
    }

    @PutMapping(path = "/releases/{id}/tracks/{trackId}/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    StudioRelease audio(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @PathVariable String trackId,
                        @RequestParam("file") MultipartFile file) {
        return studio.uploadAudio(CurrentUser.id(jwt), id, trackId, file);
    }

    @PutMapping("/releases/{id}/declaration")
    StudioRelease declare(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody DeclarationRequest r) {
        return studio.declare(CurrentUser.id(jwt), id, new DeclarationInput(r.signedToLabel(), r.labelName(), r.releasedBefore(),
                r.previousDistributor(), r.coverOrSamples(), r.confirmOwnership()));
    }

    @PutMapping(path = "/releases/{id}/label-letter", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    StudioRelease labelLetter(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestParam("file") MultipartFile file) {
        return studio.uploadLabelLetter(CurrentUser.id(jwt), id, file);
    }

    @PostMapping("/releases/{id}/submit")
    StudioRelease submit(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return studio.submit(CurrentUser.id(jwt), id);
    }
}
