-- A song, release or gift paid for directly with mobile money, in one step (no separate wallet top-up).
-- The payment (a payment_intent) puts the money into the fan's Deegee credit; the order spends it at once.
-- If the order can't be completed after the money arrives (say the fan bought the same song on another
-- phone in the meantime), the money stays as credit and is used first at their next checkout.
CREATE TABLE checkout_orders (
    id                 UUID PRIMARY KEY,
    user_id            UUID         NOT NULL REFERENCES users (id),
    kind               VARCHAR(10)  NOT NULL, -- TRACK, RELEASE, GIFT
    item_id            VARCHAR(40)  NOT NULL, -- a track, release or (for a gift) artist id
    amount_ugx         BIGINT       NOT NULL CHECK (amount_ugx > 0), -- the price, or the size of the gift
    note               VARCHAR(140),          -- a gift's message
    collect_ugx        BIGINT       NOT NULL, -- asked for on the phone; 0 when credit covered it all
    payment_intent_id  UUID         REFERENCES payment_intents (id),
    status             VARCHAR(12)  NOT NULL, -- WAITING, COMPLETED, DECLINED, CREDITED
    failure_code       VARCHAR(40),
    failure_message    VARCHAR(200),
    transaction_id     UUID         REFERENCES ledger_transactions (id), -- the purchase or gift
    idempotency_key    VARCHAR(120) NOT NULL UNIQUE,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_checkout_orders_intent ON checkout_orders (payment_intent_id);
CREATE INDEX idx_checkout_orders_user ON checkout_orders (user_id, created_at);
