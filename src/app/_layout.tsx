import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { useCatalog } from '../api/catalog';
import { API_URL } from '../api/config';
import { PlayerEngine } from '../components/player/PlayerEngine';
import { Button } from '../components/ui';
import { colors, font, space, type } from '../lib/theme';
import { useSessionHydrated, useSignedIn } from '../store/session';
import { useWallet } from '../store/wallet';

/** Loads the wallet when someone signs in, reloads it when the app comes back to the front, clears it on sign-out. */
function WalletSync({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    const { refresh, reset } = useWallet.getState();
    if (!signedIn) return reset();
    const load = () => { refresh().catch(() => {}); }; // screens show the last known values if this fails
    load();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') load(); });
    return () => sub.remove();
  }, [signedIn]);
  return null;
}

function Splash({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <View style={[styles.root, styles.splash]}>
      <Text style={styles.wordmark}>Deegee</Text>
      {error ? (
        <>
          <Text style={[type.body, styles.splashText]}>{error}</Text>
          {onRetry ? <Button label="Try again" onPress={onRetry} style={styles.retry} /> : null}
        </>
      ) : (
        <ActivityIndicator color={colors.textMuted} />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  const hydrated = useSessionHydrated();
  const signedIn = useSignedIn();
  const catalog = useCatalog((s) => s.status);
  const catalogError = useCatalog((s) => s.error);

  useEffect(() => { void useCatalog.getState().load(); }, []);

  if (!loaded || !hydrated) return <View style={styles.root} />;
  if (catalog === 'loading') return <Splash />;
  if (catalog === 'error') return <Splash error={__DEV__ ? `${catalogError}\n\nAPI: ${API_URL}` : catalogError} onRetry={() => void useCatalog.getState().load()} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PlayerEngine />
      <WalletSync signedIn={signedIn} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: font.bold, fontSize: 16 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="artist/[id]" options={{ headerTransparent: true, title: '', headerStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="release/[id]" options={{ headerTransparent: true, title: '', headerStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="buy" options={{ presentation: 'modal', title: 'Checkout' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="gift" options={{ presentation: 'modal', title: 'Send a gift' }} />
          <Stack.Screen name="topup" options={{ presentation: 'modal', title: 'Add money' }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  splash: { alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  wordmark: { fontFamily: font.display, fontSize: 44, letterSpacing: -1.5, color: colors.text },
  splashText: { color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  retry: { alignSelf: 'stretch', maxWidth: 320, width: '100%' },
});
