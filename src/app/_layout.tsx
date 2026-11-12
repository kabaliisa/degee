import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { useCatalog } from '../api/catalog';
import { API_URL } from '../api/config';
import { PlayerEngine } from '../components/player/PlayerEngine';
import { Button } from '../components/ui';
import { colors, font, space, type } from '../lib/theme';
import { getMe } from '../api/account';
import { useSession, useSessionHydrated, useSignedIn } from '../store/session';
import { useLikes } from '../store/likes';
import { usePlayer } from '../store/player';
import { useWallet } from '../store/wallet';

/**
 * Keeps account data fresh: loads the wallet and the user (name, roles) when someone signs in and when the
 * app comes back to the front. On sign-out it stops playback and clears the wallet and likes.
 */
function AccountSync({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    const { refresh, reset } = useWallet.getState();
    if (!signedIn) {
      // Signing out stops the music and clears what belonged to that account.
      reset();
      usePlayer.getState().stop();
      useLikes.getState().clear();
      return;
    }
    const load = () => {
      refresh().catch(() => {}); // screens show the last known values if this fails
      getMe().then(useSession.getState().setUser).catch(() => {});
    };
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
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold,
  });
  const hydrated = useSessionHydrated();
  const signedIn = useSignedIn();
  const hasName = useSession((s) => Boolean(s.user?.name?.trim()));
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
      <AccountSync signedIn={signedIn} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: font.displayBold, fontSize: 17 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasName}>
          <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && hasName}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="artist/[id]" options={{ headerTransparent: true, title: '', headerStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="release/[id]" options={{ headerTransparent: true, title: '', headerStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="buy" options={{ presentation: 'modal', title: 'Checkout' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="gift" options={{ presentation: 'modal', title: 'Send a gift' }} />
          <Stack.Screen name="topup" options={{ presentation: 'modal', title: 'Add money' }} />
          <Stack.Screen name="studio/index" options={{ title: 'Artist studio' }} />
          <Stack.Screen name="studio/apply" options={{ title: 'Sell on Deegee' }} />
          <Stack.Screen name="studio/new-release" options={{ presentation: 'modal', title: 'New release' }} />
          <Stack.Screen name="studio/release/[id]" options={{ title: 'Release' }} />
          <Stack.Screen name="studio/song" options={{ presentation: 'modal', title: 'Song' }} />
          <Stack.Screen name="studio/rights" options={{ presentation: 'modal', title: 'Rights' }} />
          <Stack.Screen name="studio/withdraw" options={{ presentation: 'modal', title: 'Withdraw' }} />
          <Stack.Screen name="admin" options={{ title: 'Review queue' }} />
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
