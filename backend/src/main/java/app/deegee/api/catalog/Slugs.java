package app.deegee.api.catalog;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/**
 * An artist's page lives at deegee.ug/&lt;handle&gt;. It is the address they put on a poster or say
 * out loud in an interview, so it is made of their name and nothing else.
 *
 * <p>Handles are stored, not derived, so that renaming an artist does not move their address and
 * break every link already shared. This class only makes a first suggestion and says whether a
 * handle someone typed is allowed; what is in the column is the truth.
 */
public final class Slugs {

    /**
     * The app's own addresses. An artist who took one would shadow a screen: deegee.ug/library
     * would be somebody's page instead of the library. Kept in step with RESERVED in
     * src/lib/slug.ts, which refuses the same words in the form before the request is sent.
     */
    private static final Set<String> RESERVED = Set.of(
            "activity", "admin", "artist", "buy", "gift", "library", "player", "profile", "release",
            "search", "settings", "sign-in", "studio", "welcome", "about", "help", "terms", "privacy",
            "api", "assets", "static", "sitemap", "robots", "index", "home", "deegee");

    public static final int MIN = 2;
    public static final int MAX = 40;

    private Slugs() {}

    /** Lowercase, accents stripped, everything else a single hyphen. */
    public static String slugify(String name) {
        String stripped = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return stripped.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
    }

    /** What to offer a new artist. Not unique on its own: the caller still has to resolve clashes. */
    public static String suggest(String name) {
        String slug = slugify(name);
        if (slug.length() < MIN) slug = "artist";
        if (slug.length() > MAX) slug = slug.substring(0, MAX).replaceAll("-+$", "");
        return RESERVED.contains(slug) ? slug + "-music" : slug;
    }

    public static boolean isReserved(String slug) {
        return RESERVED.contains(slug.toLowerCase(Locale.ROOT));
    }

    /** Whether an artist may have typed this: shape only, says nothing about whether it is taken. */
    public static boolean isWellFormed(String slug) {
        return slug != null
                && slug.length() >= MIN
                && slug.length() <= MAX
                && slug.equals(slugify(slug))
                && !isReserved(slug);
    }
}
