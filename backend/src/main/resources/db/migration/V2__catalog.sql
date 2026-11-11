CREATE TABLE artists (
    id          VARCHAR(32)  PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL,
    city        VARCHAR(60)  NOT NULL,
    bio         VARCHAR(500) NOT NULL,
    genres      VARCHAR(200) NOT NULL, -- comma-separated, e.g. 'Afrobeat,Zouk'
    verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    color_a     VARCHAR(7)   NOT NULL, -- fallback art colours
    color_b     VARCHAR(7)   NOT NULL
);

CREATE TABLE releases (
    id          VARCHAR(32)  PRIMARY KEY,
    artist_id   VARCHAR(32)  NOT NULL REFERENCES artists (id),
    title       VARCHAR(120) NOT NULL,
    type        VARCHAR(10)  NOT NULL, -- SINGLE, EP, ALBUM
    release_year INTEGER     NOT NULL,
    price_ugx   BIGINT       NOT NULL CHECK (price_ugx >= 0),
    color_a     VARCHAR(7)   NOT NULL,
    color_b     VARCHAR(7)   NOT NULL,
    exclusive   BOOLEAN      NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_releases_artist ON releases (artist_id);

CREATE TABLE tracks (
    id           VARCHAR(32)  PRIMARY KEY,
    release_id   VARCHAR(32)  NOT NULL REFERENCES releases (id),
    artist_id    VARCHAR(32)  NOT NULL REFERENCES artists (id),
    title        VARCHAR(120) NOT NULL,
    track_no     INTEGER      NOT NULL,
    duration_sec INTEGER      NOT NULL,
    price_ugx    BIGINT       NOT NULL CHECK (price_ugx >= 0),
    audio_url    VARCHAR(500)
);
CREATE INDEX idx_tracks_release ON tracks (release_id);
CREATE INDEX idx_tracks_artist ON tracks (artist_id);

-- Who wrote each song and their share of it. Shares per track sum to 100.
CREATE TABLE track_writers (
    track_id     VARCHAR(32)  NOT NULL REFERENCES tracks (id),
    writer_name  VARCHAR(80)  NOT NULL,
    share_pct    INTEGER      NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
    society      VARCHAR(10), -- UPRS, FOREIGN, or NULL for a writer in no collecting society
    PRIMARY KEY (track_id, writer_name)
);
