-- Give the demo catalogue something to play.
--
-- Until now every seeded track had no recording at all, and the app quietly fell back to a simulated
-- clock: the progress bar moved, the preview counted down, and no sound came out. That is fine while
-- the catalogue is scaffolding and fatal the moment anyone presses play in front of someone.
--
-- Five recordings ship inside the jar (see SeedMedia, which writes them to the media folder on
-- startup) and are spread across the sixteen seeded tracks in order, so every play button works. The
-- same song therefore appears under more than one title; that is the honest cost of a demo catalogue
-- larger than the music we hold, and it disappears the moment real artists upload.
--
-- Keys here must match the shape MediaStorage enforces: folder/<uuid>.<ext>, and only covers and
-- previews are public. The stream lives under audio/ because there is no stream folder -- what makes
-- it the stream rather than the master is stream_key pointing at it.

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
