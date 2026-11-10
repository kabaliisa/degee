import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { PlayerEngine } from '../components/PlayerEngine';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <PlayerEngine />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ title: '' }} />
        <Stack.Screen name="release/[id]" options={{ title: '' }} />
        <Stack.Screen name="player" options={{ presentation: 'modal', title: 'Now playing' }} />
        <Stack.Screen name="buy" options={{ presentation: 'modal', title: 'Checkout' }} />
        <Stack.Screen name="topup" options={{ presentation: 'modal', title: 'Top up wallet' }} />
      </Stack>
    </View>
  );
}
