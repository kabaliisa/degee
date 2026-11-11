import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the Deegee API lives.
 *
 * Set EXPO_PUBLIC_API_URL to override (staging, production, or a tunnel). In development it
 * defaults to port 8080 on the computer running Expo, so a phone on the same Wi-Fi reaches the
 * API on your Mac without any setup.
 */
function devHost(): string {
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081" when opened in Expo Go
  if (hostUri) return hostUri.split(':')[0];
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.hostname;
  return 'localhost';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost()}:8080`;
