-- The audio pipeline: after an upload, each song is measured for loudness and encoded into a light
-- stream (what buyers hear) and a 30-second preview (what everyone else hears). The master is kept as uploaded.
ALTER TABLE tracks ADD COLUMN audio_status VARCHAR(12);         -- PROCESSING, READY or FAILED; null when no recording
ALTER TABLE tracks ADD COLUMN audio_error VARCHAR(300);         -- why processing failed, in plain words
ALTER TABLE tracks ADD COLUMN stream_key VARCHAR(200);          -- AAC 128 kbps, loudness-matched
ALTER TABLE tracks ADD COLUMN preview_key VARCHAR(200);         -- 30-second AAC clip, public
ALTER TABLE tracks ADD COLUMN source_lossy BOOLEAN NOT NULL DEFAULT FALSE; -- uploaded as MP3/M4A rather than WAV/FLAC
ALTER TABLE tracks ADD COLUMN loudness_lufs DOUBLE PRECISION;   -- integrated loudness of the master
ALTER TABLE tracks ADD COLUMN true_peak_db DOUBLE PRECISION;    -- true peak of the master, dBTP

-- Recordings uploaded before the pipeline existed are processed when the server next starts.
UPDATE tracks SET audio_status = 'PROCESSING' WHERE audio_key IS NOT NULL;
