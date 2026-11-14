import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/** White status bar text while this screen is showing (for screens with a dark top). */
export function LightStatusBar() {
  const focused = useIsFocused();
  return focused ? <StatusBar style="light" /> : null;
}
