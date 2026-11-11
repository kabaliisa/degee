import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Language = 'English' | 'Luganda';
export type Quality = 'Low' | 'Normal' | 'High';

type ProfileState = {
  name: string;
  phone: string; // mobile money number, E.164
  // Settings
  dataSaver: boolean; // lowest audio quality on mobile data
  streamQuality: Quality;
  downloadOnWifiOnly: boolean;
  language: Language;
  notifyNewReleases: boolean; // new music from artists you follow
  notifyGiftsAndOffers: boolean;
  update: (patch: Partial<Omit<ProfileState, 'update' | 'signOut'>>) => void;
  signOut: () => void;
};

const defaults = {
  name: 'Solomon',
  phone: '+256772123456',
  dataSaver: true,
  streamQuality: 'Normal' as Quality,
  downloadOnWifiOnly: true,
  language: 'English' as Language,
  notifyNewReleases: true,
  notifyGiftsAndOffers: false,
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      ...defaults,
      update: (patch) => set(patch),
      signOut: () => set(defaults), // mock: real sign-out clears tokens and returns to login
    }),
    { name: 'deegee-profile', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

export const formatPhone = (e164: string) =>
  e164.startsWith('+256') && e164.length === 13 ? `0${e164.slice(4, 7)} ${e164.slice(7)}` : e164;
