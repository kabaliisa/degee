# Deegee

Buy music straight from Ugandan artists, paying in UGX with MTN MoMo or Airtel Money.

This is the React Native (Expo) app, running on **mock data**: no backend yet. Payments are simulated.

## What works

- **Discover:** exclusive release banner, new releases, genres, artists, fresh tracks
- **Search** by artist, song or genre
- **Artist and release pages**, with a share link for artists to post on WhatsApp/TikTok
- **30-second previews** for songs you don't own; full playback for songs you do
- **Checkout** showing where the money goes (artist / songwriters incl. UPRS / Deegee)
- **Wallet:** top up via a simulated MoMo/Airtel PIN prompt, with history
- **Library** of owned songs, persisted on the device
- Mini player + full-screen player

## Run it

```bash
npm install
npx expo start        # press a (Android), i (iOS) or w (web)
```

Audio playback uses `expo-audio`, which runs in Expo Go. Mock tracks have no audio files, so the player simulates progress; give a track an `audioUrl` in `src/data/catalog.ts` to hear real audio.

## Checks

```bash
npm test              # money split + phone number tests
npm run typecheck
```

## Structure

```
src/app/            screens (Expo Router: every file is a route)
  (tabs)/           Discover, Search, Library, Wallet
  artist/[id]       artist page
  release/[id]      single / EP / album page
  buy               checkout
  topup             mobile money top-up
  player            full-screen player
src/components/     UI pieces, mini player, playback engine
src/data/catalog.ts mock artists, releases, songs (all invented)
src/lib/money.ts    UGX formatting and the sale split (UPRS per songwriter)
src/lib/phone.ts    Ugandan number parsing, MTN/Airtel detection
src/store/          wallet + player state (Zustand)
```

## Money rules

- All amounts are whole shillings (integers). No floating point.
- Per sale: a song share (placeholder 10%) goes to songwriters, split per writer: UPRS members and foreign-society writers via UPRS, writers in no society paid directly. Of the rest, Deegee keeps a placeholder 20%; the artist gets the remainder, including rounding.
- Placeholders live in `TERMS` in `src/lib/money.ts` until the UPRS licence and artist terms are signed.

## Next

1. Spring Boot API (catalog, wallet ledger, purchases) and swap mock data for it
2. Real mobile money via the chosen aggregator
3. Artist upload with rights declaration and label approval
4. Encrypted offline downloads
