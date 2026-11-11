import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap feedback on press. No-op on web. */
export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};
