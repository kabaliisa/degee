# Deegee API

The server behind the Deegee app: phone sign-in, the catalogue, wallets, mobile money top-ups, purchases and gifts.

Java 21 · Spring Boot 4 · PostgreSQL 16 · Flyway · ffmpeg

## Run it

```bash
brew install ffmpeg           # once: encodes previews and streams (apt install ffmpeg on Linux)
cd backend
docker compose up -d          # Postgres on localhost:5432 (db/user/password: deegee)
mvn spring-boot:run
```

Without ffmpeg the API still runs, but uploaded songs stay "Processing…" (it says so in the log at startup). Once it's installed, restart the API and anything waiting is processed.

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
| Whole catalogue | `GET /v1/catalog` → artists, releases, tracks (what the app loads at startup) | no |
| Catalogue | `GET /v1/catalog/artists`, `/artists/{id}`, `/releases`, `/releases/{id}`, `/tracks?ids=`, `/search?q=` | no |
| Wallet | `GET /v1/wallet` → balance and activity | yes |
| Add money | `POST /v1/wallet/topups` `{amountUgx, provider, phone}`, then poll `GET /v1/wallet/topups/{id}` | yes |
| Buy | `POST /v1/purchases` `{kind: TRACK or RELEASE, id}` | yes |
| Gift | `POST /v1/gifts` `{artistId, amountUgx, note?}` | yes |
| Library | `GET /v1/me/library` → owned track IDs | yes |
| Play a recording | `GET /v1/tracks/{id}/play` → short-lived link (buyers, the artist, admins) | yes |
| Files | `GET /v1/media/covers/…` public; `/v1/media/audio/…` and `/letters/…` only by signed link | link |
| Artist profile | `GET /v1/artist/me`, `POST /v1/artist/application` `{name, city, bio, genres, payoutPhone}` | yes |
| Releases | `GET/POST /v1/artist/releases`, `GET/PATCH/DELETE /v1/artist/releases/{id}` | yes |
| Uploads (multipart, part `file`) | `PUT …/releases/{id}/cover`, `PUT …/tracks/{trackId}/audio`, `PUT …/releases/{id}/label-letter` | yes |
| Songs | `POST …/releases/{id}/tracks` `{title, priceUgx, writers}`, `PATCH/DELETE …/tracks/{trackId}` | yes |
| Rights | `PUT …/releases/{id}/declaration`, then `POST …/releases/{id}/submit` | yes |
| Earnings | `GET /v1/artist/earnings`, `POST /v1/artist/withdrawals` `{amountUgx}` | yes |
| Review (admins) | `GET /v1/admin/queue`; `POST /v1/admin/{artists,releases,withdrawals}/{id}/approve` or `/reject` `{note}` | admin |
| Provider result | `POST /v1/webhooks/mock-mobile-money` (signed; `MOCKPAY-` references are withdrawals) | signature |

Every request that moves money needs an `Idempotency-Key` header (8–100 letters, digits, `-` or `_`). Sending the same key again returns the first result and never charges twice.

Errors are JSON with a machine-readable `code`, e.g. `INSUFFICIENT_FUNDS` (with `shortBy`), `ALREADY_OWNED`, `GIFT_TOO_SMALL`, `WRONG_CODE`, `TOO_MANY_CODES`, `AMOUNT_OUT_OF_RANGE`, `WRONG_NETWORK`.

## The artist side

1. **Apply.** A signed-in user applies with a stage name, city, genres and the mobile money number they want to be paid on. An admin approves (they get the verified badge) or sends it back with a note. Names are unique, so nobody can sign up as an artist who's already here.
2. **Prepare a release.** Single (1–3 songs), EP (2–8) or album (5+). Each song needs a recording (MP3, M4A, WAV or FLAC that really decodes, 30 seconds to 20 minutes; its length is read from the file) and songwriters whose shares add up to 100%. The whole release can't cost more than its songs bought separately.
3. **Declare the rights.** Signed to a label? Then a signed permission letter from the label is required. Not sure? Allowed, but flagged for the reviewer. Released before? The reviewer sees where. Covers and samples are refused for now. The artist confirms they own or control the recordings; who confirmed and when is stored.
4. **Review.** Submitting moves the release to `IN_REVIEW`. The admin queue shows flags (label deal, released before, first release), lets the reviewer listen to each song and open the letter, then publish or send back with a note. Only `PUBLISHED` releases by `ACTIVE` artists are in the catalogue or can be bought.
5. **Earnings and withdrawals.** Sales and gifts land in the artist's earnings account at once but are held before they can be withdrawn: 7 days, or 30 days for an artist's first 60 days, so money is there if a rights claim turns up. A withdrawal moves the money to *payouts in flight* immediately (it can't be spent twice), the artist's first withdrawal waits for an admin, later ones go straight out, and a failed or declined one comes back. Minimum UGX 10,000.

Labels with their own accounts, rights claims and audio fingerprinting come later (backlog Sprints 5 and 6).

## The audio pipeline

Every uploaded recording goes through ffmpeg in the background (two at a time); the song shows *Processing…* in the studio until it's done, usually a few seconds:

1. **Measure** its loudness with the EBU R128 meter (integrated LUFS and true peak).
2. **Stream** for buyers: AAC 128 kbps stereo, about 1 MB a minute against about 10 MB for a WAV, set up to start playing at once.
3. **Preview** for everyone else: 30 seconds from about a third of the way in, faded in and out, AAC 96 kbps, public (no signed link).

Both are matched to −14 LUFS so songs play at a similar volume: loud songs are turned down, quiet ones up by at most 10 dB and never past −1 dBTP, so nothing clips. The master is kept untouched for lossless downloads later. MP3 and M4A uploads work, but the studio suggests the WAV or FLAC master. A song can't be submitted while it's processing or if processing failed (the artist is told to upload again). Songs left half-done by a restart, and recordings uploaded before the pipeline existed, are processed at startup.

Still to come: several bitrates with HLS so playback adapts to the connection (DG-02), and the Data saver setting (DG-08).

**Becoming an admin locally:** start the API with your number in `DEEGEE_ADMIN_PHONES` and sign in with it; *Review queue* appears in the app's profile. To try withdrawals without waiting for the holds, set them to zero:

```bash
DEEGEE_ADMIN_PHONES=0772123456 DEEGEE_SALE_HOLD=0s DEEGEE_NEW_ARTIST_HOLD=0s mvn spring-boot:run
```

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
  auth/      phone sign-in, codes, tokens, roles
  catalog/   artists, releases, songs, search (published only)
  studio/    artist applications, releases, uploads, rights declarations, review
  payouts/   earnings, holds, withdrawals
  admin/     the review queue
  audio/     the audio pipeline: loudness, streams, previews (ffmpeg)
  media/     file storage, signed links, play links
  wallet/    ledger, top-ups, purchases, gifts, webhooks
  common/    errors, hashing, current user
  config/    security, clock
src/main/resources/db/migration/   Flyway SQL (V4 is the demo catalogue, V5 the artist side, V6 the audio pipeline)
```

## Configuration

| Variable | Default (development only) |
|---|---|
| `DEEGEE_DB_URL` / `DEEGEE_DB_USER` / `DEEGEE_DB_PASSWORD` | local `deegee` database |
| `DEEGEE_JWT_SECRET` | a dev secret; set a random 32+ character value anywhere real |
| `DEEGEE_WEBHOOK_SECRET` | a dev secret; set one per environment |
| `DEEGEE_CORS_ORIGINS` | `http://localhost:8081,http://localhost:19006` (the Expo web dev server) |
| `DEEGEE_ADMIN_PHONES` | none; comma-separated numbers that get admin rights when they sign in |
| `DEEGEE_MEDIA_DIR` | `./media`; where uploads are stored (object storage in production) |
| `DEEGEE_SALE_HOLD` / `DEEGEE_NEW_ARTIST_HOLD` | `7d` / `30d` |
| `DEEGEE_FFMPEG` | `ffmpeg` (on the PATH); a full path if it's elsewhere |

Not built yet: real SMS, real MTN/Airtel collections and payouts, adaptive (HLS) streaming, fingerprinting, label accounts and rights claims. The full list is in the GitHub issues.
