-- Sample catalogue (invented artists and songs), matching the app's mock data.

INSERT INTO artists (id, name, city, bio, genres, verified, color_a, color_b) VALUES
    ('a1', 'Nalu Kizza', 'Kampala', 'Kampala singer blending Afrobeat grooves with Luganda love songs.', 'Afrobeat,Zouk', TRUE, '#2F7BFF', '#0A1A38'),
    ('a2', 'Ssalongo Beats', 'Masaka', 'Guitar storyteller keeping Kadongo Kamu alive for a new generation.', 'Kadongo Kamu', TRUE, '#FFFFFF', '#1A1A1A'),
    ('a3', 'Kiwa Rebel', 'Jinja', 'Riverside dancehall energy from the source of the Nile.', 'Dancehall', FALSE, '#9DBFFF', '#101B30'),
    ('a4', 'Grace Atim', 'Gulu', 'Gospel voice from the north, singing in Acholi and English.', 'Gospel', TRUE, '#BDBDBD', '#121212'),
    ('a5', 'Mukasa the MC', 'Entebbe', 'Lugaflow rapper with sharp stories about city life.', 'Hip Hop', TRUE, '#2F7BFF', '#0A1A38');

INSERT INTO releases (id, artist_id, title, type, release_year, price_ugx, color_a, color_b, exclusive) VALUES
    ('r1', 'a1', 'Enkuba', 'EP', 2026, 8000, '#FFFFFF', '#1A1A1A', FALSE),
    ('r2', 'a1', 'Sunday in Ntinda', 'SINGLE', 2026, 1500, '#BDBDBD', '#121212', TRUE),
    ('r3', 'a2', 'Ebyafaayo', 'ALBUM', 2025, 15000, '#9DBFFF', '#101B30', FALSE),
    ('r4', 'a3', 'Nile Bounce', 'SINGLE', 2026, 1000, '#2F7BFF', '#0A1A38', FALSE),
    ('r5', 'a4', 'Lakwena', 'EP', 2025, 6000, '#FFFFFF', '#1A1A1A', FALSE),
    ('r6', 'a5', 'Boda Diaries', 'ALBUM', 2026, 12000, '#9DBFFF', '#101B30', FALSE);

INSERT INTO tracks (id, release_id, artist_id, title, track_no, duration_sec, price_ugx, audio_url) VALUES
    ('t1', 'r1', 'a1', 'Enkuba', 1, 214, 2000, NULL),
    ('t2', 'r1', 'a1', 'Mpola Mpola', 2, 198, 2000, NULL),
    ('t3', 'r1', 'a1', 'Ttaala', 3, 231, 2000, NULL),
    ('t4', 'r1', 'a1', 'Wano Wano', 4, 189, 2000, NULL),
    ('t5', 'r2', 'a1', 'Sunday in Ntinda', 1, 204, 1500, NULL),
    ('t6', 'r3', 'a2', 'Ebyafaayo', 1, 312, 2000, NULL),
    ('t7', 'r3', 'a2', 'Omukwano Gwa Kyalo', 2, 287, 2000, NULL),
    ('t8', 'r3', 'a2', 'Taxi ya Masaka', 3, 265, 2000, NULL),
    ('t9', 'r3', 'a2', 'Ennanga', 4, 340, 2000, NULL),
    ('t10', 'r4', 'a3', 'Nile Bounce', 1, 176, 1000, NULL),
    ('t11', 'r5', 'a4', 'Lakwena', 1, 246, 1500, NULL),
    ('t12', 'r5', 'a4', 'Pwoyo', 2, 222, 1500, NULL),
    ('t13', 'r5', 'a4', 'Morning Light', 3, 258, 1500, NULL),
    ('t14', 'r6', 'a5', 'Stage Two', 1, 201, 1500, NULL),
    ('t15', 'r6', 'a5', 'Rolex at Midnight', 2, 193, 1500, NULL),
    ('t16', 'r6', 'a5', 'Kikuubo Hustle', 3, 215, 1500, NULL);

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
