import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PlayerEngine } from '../components/player/PlayerEngine';
import { colors, font } from '../lib/theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PlayerEngine />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: font.bold, fontSize: 16 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ headerTransparent: true, title: '', headerStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="release/[id]" options={{ headerTransparent: true, title: '', headerStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="buy" options={{ presentation: 'modal', title: 'Checkout' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="gift" options={{ presentation: 'modal', title: 'Send a gift' }} />
        <Stack.Screen name="topup" options={{ presentation: 'modal', title: 'Add money' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
