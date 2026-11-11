package app.deegee.api.media;

import app.deegee.api.common.ApiException;
import java.nio.file.Path;
import java.time.Duration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Serves stored files. Supports Range requests, so audio can be streamed and seeked. */
@RestController
class MediaController {

    private final MediaStorage storage;
    private final MediaUrls urls;

    MediaController(MediaStorage storage, MediaUrls urls) {
        this.storage = storage;
        this.urls = urls;
    }

    @GetMapping("/v1/media/{folder}/{file}")
    ResponseEntity<Resource> file(@PathVariable String folder, @PathVariable String file,
                                  @RequestParam(required = false) Long exp, @RequestParam(required = false) String sig) {
        String key = folder + "/" + file;
        boolean allowed = MediaStorage.isPublic(key) || (exp != null && urls.verify(key, exp, sig));
        if (!allowed) throw new ApiException(HttpStatus.FORBIDDEN, "LINK_EXPIRED", "This link has expired. Go back and open it again.");

        Path path = storage.find(key).orElseThrow(() -> ApiException.notFound("File"));
        MediaType type = MediaTypeFactory.getMediaType(path.getFileName().toString()).orElse(MediaType.APPLICATION_OCTET_STREAM);
        // Keys never change content (a new upload gets a new key), so public files can be cached for a long time.
        CacheControl cache = MediaStorage.isPublic(key) ? CacheControl.maxAge(Duration.ofDays(365)).cachePublic() : CacheControl.noStore();
        return ResponseEntity.ok().contentType(type).cacheControl(cache).body(new FileSystemResource(path));
    }
}
