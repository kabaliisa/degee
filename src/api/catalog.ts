/**
 * Catalog service: the one place the app gets artists, releases and songs from.
 *
 * Today it reads the mock catalogue. When the Spring Boot API is ready, only this file
 * (and src/api/mock) changes: each function calls the API, and screens get the data through
 * TanStack Query hooks built on these functions. Screens must import from here, never from
 * src/api/mock.
 */
import { artists, releases, tracks } from './mock/catalog';
import type { Artist, Release, SearchResults } from './types';

export const listArtists = (): Artist[] => artists;
export const listReleases = (): Release[] => releases;

export const getArtist = (id: string) => artists.find((a) => a.id === id);
export const getRelease = (id: string) => releases.find((r) => r.id === id);
export const getTrack = (id: string) => tracks.find((t) => t.id === id);

export const releasesByArtist = (artistId: string) => releases.filter((r) => r.artistId === artistId);
export const tracksByArtist = (artistId: string) => tracks.filter((t) => t.artistId === artistId);
export const tracksForRelease = (releaseId: string) => tracks.filter((t) => t.releaseId === releaseId);
export const releasesInGenre = (genre: Artist['genres'][number]) =>
  releases.filter((r) => getArtist(r.artistId)?.genres.includes(genre));

export function search(query: string): SearchResults {
  const q = query.trim().toLowerCase();
  if (!q) return { artists: [], releases: [], tracks: [] };
  return {
    artists: artists.filter((a) => a.name.toLowerCase().includes(q) || a.genres.some((g) => g.toLowerCase().includes(q))),
    releases: releases.filter((r) => r.title.toLowerCase().includes(q)),
    tracks: tracks.filter((t) => t.title.toLowerCase().includes(q)),
  };
}

// Mock stats until the API reports real ones. Stable per id so the screens don't jump around.
const seeded = (id: string, min: number, span: number) => {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 100003;
  return min + (h % span);
};
export const supportersFor = (artistId: string) => seeded(artistId, 1200, 9000);
export const buyersFor = (trackId: string) => seeded(trackId, 80, 2400);

/** Cover or artist photo. Mock: colour stock photos from picsum.photos; the API will send real URLs. */
export const photoUrl = (id: string, size: number) => {
  const px = size <= 64 ? 160 : size <= 160 ? 400 : 800;
  return `https://picsum.photos/seed/deegee-${id}/${px}/${px}`;
};
