package app.deegee.api.studio;

import app.deegee.api.common.ApiException;
import app.deegee.api.media.MediaStorage;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.imageio.ImageIO;
import org.jaudiotagger.audio.AudioFile;
import org.jaudiotagger.audio.AudioFileIO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/** Checks that uploads are what they claim to be before they're stored. */
@Component
class UploadChecks {

    /** {@code lossy}: an MP3 or M4A, not the studio master (WAV or FLAC). */
    record Audio(Path file, String extension, int durationSec, boolean lossy) {}

    record Staged(Path file, String extension) {}

    static final Set<String> AUDIO_TYPES = Set.of("mp3", "m4a", "wav", "flac");
    static final Set<String> IMAGE_TYPES = Set.of("jpg", "jpeg", "png");
    static final Set<String> LETTER_TYPES = Set.of("pdf", "jpg", "jpeg", "png");

    static final int MIN_SONG_SEC = 30;
    static final int MAX_SONG_SEC = 20 * 60;
    static final int MIN_COVER_PX = 400;
    static final long MAX_COVER_BYTES = 10L * 1024 * 1024;
    static final long MAX_LETTER_BYTES = 10L * 1024 * 1024;

    static {
        Logger.getLogger("org.jaudiotagger").setLevel(Level.WARNING); // it logs every file it reads at INFO
    }

    private final MediaStorage storage;

    UploadChecks(MediaStorage storage) {
        this.storage = storage;
    }

    /** A song: MP3, M4A, WAV or FLAC that really decodes, between 30 seconds and 20 minutes. */
    Audio audio(MultipartFile upload) {
        String ext = extension(upload, AUDIO_TYPES, "Upload the song as MP3, M4A, WAV or FLAC.");
        Path file = stage(upload, ext);
        int seconds;
        try {
            AudioFile audio = AudioFileIO.read(file.toFile());
            seconds = audio.getAudioHeader().getTrackLength();
        } catch (Exception e) {
            discard(file);
            throw unprocessable("AUDIO_UNREADABLE", "We couldn't read that audio file. Export it again as MP3, M4A, WAV or FLAC.");
        }
        if (seconds < MIN_SONG_SEC || seconds > MAX_SONG_SEC) {
            discard(file);
            throw unprocessable("AUDIO_LENGTH", "Songs must be between 30 seconds and 20 minutes long.");
        }
        return new Audio(file, ext, seconds, ext.equals("mp3") || ext.equals("m4a"));
    }

    /** Cover art: a JPG or PNG at least 400×400 pixels. */
    Staged cover(MultipartFile upload) {
        if (upload.getSize() > MAX_COVER_BYTES) throw unprocessable("FILE_TOO_BIG", "Cover images must be under 10 MB.");
        String ext = extension(upload, IMAGE_TYPES, "Upload the cover as a JPG or PNG.");
        Path file = stage(upload, ext);
        BufferedImage image = readImage(file);
        if (image == null) {
            discard(file);
            throw unprocessable("IMAGE_UNREADABLE", "We couldn't open that image. Try another JPG or PNG.");
        }
        if (image.getWidth() < MIN_COVER_PX || image.getHeight() < MIN_COVER_PX) {
            discard(file);
            throw unprocessable("IMAGE_TOO_SMALL", "Covers must be at least 400 × 400 pixels.");
        }
        return new Staged(file, ext.equals("jpeg") ? "jpg" : ext);
    }

    /** A label permission letter: a PDF or a photo of the signed page. */
    Staged letter(MultipartFile upload) {
        if (upload.getSize() > MAX_LETTER_BYTES) throw unprocessable("FILE_TOO_BIG", "Letters must be under 10 MB.");
        String ext = extension(upload, LETTER_TYPES, "Upload the letter as a PDF, JPG or PNG.");
        Path file = stage(upload, ext);
        boolean ok = ext.equals("pdf") ? startsWithPdfMagic(file) : readImage(file) != null;
        if (!ok) {
            discard(file);
            throw unprocessable("FILE_UNREADABLE", "We couldn't open that file. Try a PDF or a clear photo.");
        }
        return new Staged(file, ext.equals("jpeg") ? "jpg" : ext);
    }

    private Path stage(MultipartFile upload, String ext) {
        if (upload.isEmpty()) throw unprocessable("EMPTY_FILE", "That file is empty.");
        try (InputStream in = upload.getInputStream()) {
            return storage.stage(in, ext);
        } catch (IOException e) {
            throw unprocessable("UPLOAD_FAILED", "The upload didn't finish. Try again.");
        }
    }

    private static String extension(MultipartFile upload, Set<String> allowed, String message) {
        String name = upload.getOriginalFilename() == null ? "" : upload.getOriginalFilename();
        int dot = name.lastIndexOf('.');
        String ext = dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!allowed.contains(ext)) throw unprocessable("WRONG_FILE_TYPE", message);
        return ext;
    }

    private static BufferedImage readImage(Path file) {
        try {
            return ImageIO.read(file.toFile());
        } catch (IOException e) {
            return null;
        }
    }

    private static boolean startsWithPdfMagic(Path file) {
        try (InputStream in = Files.newInputStream(file)) {
            byte[] head = in.readNBytes(5);
            return new String(head).equals("%PDF-");
        } catch (IOException e) {
            return false;
        }
    }

    static void discard(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // temp files are cleaned by the OS eventually
        }
    }

    private static ApiException unprocessable(String code, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, code, message);
    }
}
