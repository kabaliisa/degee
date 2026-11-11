-- Double-entry ledger. Every money movement is one transaction whose entries sum to zero.
-- Balances are cached on the account and updated in the same database transaction.
CREATE TABLE ledger_accounts (
    id           UUID PRIMARY KEY,
    kind         VARCHAR(30)  NOT NULL, -- USER_WALLET, ARTIST_EARNINGS, PLATFORM_REVENUE, UPRS_PAYABLE, SONGWRITERS_PAYABLE, PROVIDER_CLEARING
    owner_ref    VARCHAR(64)  NOT NULL, -- user id, artist id, or 'system'
    balance_ugx  BIGINT       NOT NULL DEFAULT 0,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (kind, owner_ref),
    -- Last line of defence: a listener's wallet can never go below zero.
    CONSTRAINT wallet_not_negative CHECK (kind <> 'USER_WALLET' OR balance_ugx >= 0)
);

CREATE TABLE ledger_transactions (
    id               UUID PRIMARY KEY,
    type             VARCHAR(20)  NOT NULL, -- TOPUP, PURCHASE, GIFT
    user_id          UUID         REFERENCES users (id),
    reference        VARCHAR(64), -- track id, release id, artist id or payment intent id
    description      VARCHAR(200) NOT NULL,
    idempotency_key  VARCHAR(120) UNIQUE, -- '<user id>:<client key>'
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_ledger_tx_user ON ledger_transactions (user_id, created_at);

CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY,
    transaction_id  UUID   NOT NULL REFERENCES ledger_transactions (id),
    account_id      UUID   NOT NULL REFERENCES ledger_accounts (id),
    amount_ugx      BIGINT NOT NULL CHECK (amount_ugx <> 0) -- positive = into the account
);
CREATE INDEX idx_ledger_entries_tx ON ledger_entries (transaction_id);
CREATE INDEX idx_ledger_entries_account ON ledger_entries (account_id);

-- Mobile money top-ups, from request to provider confirmation.
CREATE TABLE payment_intents (
    id               UUID PRIMARY KEY,
    user_id          UUID         NOT NULL REFERENCES users (id),
    provider         VARCHAR(20)  NOT NULL, -- MTN_MOMO, AIRTEL_MONEY
    msisdn           VARCHAR(16)  NOT NULL,
    amount_ugx       BIGINT       NOT NULL CHECK (amount_ugx > 0),
    status           VARCHAR(12)  NOT NULL, -- PENDING, COMPLETED, FAILED
    provider_ref     VARCHAR(64)  NOT NULL UNIQUE,
    transaction_id   UUID         REFERENCES ledger_transactions (id),
    idempotency_key  VARCHAR(120) NOT NULL UNIQUE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_payment_intents_user ON payment_intents (user_id, created_at);

-- Songs a user owns and may play in full.
CREATE TABLE entitlements (
    user_id         UUID         NOT NULL REFERENCES users (id),
    track_id        VARCHAR(32)  NOT NULL REFERENCES tracks (id),
    transaction_id  UUID         NOT NULL REFERENCES ledger_transactions (id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, track_id)
);

CREATE TABLE gifts (
    id              UUID PRIMARY KEY,
    user_id         UUID         NOT NULL REFERENCES users (id),
    artist_id       VARCHAR(32)  NOT NULL REFERENCES artists (id),
    amount_ugx      BIGINT       NOT NULL CHECK (amount_ugx > 0),
    note            VARCHAR(140),
    transaction_id  UUID         NOT NULL REFERENCES ledger_transactions (id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL
);

-- System accounts. Ids are UUID.nameUUIDFromBytes("<KIND>:system"), the same as LedgerAccount.idFor in code.
INSERT INTO ledger_accounts (id, kind, owner_ref, balance_ugx, created_at) VALUES
    ('1be3e640-6ec7-3594-9336-9283e8da5fc2', 'PLATFORM_REVENUE',    'system', 0, CURRENT_TIMESTAMP),
    ('0d70600b-dbad-3817-a5c9-35042e8ac76e', 'UPRS_PAYABLE',        'system', 0, CURRENT_TIMESTAMP),
    ('766ed1e4-f88f-3378-b378-12bb1adf5d18', 'SONGWRITERS_PAYABLE', 'system', 0, CURRENT_TIMESTAMP),
    ('1e9a8e3f-6987-363b-bd1d-11e97bd68349', 'PROVIDER_CLEARING',   'system', 0, CURRENT_TIMESTAMP);
