-- Artist side: applications, uploads with a rights declaration, admin review, and withdrawals.

CREATE TABLE user_roles (
    user_id  UUID        NOT NULL REFERENCES users (id),
    role     VARCHAR(20) NOT NULL, -- ADMIN
    PRIMARY KEY (user_id, role)
);

-- Artists: who manages them, whether they've been approved, and where their money goes.
ALTER TABLE artists ADD COLUMN status         VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'; -- PENDING, ACTIVE, REJECTED
ALTER TABLE artists ADD COLUMN owner_user_id  UUID REFERENCES users (id);
ALTER TABLE artists ADD COLUMN payout_msisdn  VARCHAR(16);
ALTER TABLE artists ADD COLUMN payout_provider VARCHAR(20);
ALTER TABLE artists ADD COLUMN review_note    VARCHAR(300);
ALTER TABLE artists ADD COLUMN created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMESTAMP WITH TIME ZONE '2026-01-01 00:00:00+00';
ALTER TABLE artists ADD COLUMN activated_at   TIMESTAMP WITH TIME ZONE;
UPDATE artists SET activated_at = created_at;
CREATE UNIQUE INDEX uq_artists_owner ON artists (owner_user_id);

-- Releases go DRAFT → IN_REVIEW → PUBLISHED (or REJECTED, then can be fixed and resubmitted).
ALTER TABLE releases ADD COLUMN status        VARCHAR(10) NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE releases ADD COLUMN cover_key     VARCHAR(200);
ALTER TABLE releases ADD COLUMN review_note   VARCHAR(300);
ALTER TABLE releases ADD COLUMN created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMESTAMP WITH TIME ZONE '2026-01-01 00:00:00+00';
ALTER TABLE releases ADD COLUMN submitted_at  TIMESTAMP WITH TIME ZONE;
ALTER TABLE releases ADD COLUMN published_at  TIMESTAMP WITH TIME ZONE;
UPDATE releases SET published_at = created_at;
CREATE INDEX idx_releases_status ON releases (status, published_at);

ALTER TABLE tracks ADD COLUMN audio_key VARCHAR(200); -- the uploaded master in media storage
ALTER TABLE tracks DROP COLUMN audio_url; -- replaced by audio_key and signed play links

-- The uploader's answers about who owns the recording (one per release).
CREATE TABLE rights_declarations (
    release_id            VARCHAR(32)  PRIMARY KEY REFERENCES releases (id),
    signed_to_label       VARCHAR(10)  NOT NULL, -- YES, NO, NOT_SURE
    label_name            VARCHAR(120),
    released_before       BOOLEAN      NOT NULL,
    previous_distributor  VARCHAR(120),
    cover_or_samples      BOOLEAN      NOT NULL,
    label_letter_key      VARCHAR(200), -- signed permission from the label, required when signed_to_label = YES
    accepted_by           UUID         NOT NULL REFERENCES users (id),
    accepted_at           TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Money leaving Deegee for an artist's mobile money account.
CREATE TABLE withdrawals (
    id               UUID PRIMARY KEY,
    artist_id        VARCHAR(32)  NOT NULL REFERENCES artists (id),
    user_id          UUID         NOT NULL REFERENCES users (id),
    amount_ugx       BIGINT       NOT NULL CHECK (amount_ugx > 0),
    msisdn           VARCHAR(16)  NOT NULL,
    provider         VARCHAR(20)  NOT NULL,
    status           VARCHAR(12)  NOT NULL, -- REQUESTED, SENT, COMPLETED, FAILED, REJECTED
    provider_ref     VARCHAR(64)  NOT NULL UNIQUE,
    idempotency_key  VARCHAR(120) NOT NULL UNIQUE,
    review_note      VARCHAR(300),
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_withdrawals_artist ON withdrawals (artist_id, created_at);
CREATE INDEX idx_withdrawals_status ON withdrawals (status);

-- Holds withdrawal money between "taken from the artist's earnings" and "the provider confirmed it was paid".
INSERT INTO ledger_accounts (id, kind, owner_ref, balance_ugx, created_at)
VALUES ('485ac426-47ae-3bc1-8e13-112ff1b82633', 'PAYOUTS_IN_FLIGHT', 'system', 0, CURRENT_TIMESTAMP);
