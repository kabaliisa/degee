-- An artist's address becomes a thing they own, and their payout number becomes a thing they can
-- change. Both were previously fixed at the moment they applied.

-- Until now the address at deegee.ug/<handle> was worked out from the name, in the app and again
-- in the build script. That meant a rename silently broke every link anyone had shared, and it
-- meant two copies of one rule drifting apart. The handle is now a column: the name is free to
-- change and the address only moves when an artist deliberately moves it.
ALTER TABLE artists ADD COLUMN slug VARCHAR(60);

-- The backfill has to land on exactly what src/lib/slug.ts was computing, or every live link moves
-- the moment this runs: lowercase, anything that is not a letter or digit folded to a single
-- hyphen, no hyphen at either end.
--
-- One difference from the app's rule, deliberate. The app strips accents first, so "Zoé" gives
-- zoe; this folds the accented letter to a hyphen instead, giving zo-. Every name in the table
-- today is ASCII, so the two agree on all of them, and doing it properly here would mean the
-- unaccent extension for a case that does not exist. From here on the Java rule in Slugs.java
-- handles accents, and it is the only thing that makes a new handle.
UPDATE artists
SET slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'));

-- One override the derived rule never produced: Mukasa the MC performs as Mukasa and the whole
-- stage name is a mouthful in a URL. It was in the app's HANDLES map; now it is just his handle.
UPDATE artists SET slug = 'mukasa' WHERE id = 'a5';

-- A handle that collides with one of the app's own screens would shadow it, so those get a
-- suffix. Kept in step with RESERVED in src/lib/slug.ts, which still guards what artists may type.
UPDATE artists SET slug = slug || '-music' WHERE slug IN (
    'activity', 'admin', 'artist', 'buy', 'gift', 'library', 'player', 'profile', 'release',
    'search', 'settings', 'sign-in', 'studio', 'welcome', 'about', 'help', 'terms', 'privacy',
    'api', 'assets', 'static', 'sitemap', 'robots', 'index', 'home', 'deegee'
);

ALTER TABLE artists ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX uq_artists_slug ON artists (slug);

-- When the payout number last moved. A withdrawal is held for a day after a change: the number is
-- where money leaves the platform, so changing it is the first thing someone who has taken over an
-- account would do, and speed is the only thing that attack needs. An artist changing SIM waits a
-- day and keeps earning throughout; a thief waits a day and is usually found.
ALTER TABLE artists ADD COLUMN payout_changed_at TIMESTAMP WITH TIME ZONE;
