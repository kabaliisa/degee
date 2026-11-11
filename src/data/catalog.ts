// Mock catalogue. All artists, releases and songs are invented placeholders.
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

export const artists: Artist[] = [
  { id: 'a1', name: 'Nalu Kizza', city: 'Kampala', genres: ['Afrobeat', 'Zouk'], verified: true, colors: ['#F2A541', '#C2410C'],
    bio: 'Kampala singer blending Afrobeat grooves with Luganda love songs.' },
  { id: 'a2', name: 'Ssalongo Beats', city: 'Masaka', genres: ['Kadongo Kamu'], verified: true, colors: ['#4D7C0F', '#1A2E05'],
    bio: 'Guitar storyteller keeping Kadongo Kamu alive for a new generation.' },
  { id: 'a3', name: 'Kiwa Rebel', city: 'Jinja', genres: ['Dancehall'], verified: false, colors: ['#DB2777', '#4C0519'],
    bio: 'Riverside dancehall energy from the source of the Nile.' },
  { id: 'a4', name: 'Grace Atim', city: 'Gulu', genres: ['Gospel'], verified: true, colors: ['#0EA5E9', '#0C4A6E'],
    bio: 'Gospel voice from the north, singing in Acholi and English.' },
  { id: 'a5', name: 'Mukasa the MC', city: 'Entebbe', genres: ['Hip Hop'], verified: true, colors: ['#A3A3A3', '#171717'],
    bio: 'Lugaflow rapper with sharp stories about city life.' },
];

export const releases: Release[] = [
  { id: 'r1', artistId: 'a1', title: 'Enkuba', type: 'EP', year: 2026, priceUGX: 8000, colors: ['#F2A541', '#7C2D12'] },
  { id: 'r2', artistId: 'a1', title: 'Sunday in Ntinda', type: 'Single', year: 2026, priceUGX: 1500, colors: ['#FDE68A', '#B45309'], exclusive: true },
  { id: 'r3', artistId: 'a2', title: 'Ebyafaayo', type: 'Album', year: 2025, priceUGX: 15000, colors: ['#65A30D', '#14532D'] },
  { id: 'r4', artistId: 'a3', title: 'Nile Bounce', type: 'Single', year: 2026, priceUGX: 1000, colors: ['#F472B6', '#831843'] },
  { id: 'r5', artistId: 'a4', title: 'Lakwena', type: 'EP', year: 2025, priceUGX: 6000, colors: ['#7DD3FC', '#1E3A8A'] },
  { id: 'r6', artistId: 'a5', title: 'Boda Diaries', type: 'Album', year: 2026, priceUGX: 12000, colors: ['#D4D4D4', '#262626'] },
];

const solo = (name: string, society: Songwriter['society']): Songwriter[] => [{ name, sharePct: 100, society }];

export const tracks: Track[] = [
  { id: 't1', releaseId: 'r1', artistId: 'a1', title: 'Enkuba', durationSec: 214, priceUGX: 2000, writers: solo('Nalu Kizza', 'UPRS') },
  { id: 't2', releaseId: 'r1', artistId: 'a1', title: 'Mpola Mpola', durationSec: 198, priceUGX: 2000,
    writers: [{ name: 'Nalu Kizza', sharePct: 50, society: 'UPRS' }, { name: 'Daudi Okello', sharePct: 50, society: null }] },
  { id: 't3', releaseId: 'r1', artistId: 'a1', title: 'Ttaala', durationSec: 231, priceUGX: 2000, writers: solo('Nalu Kizza', 'UPRS') },
  { id: 't4', releaseId: 'r1', artistId: 'a1', title: 'Wano Wano', durationSec: 189, priceUGX: 2000, writers: solo('Nalu Kizza', 'UPRS') },
  { id: 't5', releaseId: 'r2', artistId: 'a1', title: 'Sunday in Ntinda', durationSec: 204, priceUGX: 1500, writers: solo('Nalu Kizza', 'UPRS') },
  { id: 't6', releaseId: 'r3', artistId: 'a2', title: 'Ebyafaayo', durationSec: 312, priceUGX: 2000, writers: solo('Ssalongo Beats', null) },
  { id: 't7', releaseId: 'r3', artistId: 'a2', title: 'Omukwano Gwa Kyalo', durationSec: 287, priceUGX: 2000, writers: solo('Ssalongo Beats', null) },
  { id: 't8', releaseId: 'r3', artistId: 'a2', title: 'Taxi ya Masaka', durationSec: 265, priceUGX: 2000, writers: solo('Ssalongo Beats', null) },
  { id: 't9', releaseId: 'r3', artistId: 'a2', title: 'Ennanga', durationSec: 340, priceUGX: 2000, writers: solo('Ssalongo Beats', null) },
  { id: 't10', releaseId: 'r4', artistId: 'a3', title: 'Nile Bounce', durationSec: 176, priceUGX: 1000, writers: solo('Kiwa Rebel', null) },
  { id: 't11', releaseId: 'r5', artistId: 'a4', title: 'Lakwena', durationSec: 246, priceUGX: 1500, writers: solo('Grace Atim', 'UPRS') },
  { id: 't12', releaseId: 'r5', artistId: 'a4', title: 'Pwoyo', durationSec: 222, priceUGX: 1500, writers: solo('Grace Atim', 'UPRS') },
  { id: 't13', releaseId: 'r5', artistId: 'a4', title: 'Morning Light', durationSec: 258, priceUGX: 1500, writers: solo('Grace Atim', 'UPRS') },
  { id: 't14', releaseId: 'r6', artistId: 'a5', title: 'Stage Two', durationSec: 201, priceUGX: 1500, writers: solo('Mukasa the MC', 'UPRS') },
  { id: 't15', releaseId: 'r6', artistId: 'a5', title: 'Rolex at Midnight', durationSec: 193, priceUGX: 1500,
    writers: [{ name: 'Mukasa the MC', sharePct: 70, society: 'UPRS' }, { name: 'Lil Juma', sharePct: 30, society: 'FOREIGN' }] },
  { id: 't16', releaseId: 'r6', artistId: 'a5', title: 'Kikuubo Hustle', durationSec: 215, priceUGX: 1500, writers: solo('Mukasa the MC', 'UPRS') },
];

export const getArtist = (id: string) => artists.find((a) => a.id === id);
export const getRelease = (id: string) => releases.find((r) => r.id === id);
export const getTrack = (id: string) => tracks.find((t) => t.id === id);
export const releasesByArtist = (artistId: string) => releases.filter((r) => r.artistId === artistId);
export const tracksForRelease = (releaseId: string) => tracks.filter((t) => t.releaseId === releaseId);

export function search(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return { artists: [], releases: [], tracks: [] };
  return {
    artists: artists.filter((a) => a.name.toLowerCase().includes(s) || a.genres.some((g) => g.toLowerCase().includes(s))),
    releases: releases.filter((r) => r.title.toLowerCase().includes(s)),
    tracks: tracks.filter((t) => t.title.toLowerCase().includes(s)),
  };
}

export const formatDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
export const PREVIEW_SEC = 30;

// Mock social proof: fans who have bought from an artist / a track. Stable per id.
const seeded = (id: string, min: number, span: number) => {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 100003;
  return min + (h % span);
};
export const supportersFor = (artistId: string) => seeded(artistId, 1200, 9000);
export const buyersFor = (trackId: string) => seeded(trackId, 80, 2400);
export const totalDuration = (list: Track[]) => list.reduce((s, t) => s + t.durationSec, 0);
