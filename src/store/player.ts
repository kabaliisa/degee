import { create } from 'zustand';
import { PREVIEW_SEC, getTrack, type Track } from '../data/catalog';

type PlayerState = {
  queue: string[];
  index: number;
  positionSec: number;
  isPlaying: boolean;
  isPreview: boolean; // non-owners hear a 30-second preview
  current: () => Track | undefined;
  limitSec: () => number;
  playQueue: (trackIds: string[], startIndex: number, owned: (id: string) => boolean) => void;
  toggle: () => void;
  seek: (sec: number) => void;
  next: (owned: (id: string) => boolean) => void;
  prev: (owned: (id: string) => boolean) => void;
  tick: (owned: (id: string) => boolean, deltaSec?: number) => void;
  setPreview: (isPreview: boolean) => void;
  stop: () => void;
};

export const usePlayer = create<PlayerState>()((set, get) => ({
  queue: [],
  index: 0,
  positionSec: 0,
  isPlaying: false,
  isPreview: false,

  current: () => getTrack(get().queue[get().index] ?? ''),
  limitSec: () => {
    const t = get().current();
    if (!t) return 0;
    return get().isPreview ? Math.min(PREVIEW_SEC, t.durationSec) : t.durationSec;
  },

  playQueue: (trackIds, startIndex, owned) =>
    set({ queue: trackIds, index: startIndex, positionSec: 0, isPlaying: true, isPreview: !owned(trackIds[startIndex]) }),

  toggle: () => set((s) => ({ isPlaying: s.queue.length > 0 ? !s.isPlaying : false })),
  seek: (sec) => set({ positionSec: Math.max(0, Math.min(sec, get().limitSec())) }),

  next: (owned) => {
    const { queue, index } = get();
    if (index + 1 >= queue.length) return set({ isPlaying: false, positionSec: 0 });
    set({ index: index + 1, positionSec: 0, isPlaying: true, isPreview: !owned(queue[index + 1]) });
  },
  prev: (owned) => {
    const { queue, index, positionSec } = get();
    if (positionSec > 3 || index === 0) return set({ positionSec: 0 });
    set({ index: index - 1, positionSec: 0, isPreview: !owned(queue[index - 1]) });
  },

  // Advances mock playback; real audio drives position through expo-audio when a track has audioUrl.
  tick: (owned, deltaSec = 1) => {
    const s = get();
    if (!s.isPlaying) return;
    const pos = s.positionSec + deltaSec;
    if (pos >= s.limitSec()) return get().next(owned);
    set({ positionSec: pos });
  },

  setPreview: (isPreview) => set({ isPreview }),
  stop: () => set({ queue: [], index: 0, positionSec: 0, isPlaying: false }),
}));
