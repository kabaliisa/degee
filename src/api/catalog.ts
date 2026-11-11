/**
 * Catalog service: the one place the app gets artists, releases and songs from.
 *
 * The whole catalogue is loaded once at startup (GET /v1/catalog) and read synchronously from
 * memory, so browsing and search are instant. When the catalogue outgrows one response, these
 * getters become TanStack Query hooks over the paged endpoints; screens import from here only.
 */
import { create } from 'zustand';
import { api } from './client';
import { API_URL } from './config';
import type { Artist, Release, SearchResults, Track } from './types';

type Snapshot = { artists: Artist[]; releases: Release[]; tracks: Track[] };

type CatalogState = Snapshot & {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  load: () => Promise<void>;
};

export const useCatalog = create<CatalogState>()((set) => ({
  artists: [],
  releases: [],
  tracks: [],
  status: 'loading',
  load: async () => {
    set({ status: 'loading', error: undefined });
    try {
      const snapshot = await api<Snapshot>('GET', '/v1/catalog', { auth: false });
      set({ ...snapshot, status: 'ready' });
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },
}));

const data = () => useCatalog.getState();

export const listArtists = (): Artist[] => data().artists;
export const listReleases = (): Release[] => data().releases;

export const getArtist = (id: string) => data().artists.find((a) => a.id === id);
export const getRelease = (id: string) => data().releases.find((r) => r.id === id);
export const getTrack = (id: string) => data().tracks.find((t) => t.id === id);

export const releasesByArtist = (artistId: string) => data().releases.filter((r) => r.artistId === artistId);
export const tracksByArtist = (artistId: string) => data().tracks.filter((t) => t.artistId === artistId);
export const tracksForRelease = (releaseId: string) => data().tracks.filter((t) => t.releaseId === releaseId);
export const releasesInGenre = (genre: Artist['genres'][number]) =>
  data().releases.filter((r) => getArtist(r.artistId)?.genres.includes(genre));

export function search(query: string): SearchResults {
  const q = query.trim().toLowerCase();
  if (!q) return { artists: [], releases: [], tracks: [] };
  const { artists, releases, tracks } = data();
  return {
    artists: artists.filter((a) => a.name.toLowerCase().includes(q) || a.genres.some((g) => g.toLowerCase().includes(q))),
    releases: releases.filter((r) => r.title.toLowerCase().includes(q)),
    tracks: tracks.filter((t) => t.title.toLowerCase().includes(q)),
  };
}

// Placeholder stats until the API reports real ones. Stable per id so the screens don't jump around.
const seeded = (id: string, min: number, span: number) => {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 100003;
  return min + (h % span);
};
export const supportersFor = (artistId: string) => seeded(artistId, 1200, 9000);
export const buyersFor = (trackId: string) => seeded(trackId, 80, 2400);

/** Turns an API path (e.g. /v1/media/covers/…) into a full URL. */
export const mediaUrl = (path: string) => (path.startsWith('http') ? path : `${API_URL}${path}`);

/**
 * Cover or artist photo for an id: the uploaded cover when a release has one, otherwise a placeholder
 * colour photo from picsum.photos (the demo catalogue and artist photos, until artists can upload them).
 */
export const photoUrl = (id: string, size: number) => {
  const cover = getRelease(id)?.coverUrl;
  if (cover) return mediaUrl(cover);
  const px = size <= 64 ? 160 : size <= 160 ? 400 : 800;
  return `https://picsum.photos/seed/deegee-${id}/${px}/${px}`;
};
