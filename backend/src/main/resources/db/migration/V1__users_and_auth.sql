-- Listeners and artists sign in with their phone number.
CREATE TABLE users (
    id          UUID PRIMARY KEY,
    phone       VARCHAR(16)  NOT NULL UNIQUE, -- E.164, e.g. +256772123456
    name        VARCHAR(40),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);

-- One row per code we send. Only a hash of the code is stored.
CREATE TABLE otp_challenges (
    id           UUID PRIMARY KEY,
    phone        VARCHAR(16)  NOT NULL,
    code_hash    VARCHAR(64)  NOT NULL,
    attempts     INTEGER      NOT NULL DEFAULT 0,
    expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at  TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_otp_phone_created ON otp_challenges (phone, created_at);

-- Long-lived refresh tokens, rotated on every use. Only a hash is stored.
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id),
    token_hash  VARCHAR(64)  NOT NULL UNIQUE,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at  TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_refresh_user ON refresh_tokens (user_id);
