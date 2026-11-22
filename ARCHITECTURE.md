# Deegee architecture

As of 22 November 2026.

Deegee is one Expo codebase serving phone, desktop and the public website, talking to a Spring
Boot API over Postgres. Every shilling moves through a double-entry ledger, which is the one
design decision the rest of the system is arranged around.

```
            ┌──────────────── One Expo codebase, TypeScript ────────────────┐
            │   Phone app                        Website and PWA            │
            │   iOS and Android, built with EAS  static export, CF Pages    │
            └───────────────────────────────┬──────────────────────────────-┘
                                            │ HTTPS, JWT access + refresh
            ┌───────────────────────────────▼──────────────────────────────┐
            │  Deegee API — Spring Boot 4.1 on Java 21, hosted on Render   │
            │  auth · catalog · wallet (ledger) · studio · payouts ·       │
            │  admin · audio · media                                       │
            │  The server owns money; the app only displays what it returns│
            └──────┬─────────────────────┬──────────────────────┬──────────┘
                   │                     │                      │
          ┌────────▼───────┐  ┌──────────▼───────┐  ┌───────────▼─────────┐
          │ Neon Postgres  │  │  Cloudflare R2   │  │   Mobile money      │
          │ catalogue,     │  │  audio, artwork  │  │   MTN and Airtel    │
          │ users, ledger  │  │  written, not on │  │   simulated, no     │
          │ Ohio (→ EU)    │  │                  │  │   aggregator yet    │
          └────────────────┘  └──────────────────┘  └─────────────────────┘
```

The phone app and the website are the same code, so a screen built once appears on all three.
Nothing but the API touches the database, and nothing but the ledger moves money.

## Where it runs

Four managed services, no servers to patch and nothing on AWS. Each does one job, and each can be
swapped without touching the other three.

| Piece | What it is | Job in Deegee | Cost now |
| --- | --- | --- | --- |
| Cloudflare Pages | Static file host with a global CDN | Serves the website and PWA | Free |
| Render | Runs a container from the repo | Runs the Spring Boot API | Free tier, sleeps when idle |
| Neon | Managed Postgres that scales to zero | The whole database | Free tier |
| Cloudflare R2 | Object storage, no charge to read out | Audio and artwork | Not switched on |

Under 5,000 users this stays in the region of 25 to 50 USD a month. The first real bill is Render,
once the API can no longer be allowed to sleep.

The CDN matters more than it looks. Uganda is far from every one of these regions, so the website
is fast only because Cloudflare keeps a copy near Kampala. The API has no such copy, which is why
its region is worth getting right.

Both halves run in Frankfurt, moved there on 22 November 2026. Ohio was roughly 11,900 km from
Kampala; Frankfurt is about 5,900 km and is the only European option either platform offers.
Uganda is landlocked, so its traffic runs overland to Mombasa and then north through the Red Sea
cables to Europe — Frankfurt is where that path already goes. Nairobi would be better; nobody
offers it.

Neither platform can move a running service: Render fixes a region at service creation and Neon at
project creation, so the move meant building both halves again and cutting over. The runbook is in
DEPLOY.md, and it is worth keeping: the same work is needed for any future region change, and it
gets dearer the more real money sits in the ledger.

## How money moves

No balance is ever edited. Every movement is a transaction whose lines sum to zero, written by one
class, `Ledger.post`, which throws if they do not. A bug can therefore lose a sale, but it cannot
create or destroy a shilling, and any balance can be rebuilt from the entries.

Money is whole Ugandan shillings as integers. There are no floats anywhere in the money path.

Seven account kinds hold it:

| Account | Whose money | One per |
| --- | --- | --- |
| `USER_WALLET` | A fan's | User |
| `ARTIST_EARNINGS` | An artist's, until withdrawn | Artist |
| `PAYOUTS_IN_FLIGHT` | An artist's, mid-withdrawal | System |
| `UPRS_PAYABLE` | The society's | System |
| `SONGWRITERS_PAYABLE` | Writers in no society | System |
| `PLATFORM_REVENUE` | Deegee's | System |
| `PROVIDER_CLEARING` | Cash at the mobile money provider | System |

Account ids are deterministic — a UUID v3 of `KIND:owner` — so seed data and code agree without a
lookup.

The split rules are placeholders until the UPRS licence and artist terms are signed, and they live
in two places that must agree: `MoneySplits.java` on the server and `src/lib/money.ts` in the app,
tested against the same cases in both. The server is the one that actually moves money.

- **A sale.** 10% is the song share, divided per songwriter: society members through UPRS, others
  paid directly. Of what is left, Deegee keeps 20% and the artist takes the rest. Rounding
  remainders go to the artist.
- **A gift.** The artist takes 95%, Deegee 5%. A gift is not a song sale, so no songwriter share.

Two consequences fall out of the design rather than being added to it. `PROVIDER_CLEARING` runs
negative, because a top-up moves money out of it into a wallet, so the cash Deegee holds is its
mirror image. And since every account is in the same system, the liabilities plus Deegee's revenue
must equal that cash — the admin screen subtracts the two and shows the difference. Zero is the
only right answer.

## The API

One Spring Boot service, split into packages by what they are responsible for rather than by
layer. There are no `controllers`, `services` and `repositories` folders; `wallet` holds its own
controller, service, entities and repositories together, so a change to how money moves touches
one directory.

| Package | Holds |
| --- | --- |
| `auth` | Phone sign-in by one-time code, JWT access and refresh tokens, roles |
| `catalog` | Artists, releases, tracks, and what the public may see |
| `wallet` | The ledger, checkout, purchases, gifts, top-ups |
| `studio` | Artist mode: applications, uploads, earnings, their own insights |
| `payouts` | Withdrawals to mobile money, and the hold before one is allowed |
| `admin` | The review queue, the decisions, and Deegee's own insights |
| `audio` | Loudness analysis, transcoding, the 30-second preview cut |
| `media` | Storing and serving audio and artwork |

Schema changes go through Flyway, eight migrations so far, never through Hibernate's auto-DDL.

The endpoints worth knowing:

| Endpoint | Does |
| --- | --- |
| `POST /v1/auth/otp`, `/verify`, `/refresh` | Sign in with a phone number and a code |
| `GET /v1/catalog` | The whole catalogue in one response, cached in the app |
| `POST /v1/checkout` | Buy a track or release, or send a gift, in one call |
| `POST /v1/webhooks/mock-mobile-money` | Where a real aggregator will confirm payment |
| `GET /v1/tracks/{id}/play` | A signed link: the full song for owners, a preview for everyone |
| `GET /v1/artist/insights` | An artist's own numbers; takes no id, so it can only be theirs |
| `GET /v1/admin/insights` | Deegee's numbers across every artist; admins only |

Three rules hold across all of them:

- Every money call carries an `Idempotency-Key` created once per screen, so a retry cannot charge
  twice.
- An artist cannot buy from or gift to their own catalogue, which would move money in a circle and
  inflate their sales.
- Admin is a role granted at sign-in to the phone numbers in `DEEGEE_ADMIN_PHONES`, so adding or
  removing an admin takes effect the next time they sign in, with no deploy.

69 tests run against a real Postgres, not an in-memory stand-in.

## The app

Expo Router: every file under `src/app` is a route, and the same files render on iOS, Android and
the web. Anything that is not a route lives outside that folder.

The layout is decided at runtime rather than in CSS, because React Native has no media queries.
`src/lib/breakpoints.ts` reads the window width and returns `phone`, `wide` (760 and up) or
`wider` (1100 and up), plus how many columns a grid should use. Above 760 the root layout swaps the
tab bar for a sidebar and docks the player along the bottom, which is why the desktop site looks
like Spotify rather than a stretched phone.

Artists sit at the top level of the routing table, so an artist's name is their whole address:
`deegee.ug/apass`. `src/app/[slug].tsx` resolves it, `src/lib/slug.ts` derives the slug and holds
the reserved words a handle may not take, and the old `/artist/{id}` paths 301 to the new ones
through a `_redirects` file written at build time.

State is split by how long it needs to live:

| Store | Holds | Kept in |
| --- | --- | --- |
| `session` | Tokens and the signed-in user | Keychain or Keystore; browser storage on web |
| `wallet` | Balance, purchases, what you own | Server, cached |
| `player` | Queue and what is playing | Memory |
| `offline`, `likes`, `settings` | Saved songs, likes, preferences | Device |

Four conventions carry most of the consistency:

- Screens stay thin and never call `fetch`; everything goes through `src/api`.
- Colours, fonts, spacing and radii come only from `src/lib/theme.ts`.
- Styles sit in a `StyleSheet.create` at the bottom of each file, with only runtime values inline.
- Pure logic gets a test beside it.

The look: near-black with warmth in it, so photographs of artists belong on it. Gold carries every
action and every price. Red appears only as a short rule under a heading, never as a fill or a
button.

## The website

The browser build is the one that can take mobile money directly. No store sits between a fan and
an artist, so there is no 30% cut and no billing rule to work around. That makes it the commercial
centre of the product rather than a marketing site, and the native apps the convenience.

Every page is written out as its own HTML file at build time, so a search engine or a WhatsApp
preview sees real content without running any JavaScript. `npm run build:web` runs four steps in
order: take a snapshot of the catalogue into the repo, export the site, write the SEO tags and
redirects, then list what the service worker should hold offline.

That ordering has a consequence worth remembering: **a new release has no page of its own until the
next build.** Publishing should trigger a rebuild.

Anyone can browse, open an artist or a release, and hear the 30-second previews without an account.
A phone number is only asked for at the point of paying. This is also what makes the site findable,
since a search result that demanded a login would rank as a login page.

What makes it an app rather than a page: a manifest, a service worker that caches the shell, bought
songs saved in the browser and played from there, lock-screen controls, and an install prompt. Each
of these has a do-nothing twin with a `.ts` extension that the native builds use instead.

Two things here have already bitten and are worth not repeating:

- The service worker must not call `skipWaiting()` on install. Activating over a live page deletes
  the cache the running build is still reading from, and the open app goes blank.
- The build hash is written into `sw.js`, because a browser only installs a new worker when that
  file's own bytes change. Without it, everyone keeps the build they first visited however many
  times you deploy.

iPhone is the open question. Safari has a long history of stopping a PWA's audio when the screen
locks. If it cannot hold a song through a lock, that is the argument for a listen-only native iOS
app, which Apple's reader rule allows because nothing is sold inside it.

## What changed

The decisions that moved the architecture, newest first. Cosmetic work is left out.

| Date | Change | Why it matters |
| --- | --- | --- |
| 22 Nov 2026 | Both halves moved from Ohio to Frankfurt | Roughly halves the distance to Kampala; needed rebuilding both services, since neither region can be changed |
| 22 Nov 2026 | Admin insights, `GET /v1/admin/insights` | Makes the float auditable: liabilities checked against cash in, and a gap shown |
| 22 Nov 2026 | Artist insights, `GET /v1/artist/insights` | Earnings read from the ledger, not counted from orders, so wallet-paid and directly-paid sales agree |
| 19 Nov 2026 | Artists moved to the top-level route | An artist's name becomes their address; old paths 301 |
| 19 Nov 2026 | Runtime breakpoints and a sidebar shell | One codebase now serves phone, tablet and desktop properly |
| 17 Nov 2026 | `skipWaiting()` removed from the service worker | A deploy no longer blanks an app someone has open |
| Earlier | Double-entry ledger replaced direct balance writes | Money became auditable and impossible to create by accident |
| Earlier | Checkout collapsed to one call and one PIN prompt | A fan pays once instead of topping up and then buying |

The two oldest entries are the ones the rest of the system now rests on. The ledger is what made
both insights screens possible at all, and the single-call checkout is what makes the website
viable without an app store.

## Known gaps

What is not built, not decided, or knowingly wrong. Roughly in the order they would hurt.

**Media is on Render's disk.** That disk is wiped on every deploy, so uploaded audio and artwork do
not survive one, and every byte a fan streams is billed as Render bandwidth. The R2 code is written
and not switched on; it needs a bucket, an API token, and `DEEGEE_R2_ACCOUNT_ID`, `DEEGEE_R2_BUCKET`,
`DEEGEE_R2_ACCESS_KEY` and `DEEGEE_R2_SECRET_KEY` set in Render. This blocks artist photo uploads as
well.

**No payment aggregator.** Mobile money is simulated end to end. A real one has to be chosen,
contracted and integrated at the webhook that already exists for it. Nothing else about the money
path should need to change.

**The database is on Neon's pooled endpoint.** That is PgBouncer in transaction mode in front of
HikariCP, which already pools. pgjdbc moves to server-side prepared statements after a few
executions and transaction pooling breaks them, so this surfaces under load rather than at
startup. Switch `DEEGEE_DB_URL` to the direct endpoint.

**Artists cannot edit their own profile.** There is no endpoint and no screen. Name, bio, city and
genres are fixed at application.

**There is no artist photo field.** Photos are placeholder portraits shipped in the repo.

**Slugs are derived, not stored.** An artist's address comes from their name, so a rename silently
breaks every link anyone has shared. Storing a chosen handle fixes it.

**`deegee.ug` is not registered.** It is referenced in the build and in CORS but does not resolve.

**One artist, two accounts.** The own-music check matches the artist profile's owner, so a second
account could buy that artist's own catalogue. Closing it properly means identity checks rather
than a code change.

**iPhone background audio is untested on a real device.**
