import { create } from 'zustand';
import { getPlayLink } from '../api/studio';
import { mediaUrl } from '../api/catalog';
import {
  canSaveSongs,
  listSavedSongs,
  removeAllSongs,
  removeSong,
  saveSong,
  savedSongsBytes,
} from '../lib/offlineAudio';

type OfflineState = {
  /** This build can keep songs on the device at all (the PWA can; the native app can't yet). */
  supported: boolean;
  saved: string[];
  /** Song ids being downloaded right now, so the buttons can show it. */
  saving: string[];
  bytes: number;
  error: string | null;
  refresh: () => Promise<void>;
  /** Downloads songs the fan already owns. Songs already saved are skipped. */
  save: (trackIds: string[]) => Promise<void>;
  remove: (trackIds: string[]) => Promise<void>;
  removeAll: () => Promise<void>;
  isSaved: (trackId: string) => boolean;
  reset: () => void;
};

export const useOffline = create<OfflineState>()((set, get) => ({
  supported: canSaveSongs,
  saved: [],
  saving: [],
  bytes: 0,
  error: null,

  refresh: async () => {
    if (!canSaveSongs) return;
    const [saved, bytes] = await Promise.all([listSavedSongs(), savedSongsBytes()]);
    set({ saved, bytes });
  },

  save: async (trackIds) => {
    if (!canSaveSongs) return;
    const todo = trackIds.filter((id) => !get().saved.includes(id) && !get().saving.includes(id));
    if (todo.length === 0) return;
    set((s) => ({ saving: [...s.saving, ...todo], error: null }));
    try {
      // One at a time: a phone on mobile data shouldn't open five downloads at once.
      for (const trackId of todo) {
        const { url } = await getPlayLink(trackId);
        await saveSong(trackId, mediaUrl(url));
        set((s) => ({ saved: [...s.saved, trackId] }));
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'That download didn’t finish.' });
    } finally {
      set((s) => ({ saving: s.saving.filter((id) => !todo.includes(id)) }));
      await get().refresh();
    }
  },

  remove: async (trackIds) => {
    if (!canSaveSongs) return;
    await Promise.all(trackIds.map(removeSong));
    await get().refresh();
  },

  removeAll: async () => {
    if (!canSaveSongs) return;
    await removeAllSongs();
    set({ saved: [], bytes: 0 });
  },

  isSaved: (trackId) => get().saved.includes(trackId),
  reset: () => set({ saved: [], saving: [], bytes: 0, error: null }),
}));

/** A rough size for the settings screen: people think in MB, not bytes. */
export const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};
