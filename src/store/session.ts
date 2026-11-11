import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { formatPhone } from '../lib/phone';

export type User = { id: string; phone: string; name: string | null };

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  signIn: (s: { accessToken: string; refreshToken: string; user: User }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  signOut: () => void;
};

// Tokens live in the iOS Keychain / Android Keystore. The web build has no secure store, so it
// falls back to browser storage (acceptable for development; the web app isn't a release target).
const tokenStorage: StateStorage = Platform.OS === 'web'
  ? AsyncStorage
  : { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync };

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      signIn: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      signOut: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'deegee-session',
      storage: createJSONStorage(() => tokenStorage),
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
    },
  ),
);

const subscribeHydration = (cb: () => void) => useSession.persist.onFinishHydration(cb);

/** False until the saved session has been read from storage, so the app doesn't flash the sign-in screen. */
export const useSessionHydrated = () =>
  useSyncExternalStore(subscribeHydration, () => useSession.persist.hasHydrated(), () => false);

export const useSignedIn = () => useSession((s) => s.refreshToken !== null);

/** The user's name, or their phone number until they've added one. */
export const displayName = (user: User | null) => user?.name || (user ? formatPhone(user.phone) : '');
