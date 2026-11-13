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
  hasAudio?: boolean; // a real recording was uploaded; owners get a play link from the API
  previewUrl?: string | null; // public 30-second clip, once the recording is processed. Without one, playback is simulated.
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
  coverUrl?: string | null; // API path of the uploaded cover, e.g. /v1/media/covers/…
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
