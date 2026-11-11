import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Language = 'English' | 'Luganda';
export type Quality = 'Low' | 'Normal' | 'High';

/** On-device preferences. Who the user is (name, phone) comes from the server; see store/session. */
type SettingsState = {
  dataSaver: boolean; // lowest audio quality on mobile data
  streamQuality: Quality;
  downloadOnWifiOnly: boolean;
  language: Language;
  notifyNewReleases: boolean; // new music from artists you follow
  notifyGiftsAndOffers: boolean;
  update: (patch: Partial<Omit<SettingsState, 'update'>>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      dataSaver: true,
      streamQuality: 'Normal',
      downloadOnWifiOnly: true,
      language: 'English',
      notifyNewReleases: true,
      notifyGiftsAndOffers: false,
      update: (patch) => set(patch),
    }),
    { name: 'deegee-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
