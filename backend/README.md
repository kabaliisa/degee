# Deegee API

The server behind the Deegee app: phone sign-in, the catalogue, wallets, mobile money top-ups, purchases and gifts.

Java 21 · Spring Boot 4 · PostgreSQL 16 · Flyway

## Run it

```bash
cd backend
docker compose up -d          # Postgres on localhost:5432 (db/user/password: deegee)
mvn spring-boot:run
```

The API starts on `http://localhost:8080`. Flyway creates the tables and loads the same five artists and six releases the app shows.

In development no SMS is sent: the sign-in code is printed in the server log (`DEV ONLY: sign-in code for … is 123456`). Top-ups are approved automatically about two seconds after you start them, as if you'd entered your PIN.

## Test it

```bash
mvn test
```

The tests boot the whole API on an in-memory database and cover sign-in, the catalogue, and every money path: top-ups, signed webhooks delivered twice, purchases, already-owned songs, not enough money, retries with the same key, five purchases racing for one wallet, gifts, and a check that the whole ledger sums to zero.

## Try it with curl

```bash
B=http://localhost:8080
curl -X POST $B/v1/auth/otp -H 'content-type: application/json' -d '{"phone":"0772 123 456"}'
# read the code from the server log, then:
curl -X POST $B/v1/auth/verify -H 'content-type: application/json' -d '{"phone":"0772123456","code":"<code>"}'
T=<accessToken from the reply>

curl -X POST $B/v1/wallet/topups -H "Authorization: Bearer $T" -H 'content-type: application/json' \
  -H 'Idempotency-Key: topup-0001' -d '{"amountUgx":10000,"provider":"MTN_MOMO","phone":"0772123456"}'
curl $B/v1/wallet -H "Authorization: Bearer $T"
curl -X POST $B/v1/purchases -H "Authorization: Bearer $T" -H 'content-type: application/json' \
  -H 'Idempotency-Key: buy-r1-0001' -d '{"kind":"RELEASE","id":"r1"}'
curl -X POST $B/v1/gifts -H "Authorization: Bearer $T" -H 'content-type: application/json' \
  -H 'Idempotency-Key: gift-0001' -d '{"artistId":"a1","amountUgx":1000,"note":"Webale!"}'
```

## Endpoints

| | Endpoint | Sign-in |
|---|---|---|
| Ask for a code | `POST /v1/auth/otp` `{phone}` | no |
| Sign in | `POST /v1/auth/verify` `{phone, code}` → access + refresh token | no |
| New tokens | `POST /v1/auth/refresh` `{refreshToken}` | no |
| Me | `GET /v1/me`, `PATCH /v1/me` `{name}` | yes |
| Catalogue | `GET /v1/catalog/artists`, `/artists/{id}`, `/releases`, `/releases/{id}`, `/tracks?ids=`, `/search?q=` | no |
| Wallet | `GET /v1/wallet` → balance and activity | yes |
| Add money | `POST /v1/wallet/topups` `{amountUgx, provider, phone}`, then poll `GET /v1/wallet/topups/{id}` | yes |
| Buy | `POST /v1/purchases` `{kind: TRACK or RELEASE, id}` | yes |
| Gift | `POST /v1/gifts` `{artistId, amountUgx, note?}` | yes |
| Library | `GET /v1/me/library` → owned track IDs | yes |
| Provider result | `POST /v1/webhooks/mock-mobile-money` (signed) | signature |

Every request that moves money needs an `Idempotency-Key` header (8–100 letters, digits, `-` or `_`). Sending the same key again returns the first result and never charges twice.

Errors are JSON with a machine-readable `code`, e.g. `INSUFFICIENT_FUNDS` (with `shortBy`), `ALREADY_OWNED`, `GIFT_TOO_SMALL`, `WRONG_CODE`, `TOO_MANY_CODES`, `AMOUNT_OUT_OF_RANGE`, `WRONG_NETWORK`.

## How the money works

All money lives in a double-entry ledger (`ledger_accounts`, `ledger_transactions`, `ledger_entries`). Every transaction's entries add up to zero, so money is only ever moved, never created or lost. A user's wallet is one account; each artist has an earnings account; Deegee, UPRS, direct songwriter payouts and the mobile money provider each have one.

- **Top-up:** provider clearing −X, wallet +X, only once the provider confirms.
- **Song or release:** wallet −price. The song share (10%) goes to UPRS for society members and to the songwriter otherwise; Deegee keeps 20% of the rest; the artist gets the remainder. Rounding favours the artist. The rules are in `MoneySplits.java` and match `src/lib/money.ts` in the app.
- **Gift:** wallet −X, artist +95%, Deegee +5%.

A wallet is locked while it's being spent from, so two purchases at once can't overspend it, and the database refuses any wallet balance below zero.

The percentages and limits are placeholders until the business terms are final.

## Layout

```
src/main/java/app/deegee/api/
  auth/      phone sign-in, codes, tokens
  catalog/   artists, releases, songs, search
  wallet/    ledger, top-ups, purchases, gifts, webhooks
  common/    errors, hashing, current user
  config/    security, clock
src/main/resources/db/migration/   Flyway SQL (V4 is the demo catalogue)
```

## Configuration

| Variable | Default (development only) |
|---|---|
| `DEEGEE_DB_URL` / `DEEGEE_DB_USER` / `DEEGEE_DB_PASSWORD` | local `deegee` database |
| `DEEGEE_JWT_SECRET` | a dev secret; set a random 32+ character value anywhere real |
| `DEEGEE_WEBHOOK_SECRET` | a dev secret; set one per environment |

Not built yet: real SMS, real MTN/Airtel collections, artist uploads and payouts, audio streaming.
