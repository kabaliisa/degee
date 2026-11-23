-- Where to reach a person, and what they want to be reached about.

-- One row per device. A person signs in on a new phone and gets another row; Expo tells us when a
-- token has died (DeviceNotRegistered) and we delete it then, so this table stays roughly the set of
-- phones that can actually be reached.
CREATE TABLE push_tokens (
    id           UUID PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- An Expo token is "ExponentPushToken[...]", well under this; the column is the device's identity.
    token        VARCHAR(255) NOT NULL UNIQUE,
    platform     VARCHAR(16)  NOT NULL, -- ios, android, web, unknown
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_push_tokens_user ON push_tokens (user_id);

-- One row per person, written the first time they move a switch. No row means everything on, so
-- somebody who never opens settings still hears about a sale.
CREATE TABLE notification_prefs (
    user_id    UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    sales      BOOLEAN NOT NULL DEFAULT TRUE,
    gifts      BOOLEAN NOT NULL DEFAULT TRUE,
    payouts    BOOLEAN NOT NULL DEFAULT TRUE,
    releases   BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
