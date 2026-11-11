// Shapes of the data the app works with. The backend API will return these same shapes.
import type { Songwriter } from '../lib/money';

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
  audioUrl?: string; // real audio comes from the API later; mock playback when absent
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
