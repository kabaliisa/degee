import { create } from 'zustand';
import { getTrack, type Track } from '../api';
import { PREVIEW_SEC } from '../lib/format';
import { nextIndex, nextRepeat, shuffleKeepingFirst, type Repeat } from '../lib/queue';

export type { Repeat };

type PlayerState = {
  queue: string[]; // play order (shuffled when shuffle is on)
  original: string[]; // the list as it was started, to return to when shuffle is turned off
  index: number;
  shuffle: boolean;
  repeat: Repeat;
  positionSec: number;
  isPlaying: boolean;
  isPreview: boolean; // non-owners hear a 30-second preview
  seekRequest: number | null; // a jump the real audio player still has to make (see PlayerEngine)
  current: () => Track | undefined;
  limitSec: () => number;
  playQueue: (trackIds: string[], startIndex: number, owned: (id: string) => boolean) => void;
  toggle: () => void;
  seek: (sec: number) => void;
  /** `auto`: the song ended by itself (repeat-one replays it). Pressing Next always moves on. */
  next: (owned: (id: string) => boolean, auto?: boolean) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  prev: (owned: (id: string) => boolean) => void;
  tick: (owned: (id: string) => boolean, deltaSec?: number) => void;
  setPreview: (isPreview: boolean) => void;
  stop: () => void;
};

export const usePlayer = create<PlayerState>()((set, get) => ({
  queue: [],
  original: [],
  index: 0,
  shuffle: false,
  repeat: 'off',
  positionSec: 0,
  isPlaying: false,
  isPreview: false,
  seekRequest: null,

  current: () => getTrack(get().queue[get().index] ?? ''),
  limitSec: () => {
    const t = get().current();
    if (!t) return 0;
    return get().isPreview ? Math.min(PREVIEW_SEC, t.durationSec) : t.durationSec;
  },

  playQueue: (trackIds, startIndex, owned) => {
    const first = trackIds[startIndex];
    const queue = get().shuffle ? shuffleKeepingFirst(trackIds, first) : trackIds;
    set({
      queue, original: trackIds, index: get().shuffle ? 0 : startIndex,
      positionSec: 0, seekRequest: 0, isPlaying: true, isPreview: !owned(first),
    });
  },

  toggle: () => set((s) => ({ isPlaying: s.queue.length > 0 ? !s.isPlaying : false })),

  // The current song keeps playing; only what comes after it changes.
  toggleShuffle: () => {
    const { shuffle, queue, original, index } = get();
    const current = queue[index];
    if (shuffle) {
      set({ shuffle: false, queue: original, index: Math.max(0, original.indexOf(current)) });
    } else {
      set({ shuffle: true, queue: shuffleKeepingFirst(original.length ? original : queue, current), index: 0 });
    }
  },
  cycleRepeat: () => set((s) => ({ repeat: nextRepeat(s.repeat) })),
  seek: (sec) => {
    const to = Math.max(0, Math.min(sec, get().limitSec()));
    set({ positionSec: to, seekRequest: to });
  },

  next: (owned, auto = false) => {
    const { queue, index, repeat } = get();
    const to = nextIndex(index, queue.length, repeat, auto);
    // End of the list: stop, back at the start of the song, so Play replays it.
    if (to === null) return set({ isPlaying: false, positionSec: 0, seekRequest: 0 });
    // seekRequest 0 restarts the recording when the same song plays again (repeat-one, or a one-song list).
    set({ index: to, positionSec: 0, seekRequest: 0, isPlaying: true, isPreview: !owned(queue[to]) });
  },
  prev: (owned) => {
    const { queue, index, positionSec } = get();
    if (positionSec > 3 || index === 0) return set({ positionSec: 0, seekRequest: 0 }); // back to the start of this song
    set({ index: index - 1, positionSec: 0, isPreview: !owned(queue[index - 1]) });
  },

  // Advances simulated playback; real recordings drive the position through expo-audio (see PlayerEngine).
  tick: (owned, deltaSec = 1) => {
    const s = get();
    if (!s.isPlaying) return;
    const pos = s.positionSec + deltaSec;
    if (pos >= s.limitSec()) return get().next(owned, true);
    set({ positionSec: pos });
  },

  setPreview: (isPreview) => set({ isPreview }),
  stop: () => set({ queue: [], original: [], index: 0, positionSec: 0, isPlaying: false }),
}));
