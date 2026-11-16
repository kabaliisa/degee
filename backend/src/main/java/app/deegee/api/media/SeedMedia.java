package app.deegee.api.media;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

/**
 * Puts the demo catalogue's recordings on disk at startup.
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
class SeedMedia {

    private static final Logger log = LoggerFactory.getLogger(SeedMedia.class);
    private static final String PATTERN = "classpath:seed-media/**/*.*";

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
            for (Resource resource : found) {
                String key = keyOf(resource);
                if (key == null) continue;
                Path target = root.resolve(key);
                if (Files.exists(target)) continue;
                Files.createDirectories(target.getParent());
                try (InputStream in = resource.getInputStream()) {
                    Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                }
                written++;
            }
            if (written > 0) log.info("Restored {} seed recordings into {}", written, root);
        } catch (IOException e) {
            // The catalogue still loads and the app still runs; the songs just will not play. Worth a
            // loud line in the log, not worth refusing to start.
            log.warn("Could not restore seed media into {}: {}", root, e.toString());
        }
    }

    /** The media key a packaged file belongs at: everything after seed-media/, e.g. audio/<uuid>.m4a */
    private String keyOf(Resource resource) {
        try {
            String url = resource.getURL().toString();
            int at = url.indexOf("seed-media/");
            return at < 0 ? null : url.substring(at + "seed-media/".length());
        } catch (IOException e) {
            return null;
        }
    }
}
