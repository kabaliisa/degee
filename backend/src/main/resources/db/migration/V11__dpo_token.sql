-- DPO identifies a payment by a token it issues, not by Deegee's own reference. The token is what
-- verifyToken takes, and verifyToken is the only thing that decides whether a fan gets their song:
-- DPO's callback is unsigned, so it is asked rather than believed. Without the token stored there
-- is nothing to ask about.
ALTER TABLE payment_intents ADD COLUMN provider_token VARCHAR(80);
CREATE INDEX idx_payment_intents_provider_token ON payment_intents (provider_token);
