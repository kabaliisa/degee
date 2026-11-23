-- The demo catalogue: five invented artists, six releases, sixteen songs.
--
-- Not a migration. It used to be one (V4 and V8), which meant every database got it whether or not
-- anybody wanted it, and a real visitor's first sight of Deegee was invented artists singing
-- AI-generated songs. V10 took it out; this script puts it back only where it is asked for, by
-- DemoCatalogue, when deegee.demo.catalogue is on and the catalogue is empty.
--
-- It is on in the test suite, so the tests exercise the same script the demo does rather than
-- keeping a private copy that can drift. It is off by default, so production ships empty.

INSERT INTO artists (id, name, slug, city, bio, genres, verified, color_a, color_b) VALUES
    ('a1', 'Nalu Kizza', 'nalu-kizza', 'Kampala', 'Kampala singer blending Afrobeat grooves with Luganda love songs.', 'Afrobeat,Zouk', TRUE, '#2F7BFF', '#0A1A38'),
    ('a2', 'Ssalongo Beats', 'ssalongo-beats', 'Masaka', 'Guitar storyteller keeping Kadongo Kamu alive for a new generation.', 'Kadongo Kamu', TRUE, '#FFFFFF', '#1A1A1A'),
    ('a3', 'Kiwa Rebel', 'kiwa-rebel', 'Jinja', 'Riverside dancehall energy from the source of the Nile.', 'Dancehall', FALSE, '#9DBFFF', '#101B30'),
    ('a4', 'Grace Atim', 'grace-atim', 'Gulu', 'Gospel voice from the north, singing in Acholi and English.', 'Gospel', TRUE, '#BDBDBD', '#121212'),
    ('a5', 'Mukasa the MC', 'mukasa', 'Entebbe', 'Lugaflow rapper with sharp stories about city life.', 'Hip Hop', TRUE, '#2F7BFF', '#0A1A38');

INSERT INTO releases (id, artist_id, title, type, release_year, price_ugx, color_a, color_b, exclusive) VALUES
    ('r1', 'a1', 'Enkuba', 'EP', 2026, 8000, '#FFFFFF', '#1A1A1A', FALSE),
    ('r2', 'a1', 'Sunday in Ntinda', 'SINGLE', 2026, 1500, '#BDBDBD', '#121212', TRUE),
    ('r3', 'a2', 'Ebyafaayo', 'ALBUM', 2025, 15000, '#9DBFFF', '#101B30', FALSE),
    ('r4', 'a3', 'Nile Bounce', 'SINGLE', 2026, 1000, '#2F7BFF', '#0A1A38', FALSE),
    ('r5', 'a4', 'Lakwena', 'EP', 2025, 6000, '#FFFFFF', '#1A1A1A', FALSE),
    ('r6', 'a5', 'Boda Diaries', 'ALBUM', 2026, 12000, '#9DBFFF', '#101B30', FALSE);

INSERT INTO tracks (id, release_id, artist_id, title, track_no, duration_sec, price_ugx) VALUES
    ('t1', 'r1', 'a1', 'Enkuba', 1, 214, 2000),
    ('t2', 'r1', 'a1', 'Mpola Mpola', 2, 198, 2000),
    ('t3', 'r1', 'a1', 'Ttaala', 3, 231, 2000),
    ('t4', 'r1', 'a1', 'Wano Wano', 4, 189, 2000),
    ('t5', 'r2', 'a1', 'Sunday in Ntinda', 1, 204, 1500),
    ('t6', 'r3', 'a2', 'Ebyafaayo', 1, 312, 2000),
    ('t7', 'r3', 'a2', 'Omukwano Gwa Kyalo', 2, 287, 2000),
    ('t8', 'r3', 'a2', 'Taxi ya Masaka', 3, 265, 2000),
    ('t9', 'r3', 'a2', 'Ennanga', 4, 340, 2000),
    ('t10', 'r4', 'a3', 'Nile Bounce', 1, 176, 1000),
    ('t11', 'r5', 'a4', 'Lakwena', 1, 246, 1500),
    ('t12', 'r5', 'a4', 'Pwoyo', 2, 222, 1500),
    ('t13', 'r5', 'a4', 'Morning Light', 3, 258, 1500),
    ('t14', 'r6', 'a5', 'Stage Two', 1, 201, 1500),
    ('t15', 'r6', 'a5', 'Rolex at Midnight', 2, 193, 1500),
    ('t16', 'r6', 'a5', 'Kikuubo Hustle', 3, 215, 1500);

INSERT INTO track_writers (track_id, writer_name, share_pct, society) VALUES
    ('t1', 'Nalu Kizza', 100, 'UPRS'),
    ('t2', 'Nalu Kizza', 50, 'UPRS'),
    ('t2', 'Daudi Okello', 50, NULL),
    ('t3', 'Nalu Kizza', 100, 'UPRS'),
    ('t4', 'Nalu Kizza', 100, 'UPRS'),
    ('t5', 'Nalu Kizza', 100, 'UPRS'),
    ('t6', 'Ssalongo Beats', 100, NULL),
    ('t7', 'Ssalongo Beats', 100, NULL),
    ('t8', 'Ssalongo Beats', 100, NULL),
    ('t9', 'Ssalongo Beats', 100, NULL),
    ('t10', 'Kiwa Rebel', 100, NULL),
    ('t11', 'Grace Atim', 100, 'UPRS'),
    ('t12', 'Grace Atim', 100, 'UPRS'),
    ('t13', 'Grace Atim', 100, 'UPRS'),
    ('t14', 'Mukasa the MC', 100, 'UPRS'),
    ('t15', 'Mukasa the MC', 70, 'UPRS'),
    ('t15', 'Lil Juma', 30, 'FOREIGN'),
    ('t16', 'Mukasa the MC', 100, 'UPRS');

-- Earnings accounts for each artist. Ids match UUID.nameUUIDFromBytes("ARTIST_EARNINGS:<artist id>").
INSERT INTO ledger_accounts (id, kind, owner_ref, balance_ugx, created_at) VALUES
    ('6bc8cb8b-c661-36b3-b98b-8eda9bf03b81', 'ARTIST_EARNINGS', 'a1', 0, CURRENT_TIMESTAMP),
    ('efdca647-6aa6-3fa2-b40e-13cfc1c621bd', 'ARTIST_EARNINGS', 'a2', 0, CURRENT_TIMESTAMP),
    ('46f2bb74-b817-397a-b441-429da252cb33', 'ARTIST_EARNINGS', 'a3', 0, CURRENT_TIMESTAMP),
    ('f243eba6-6c77-33ad-af06-80c45d3ef610', 'ARTIST_EARNINGS', 'a4', 0, CURRENT_TIMESTAMP),
    ('26a918a2-f4c4-3266-bc83-e30beb4ddf3d', 'ARTIST_EARNINGS', 'a5', 0, CURRENT_TIMESTAMP);

-- Recordings for those tracks, so the audio and playback tests have bytes to serve. The files
-- themselves now live under src/test/resources/seed-media, not in the shipped jar.
UPDATE tracks SET
    audio_key    = 'audio/'    || k.uuid || '.m4a',
    stream_key   = 'audio/'    || k.uuid || '.m4a',
    preview_key  = 'previews/' || k.uuid || '.m4a',
    audio_status = 'READY',
    source_lossy = TRUE,      -- these came from MP3, not from a WAV master
    loudness_lufs = -14.0,    -- encoded with loudnorm at the pipeline's own target
    true_peak_db  = -1.5
FROM (
    VALUES
        ('t1',  '5eed0001-a1a1-4a1a-8a1a-000000000001'),
        ('t2',  '5eed0002-a2a2-4a2a-8a2a-000000000002'),
        ('t3',  '5eed0003-a3a3-4a3a-8a3a-000000000003'),
        ('t4',  '5eed0004-a4a4-4a4a-8a4a-000000000004'),
        ('t5',  '5eed0005-a5a5-4a5a-8a5a-000000000005'),
        ('t6',  '5eed0001-a1a1-4a1a-8a1a-000000000001'),
        ('t7',  '5eed0002-a2a2-4a2a-8a2a-000000000002'),
        ('t8',  '5eed0003-a3a3-4a3a-8a3a-000000000003'),
        ('t9',  '5eed0004-a4a4-4a4a-8a4a-000000000004'),
        ('t10', '5eed0005-a5a5-4a5a-8a5a-000000000005'),
        ('t11', '5eed0001-a1a1-4a1a-8a1a-000000000001'),
        ('t12', '5eed0002-a2a2-4a2a-8a2a-000000000002'),
        ('t13', '5eed0003-a3a3-4a3a-8a3a-000000000003'),
        ('t14', '5eed0004-a4a4-4a4a-8a4a-000000000004'),
        ('t15', '5eed0005-a5a5-4a5a-8a5a-000000000005'),
        ('t16', '5eed0001-a1a1-4a1a-8a1a-000000000001')
) AS k(track_id, uuid)
WHERE tracks.id = k.track_id;

-- V5 backfilled published_at from created_at for the rows that existed when it ran. This fixture
-- is inserted after that, so it has to set its own: left null, every fixture release sorts ahead
-- of anything a test publishes, and "newest first" assertions fail for a reason that has nothing
-- to do with what they are testing. Dated in the past so a test's own release is genuinely newest.
UPDATE releases
SET published_at = TIMESTAMP '2026-01-01 00:00:00+00', created_at = TIMESTAMP '2026-01-01 00:00:00+00'
WHERE id IN ('r1','r2','r3','r4','r5','r6');
