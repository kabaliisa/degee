// Mock catalogue: every artist, release and song here is an invented placeholder.
// Only src/api/catalog.ts reads this file; screens never import it directly.
import type { Songwriter } from '../../lib/money';
import type { Artist, Release, Track } from '../types';

export const artists: Artist[] = [
  { id: 'a1', name: 'Nalu Kizza', city: 'Kampala', genres: ['Afrobeat', 'Zouk'], verified: true, colors: ['#2F7BFF', '#0A1A38'],
    bio: 'Kampala singer blending Afrobeat grooves with Luganda love songs.' },
  { id: 'a2', name: 'Ssalongo Beats', city: 'Masaka', genres: ['Kadongo Kamu'], verified: true, colors: ['#FFFFFF', '#1A1A1A'],
    bio: 'Guitar storyteller keeping Kadongo Kamu alive for a new generation.' },
  { id: 'a3', name: 'Kiwa Rebel', city: 'Jinja', genres: ['Dancehall'], verified: false, colors: ['#9DBFFF', '#101B30'],
    bio: 'Riverside dancehall energy from the source of the Nile.' },
  { id: 'a4', name: 'Grace Atim', city: 'Gulu', genres: ['Gospel'], verified: true, colors: ['#BDBDBD', '#121212'],
    bio: 'Gospel voice from the north, singing in Acholi and English.' },
  { id: 'a5', name: 'Mukasa the MC', city: 'Entebbe', genres: ['Hip Hop'], verified: true, colors: ['#2F7BFF', '#0A1A38'],
    bio: 'Lugaflow rapper with sharp stories about city life.' },
];

export const releases: Release[] = [
  { id: 'r1', artistId: 'a1', title: 'Enkuba', type: 'EP', year: 2026, priceUGX: 8000, colors: ['#FFFFFF', '#1A1A1A'] },
  { id: 'r2', artistId: 'a1', title: 'Sunday in Ntinda', type: 'Single', year: 2026, priceUGX: 1500, colors: ['#BDBDBD', '#121212'], exclusive: true },
  { id: 'r3', artistId: 'a2', title: 'Ebyafaayo', type: 'Album', year: 2025, priceUGX: 15000, colors: ['#9DBFFF', '#101B30'] },
  { id: 'r4', artistId: 'a3', title: 'Nile Bounce', type: 'Single', year: 2026, priceUGX: 1000, colors: ['#2F7BFF', '#0A1A38'] },
  { id: 'r5', artistId: 'a4', title: 'Lakwena', type: 'EP', year: 2025, priceUGX: 6000, colors: ['#FFFFFF', '#1A1A1A'] },
  { id: 'r6', artistId: 'a5', title: 'Boda Diaries', type: 'Album', year: 2026, priceUGX: 12000, colors: ['#9DBFFF', '#101B30'] },
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
