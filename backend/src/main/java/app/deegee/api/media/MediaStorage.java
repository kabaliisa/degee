package app.deegee.api.media;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Where uploaded files live. Keys look like {@code audio/<uuid>.mp3}. This stores them in a local folder;
 * production swaps in object storage (S3 or Cloudflare R2) behind the same methods.
 */
@Component
public class MediaStorage {

    /** What a file is for. Covers are public; audio masters and label letters are only reachable by signed link. */
    public enum Folder {
        COVERS("covers", true), AUDIO("audio", false), LETTERS("letters", false);

        final String path;
        final boolean isPublic;

        Folder(String path, boolean isPublic) {
            this.path = path;
            this.isPublic = isPublic;
        }
    }

    private static final Pattern KEY = Pattern.compile("^(covers|audio|letters)/[0-9a-f-]{36}\\.[a-z0-9]{2,5}$");

    private final Path root;

    MediaStorage(MediaProperties props) {
        this.root = props.dir().toAbsolutePath().normalize();
        try {
            for (Folder f : Folder.values()) Files.createDirectories(root.resolve(f.path));
        } catch (IOException e) {
            throw new UncheckedIOException("Can't create media folder " + root, e);
        }
    }

    /** Moves {@code file} into storage and returns its key. */
    public String store(Folder folder, Path file, String extension) {
        String key = folder.path + "/" + UUID.randomUUID() + "." + extension;
        try {
            Files.move(file, root.resolve(key), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Couldn't store upload", e);
        }
        return key;
    }

    /** A temporary file for an upload while it's being checked. */
    public Path stage(InputStream in, String extension) {
        try {
            Path tmp = Files.createTempFile("deegee-upload-", "." + extension);
            Files.copy(in, tmp, StandardCopyOption.REPLACE_EXISTING);
            return tmp;
        } catch (IOException e) {
            throw new UncheckedIOException("Couldn't read upload", e);
        }
    }

    public Optional<Path> find(String key) {
        if (key == null || !KEY.matcher(key).matches()) return Optional.empty(); // also blocks ../ tricks
        Path path = root.resolve(key);
        return Files.isRegularFile(path) ? Optional.of(path) : Optional.empty();
    }

    public static boolean isPublic(String key) {
        return key != null && key.startsWith(Folder.COVERS.path + "/");
    }

    public void delete(String key) {
        find(key).ifPresent(path -> {
            try {
                Files.deleteIfExists(path);
            } catch (IOException ignored) {
                // an orphaned file is harmless; a cleanup job can sweep it later
            }
        });
    }
}
