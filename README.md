# Deegee

Buy music straight from Ugandan artists, paying in UGX with MTN MoMo or Airtel Money. Think Bandcamp for Uganda.

This is the React Native app (Expo, TypeScript). It talks to the Deegee API in [`backend/`](backend/README.md): sign-in, the catalogue, checkout, purchases and gifts all go through the server. Mobile money is still simulated.

## Run it

Start the API first (see [`backend/README.md`](backend/README.md)), then:

```bash
npm install
npx expo start        # scan the QR code with Expo Go, or press w for the browser
```

**Selling music:** Profile → *Artist studio* → apply. To approve yourself, run the API with your number as an admin (see the backend README); *Review queue* then appears in your profile.

Sign in with any Ugandan mobile number. No SMS is sent in development: the 6-digit code is printed in the API server's terminal. There is no wallet to top up: buying a song or sending a gift sends one mobile money PIN prompt for that amount (in development it's approved automatically after about two seconds).

**On your phone:** the phone and the Mac must be on the same Wi-Fi. The app finds the API at port 8080 on the computer running Expo. If macOS asks whether Java may accept incoming connections, allow it. To point the app somewhere else (a tunnel, staging), set `EXPO_PUBLIC_API_URL`, e.g. `EXPO_PUBLIC_API_URL=https://api.example.com npx expo start`.

## The web app (PWA)

The browser build is the one that can take mobile money directly: no store sits between a fan and an
artist, so there is no 30% cut and no billing rule to work around. It installs to the home screen,
opens offline, and plays songs the fan has bought.

```bash
npm run build:web     # exports to dist/ and writes the offline file list
npx serve dist        # or any static host
```

The host must rewrite unknown paths to `index.html` (Netlify `_redirects`, Vercel `rewrites`, EAS
Hosting by default). The service worker falls back to the shell if a host doesn't, so deep links still
work, but the first visit to one is faster when the host does it.

What makes it an app rather than a website:

| | |
| --- | --- |
| `public/manifest.json` | Name, ink theme, standalone display, maskable icon |
| `public/sw.js` | Caches the app so it opens offline and costs little data to reopen |
| `scripts/build-web.mjs` | Lists what to hold offline: code and fonts from the start, photos as they are seen |
| `src/lib/offlineAudio.web.ts` | Bought songs saved in the browser and played from there |
| `src/lib/mediaSession.web.ts` | Title, artist and cover on the lock screen, with working buttons |
| `src/lib/install.web.ts` | "Add to home screen", one tap on Android, the share-sheet route on iOS |

Each of these has a `.ts` twin that does nothing, which is what the native builds use.

**Set `DEEGEE_CORS_ORIGINS` on the API to wherever the site is served from**, or the browser blocks every
request. In development `http://localhost:8081` is already allowed; a production build served elsewhere
needs its own origin adding.

**iPhone is the open question.** Safari has a long history of stopping a PWA's audio when the screen
locks. Test it on a real iPhone before relying on it: install to the home screen, play a saved song, lock
the phone. Android (Chrome) handles background audio, the lock screen and installing properly. If iOS
can't hold a song through a screen lock, that is the argument for a listen-only native iOS app, which
Apple's reader rule allows because nothing is sold inside it.

**Checked end to end in a real browser** against a production build: the service worker registers, the
app installs, a song is bought and saved, and with the network cut the app still opens, still knows what
you own, and still plays it.

## Checks (run all three before every commit)

```bash
npm run lint          # ESLint with Expo's rules
npm run typecheck     # TypeScript, strict mode
npm test              # money splits, phone numbers, API mapping
```

## Folder structure

```
src/
  app/                 Screens. Expo Router: every file is a route.
    (tabs)/            Home, Explore, My music, Profile + the tab bar layout
    artist/[id].tsx    Artist page
    release/[id].tsx   Single / EP / album page
    player.tsx         Full-screen player
    buy.tsx            Checkout
    gift.tsx           Send an artist a gift
    profile.tsx        Profile
    settings.tsx       Settings
    sign-in.tsx        Phone number + code
    studio/            Artist mode: apply, studio home, new release, release editor, song, rights, withdraw
    admin.tsx          Review queue (admins only)
  api/                 Everything that talks to the server
    client.ts          fetch wrapper: tokens, refresh, errors (ApiError)
    config.ts          API address
    catalog.ts         Catalogue, loaded once at startup and read from memory
    account.ts         Sign-in and profile
    checkout.ts        Pay for a song, release or gift with one PIN prompt
    wallet.ts          Deegee credit, purchase history, library
    studio.ts          Artist mode, uploads, earnings, withdrawals, play links
    admin.ts           Review queue
    mappers.ts         API JSON ↔ app types
    types.ts           Artist, Release, Track, WalletTx …
  components/
    ui/                Shared building blocks: buttons, cards, rows, empty state
    artist/ player/ checkout/ profile/ studio/   Pieces used by one area
    Art.tsx            Cover/artist image with pattern fallback
  hooks/               useLoad: fetch data when a screen comes into focus
  lib/                 Pure logic, no React: money, phone numbers, formatting, theme
  store/               App state (Zustand): session (tokens, in the Keychain), wallet (credit, history and owned songs, from the server), player, likes, settings
```

### Conventions

- **Screens stay thin.** A screen wires data and state together; reusable or self-contained UI goes in `components/`.
- **Data goes through `src/api`.** Screens never call `fetch` directly.
- **The server owns money.** The app shows the balance the API returns and never changes it locally. Every money action sends an `Idempotency-Key` created once per screen (`src/lib/ids.ts`), so retries can't charge twice.
- **Styles live in `StyleSheet.create`** at the bottom of each file. Only values computed at runtime (sizes, insets, progress) are inline.
- **Design tokens only.** Colours, fonts, spacing and radii come from `src/lib/theme.ts`; no hard-coded values in screens.
- **Money is whole Ugandan shillings** (integers). All split rules live in `src/lib/money.ts` and are tested; rounding always favours the artist and never loses a shilling.
- **Pure logic gets tests** next to it (`*.test.ts`).

## Money rules (placeholders until contracts are signed)

Set in `TERMS` in `src/lib/money.ts`:

- **Sales:** 10% of each sale is the song share, split per songwriter: UPRS members and foreign-society writers through UPRS, writers in no society paid directly. Of the rest, Deegee keeps 20% and the artist gets the remainder.
- **Gifts:** the artist gets 95% and Deegee keeps 5%. Gifts are not song sales, so there's no songwriter share.

## Next

1. When the catalogue outgrows one response, switch `src/api/catalog.ts` to paged endpoints behind TanStack Query hooks.
2. Real SMS and real MTN/Airtel collections (server side; the app needs no changes).
3. Move UI text into translation files so the Luganda setting can work.

## Known placeholders

Help and support and Terms do nothing yet. Songs with an uploaded recording play for real: buyers and the artist hear the full stream, everyone else the 30-second preview the server cuts. The demo songs have no recordings, so their playback is simulated on a timer. Covers and artist photos are placeholder portraits shipped in `assets/photos` (cropped from the design mockups) until artists upload their own. Supporter and buyer counts are placeholders.
