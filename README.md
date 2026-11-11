# Deegee

Buy music straight from Ugandan artists, paying in UGX with MTN MoMo or Airtel Money. Think Bandcamp for Uganda.

This is the React Native app (Expo, TypeScript). It still runs on a **mock catalogue** with **simulated payments**; the API it will switch to lives in [`backend/`](backend/README.md).

## Run it

```bash
npm install
npx expo start        # scan the QR code with Expo Go, or press w for the browser
```

## Checks (run all three before every commit)

```bash
npm run lint          # ESLint with Expo's rules
npm run typecheck     # TypeScript, strict mode
npm test              # money split and phone number tests
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
  api/                 The only way screens get catalogue data
    catalog.ts         Catalogue service (swap point for the real API)
    types.ts           Artist, Release, Track …
    mock/              Invented sample data; only catalog.ts reads it
  components/
    ui/                Shared building blocks: buttons, cards, rows, empty state
    home/ artist/ player/ checkout/ wallet/ profile/   Pieces used by one area
    Art.tsx            Cover/artist image with pattern fallback
  lib/                 Pure logic, no React: money, phone numbers, formatting, theme
  store/               App state (Zustand, saved on the device): wallet, player, likes, profile
```

### Conventions

- **Screens stay thin.** A screen wires data and state together; reusable or self-contained UI goes in `components/`.
- **Data goes through `src/api`.** Never import `src/api/mock` from a screen or component.
- **Styles live in `StyleSheet.create`** at the bottom of each file. Only values computed at runtime (sizes, insets, progress) are inline.
- **Design tokens only.** Colours, fonts, spacing and radii come from `src/lib/theme.ts`; no hard-coded values in screens.
- **Money is whole Ugandan shillings** (integers). All split rules live in `src/lib/money.ts` and are tested; rounding always favours the artist and never loses a shilling.
- **Pure logic gets tests** next to it (`*.test.ts`).

## Money rules (placeholders until contracts are signed)

Set in `TERMS` in `src/lib/money.ts`:

- **Sales:** 10% of each sale is the song share, split per songwriter: UPRS members and foreign-society writers through UPRS, writers in no society paid directly. Of the rest, Deegee keeps 20% and the artist gets the remainder.
- **Gifts:** the artist gets 95% and Deegee keeps 5%. Gifts are not song sales, so there's no songwriter share.

## Before connecting the backend

1. Replace the mock in `src/api/catalog.ts` with API calls, and wrap them in TanStack Query hooks so screens get loading and error states.
2. Move wallet balances, purchases and gifts to the server. `src/store/wallet.ts` currently changes money on the phone, which is only acceptable for a demo.
3. Move UI text into translation files so the Luganda setting can work.

## Known placeholders

Shuffle, repeat, Help and support, "Sell on Deegee" and Terms do nothing yet. Audio is simulated for songs without an `audioUrl`.
