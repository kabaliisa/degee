import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type LikesState = {
  liked: string[]; // track ids
  following: string[]; // artist ids
  toggleLike: (trackId: string) => void;
  toggleFollow: (artistId: string) => void;
  clear: () => void; // on sign-out, so the next person on this phone doesn't see them
};

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]);

export const useLikes = create<LikesState>()(
  persist(
    (set) => ({
      liked: [],
      following: [],
      toggleLike: (id) => set((s) => ({ liked: toggle(s.liked, id) })),
      toggleFollow: (id) => set((s) => ({ following: toggle(s.following, id) })),
      clear: () => set({ liked: [], following: [] }),
    }),
    { name: 'deegee-likes', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
