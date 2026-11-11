// Shapes of the data the app works with. The catalogue types match the API's JSON exactly.
import type { Songwriter } from '../lib/money';
import type { Provider } from '../lib/phone';

export type Genre = 'Afrobeat' | 'Kadongo Kamu' | 'Dancehall' | 'Gospel' | 'Zouk' | 'Hip Hop';

export type Artist = {
  id: string;
  name: string;
  city: string;
  bio: string;
  genres: Genre[];
  verified: boolean;
  colors: [string, string];
};

export type Track = {
  id: string;
  releaseId: string;
  artistId: string;
  title: string;
  durationSec: number;
  priceUGX: number;
  writers: Songwriter[];
  audioUrl?: string | null; // real audio arrives with the audio pipeline; mock playback when absent
};

export type Release = {
  id: string;
  artistId: string;
  title: string;
  type: 'Single' | 'EP' | 'Album';
  year: number;
  priceUGX: number; // whole-release price
  colors: [string, string];
  exclusive?: boolean;
};

export type SearchResults = { artists: Artist[]; releases: Release[]; tracks: Track[] };

/** One line of wallet activity, as the wallet screen shows it. */
export type WalletTx = {
  id: string;
  at: number; // epoch ms
  kind: 'TOPUP' | 'PURCHASE' | 'GIFT';
  amount: number; // + for top-up, − for purchase or gift
  label: string; // what was bought, or who got the gift
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  note?: string; // gift message
  provider?: Provider; // top-ups only
};
