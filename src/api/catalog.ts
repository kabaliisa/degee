import type { ImageSourcePropType } from 'react-native';
import { placeholderPhoto } from '../lib/photos';
/**
 * Catalog service: the one place the app gets artists, releases and songs from.
 *
 * The whole catalogue is loaded once at startup (GET /v1/catalog) and read synchronously from
 * memory, so browsing and search are instant. When the catalogue outgrows one response, these
 * getters become TanStack Query hooks over the paged endpoints; screens import from here only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from './client';
import { API_URL } from './config';
import type { Artist, Release, SearchResults, Track } from './types';

type Snapshot = { artists: Artist[]; releases: Release[]; tracks: Track[] };

type CatalogState = Snapshot & {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  /** Showing the last catalogue we were given because this one couldn't be fetched. */
  stale: boolean;
  load: () => Promise<void>;
};

/**
 * The last catalogue is kept on the device. Without it the app is a white screen on a dead
 * connection, even for someone whose songs are saved and playable.
 */
export const useCatalog = create<CatalogState>()(
  persist(
    (set, get) => ({
      artists: [],
      releases: [],
      tracks: [],
      status: 'loading',
      stale: false,
      load: async () => {
        if (!useCatalog.persist.hasHydrated()) {
          await useCatalog.persist.rehydrate()?.catch?.(() => {});
        }
        const haveCopy = () => get().releases.length > 0;
        set({ status: haveCopy() ? 'ready' : 'loading', error: undefined });
        try {
          const snapshot = await api<Snapshot>('GET', '/v1/catalog', { auth: false });
          set({ ...snapshot, status: 'ready', stale: false });
        } catch (e) {
          if (haveCopy()) set({ status: 'ready', stale: true });
          else set({ status: 'error', error: (e as Error).message });
        }
      },
    }),
    {
      name: 'deegee-catalog',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ artists: s.artists, releases: s.releases, tracks: s.tracks }),
    },
  ),
);

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
 * photo shipped with the app (the demo catalogue and artist photos, until artists can upload them).
 */
export const photoSource = (id: string): ImageSourcePropType => {
  const cover = getRelease(id)?.coverUrl;
  if (cover) return { uri: mediaUrl(cover) };
  return placeholderPhoto(id, getArtist(id) ? 'portrait' : 'cover');
};
