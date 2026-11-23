package app.deegee.api.media;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

/**
 * Puts the demo catalogue's recordings on disk at startup, when there is a demo catalogue to put
 * them there for.
 *
 * The songs that come with the seeded catalogue are carried inside the jar rather than left in the
 * media folder, because the folder is not guaranteed to survive. Free hosting tiers hand a container
 * a fresh, empty filesystem on every restart and redeploy; a demo whose music disappears the first
 * time the host recycles it is worse than one with no music at all, because it works right up until
 * someone is watching.
 *
 * Only missing files are written. A real upload that happens to land on the same key is never
 * overwritten, and restarting is cheap.
 */
@Component
@ConditionalOnProperty(name = "deegee.demo.catalogue", havingValue = "true")
class SeedMedia {

    private static final Logger log = LoggerFactory.getLogger(SeedMedia.class);
    // Gated on the same setting as the rows themselves: without the demo catalogue these files
    // name nothing, and writing 15 MB of music onto a production disk for no reader is worse than
    // pointless -- on a free tier it is most of the disk.
    private static final String ROOT = "demo-media/";
    private static final String PATTERN = "classpath:" + ROOT + "**/*.*";

    private final MediaProperties props;

    SeedMedia(MediaProperties props) {
        this.props = props;
    }

    @EventListener(ApplicationReadyEvent.class)
    void restore() {
        Path root = props.dir().toAbsolutePath().normalize();
        int written = 0;
        try {
            Resource[] found = new PathMatchingResourcePatternResolver().getResources(PATTERN);
            int unreadable = 0;
            for (Resource resource : found) {
                String key = keyOf(resource);
                // Renaming the folder without renaming it here made every key null, so every file
                // was skipped and nothing was logged: the demo simply had no sound and no reason
                // given. A packaging mistake should say so.
                if (key == null) {
                    unreadable++;
                    continue;
                }
                Path target = root.resolve(key);
                if (Files.exists(target)) continue;
                Files.createDirectories(target.getParent());
                try (InputStream in = resource.getInputStream()) {
                    Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                }
                written++;
            }
            if (unreadable > 0) {
                log.warn("{} of {} packaged recordings are not under {} -- none of them will play",
                        unreadable, found.length, ROOT);
            }
            if (written > 0) log.info("Restored {} demo recordings into {}", written, root);
        } catch (IOException e) {
            // The catalogue still loads and the app still runs; the songs just will not play. Worth a
            // loud line in the log, not worth refusing to start.
            log.warn("Could not restore seed media into {}: {}", root, e.toString());
        }
    }

    /** The media key a packaged file belongs at: everything after the root, e.g. audio/<uuid>.m4a */
    private String keyOf(Resource resource) {
        try {
            String url = resource.getURL().toString();
            int at = url.indexOf(ROOT);
            return at < 0 ? null : url.substring(at + ROOT.length());
        } catch (IOException e) {
            return null;
        }
    }
}
