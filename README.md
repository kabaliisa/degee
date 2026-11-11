# Deegee

Buy music straight from Ugandan artists, paying in UGX with MTN MoMo or Airtel Money. Think Bandcamp for Uganda.

This is the React Native app (Expo, TypeScript). It talks to the Deegee API in [`backend/`](backend/README.md): sign-in, the catalogue, the wallet, purchases and gifts all go through the server. Mobile money is still simulated.

## Run it

Start the API first (see [`backend/README.md`](backend/README.md)), then:

```bash
npm install
npx expo start        # scan the QR code with Expo Go, or press w for the browser
```

**Selling music:** Profile → *Artist studio* → apply. To approve yourself, run the API with your number as an admin (see the backend README); *Review queue* then appears in your profile.

Sign in with any Ugandan mobile number. No SMS is sent in development: the 6-digit code is printed in the API server's terminal. New numbers get an account with an empty wallet; add money from the Wallet tab (it's approved automatically after about two seconds).

**On your phone:** the phone and the Mac must be on the same Wi-Fi. The app finds the API at port 8080 on the computer running Expo. If macOS asks whether Java may accept incoming connections, allow it. To point the app somewhere else (a tunnel, staging), set `EXPO_PUBLIC_API_URL`, e.g. `EXPO_PUBLIC_API_URL=https://api.example.com npx expo start`.

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
    (tabs)/            Home, Search, Your music, Wallet + the tab bar layout
    artist/[id].tsx    Artist page
    release/[id].tsx   Single / EP / album page
    player.tsx         Full-screen player
    buy.tsx            Checkout
    topup.tsx          Add money (mobile money)
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
    wallet.ts          Wallet, top-ups, purchases, gifts, library
    studio.ts          Artist mode, uploads, earnings, withdrawals, play links
    admin.ts           Review queue
    mappers.ts         API JSON ↔ app types
    types.ts           Artist, Release, Track, WalletTx …
  components/
    ui/                Shared building blocks: buttons, cards, rows, empty state
    home/ artist/ player/ checkout/ wallet/ profile/ studio/   Pieces used by one area
    Art.tsx            Cover/artist image with pattern fallback
  hooks/               useLoad: fetch data when a screen comes into focus
  lib/                 Pure logic, no React: money, phone numbers, formatting, theme
  store/               App state (Zustand): session (tokens, in the Keychain), wallet (from the server), player, likes, settings
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

Shuffle, repeat, Help and support, "Sell on Deegee" and Terms do nothing yet. Audio is simulated for songs without an `audioUrl`. Cover photos are placeholder stock photos. Supporter and buyer counts are placeholders.
