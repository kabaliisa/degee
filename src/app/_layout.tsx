import { useFonts } from 'expo-font';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { useCatalog } from '../api/catalog';
import { API_URL } from '../api/config';
import { OfflineBar } from '../components/OfflineBar';
import { PlayerEngine } from '../components/player/PlayerEngine';
import { Button } from '../components/ui';
import { colors, font, space, type } from '../lib/theme';
import { getMe } from '../api/account';
import { useSession, useSessionHydrated, useSignedIn } from '../store/session';
import { useLikes } from '../store/likes';
import { usePlayer } from '../store/player';
import { useOffline } from '../store/offline';
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
      useOffline.getState().reset();
      usePlayer.getState().stop();
      useLikes.getState().clear();
      return;
    }
    const load = () => {
      refresh().catch(() => {}); // screens show the last known values if this fails
      useOffline.getState().refresh().catch(() => {});
      getMe().then(useSession.getState().setUser).catch(() => {});
    };
    load();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') load(); });
    return () => sub.remove();
  }, [signedIn]);
  return null;
}

function Splash({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  // The API sleeps when nobody has used it for a while and takes the better part of a minute to wake.
  // A spinner alone on a black screen for that long reads as a broken app, so after a few seconds the
  // wait explains itself.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={[styles.root, styles.splash]}>
      <ActivityIndicator color={colors.accent} />
      {error ? (
        <>
          <Text style={[type.body, styles.splashText]}>{error}</Text>
          {onRetry ? <Button label="Try again" onPress={onRetry} style={styles.retry} /> : null}
        </>
      ) : (
        <Text style={[type.body, styles.splashText]}>
          {slow ? 'Waking the server. The first load after a quiet spell takes about a minute.' : 'Loading your music…'}
        </Text>
      )}
    </View>
  );
}

/**
 * The pages are rendered to HTML on a build machine, where there are no fonts to load and nothing has
 * been read from storage yet. Waiting for either would put a blank page in front of every search engine,
 * so on the server we render the app as it is and let the browser fill in the rest.
 */
const PRERENDERING = typeof window === 'undefined';

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const hydrated = useSessionHydrated();
  const signedIn = useSignedIn();
  const hasName = useSession((s) => Boolean(s.user?.name?.trim()));
  const catalog = useCatalog((s) => s.status);
  const catalogError = useCatalog((s) => s.error);

  useEffect(() => { void useCatalog.getState().load(); }, []);

  // Everything below, including the splash, sits inside the provider. Without it useSafeAreaInsets
  // answers zero everywhere, which is invisible in a browser — the browser's own chrome pushes the
  // page into the safe region — and wrong the moment the app is installed and owns the whole screen:
  // the greeting runs under the clock and the tab labels disappear behind the home indicator.
  const shell = (body: React.ReactNode) => (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>{body}</SafeAreaProvider>
  );

  if (!PRERENDERING && (!loaded || !hydrated)) return shell(<View style={styles.root} />);
  if (catalog === 'loading') return shell(<Splash />);
  if (catalog === 'error') return shell(<Splash error={__DEV__ ? `${catalogError}\n\nAPI: ${API_URL}` : catalogError} onRetry={() => void useCatalog.getState().load()} />);

  return shell(
    <View style={styles.root}>
      {/* The whole app is dark now, top to bottom. */}
      <StatusBar style="light" />
      {/* Playback is a browser thing; there is no audio on the machine that renders these pages. */}
      {PRERENDERING ? null : <PlayerEngine />}
      <AccountSync signedIn={signedIn} />
      <OfflineBar />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontFamily: font.display, fontSize: 17 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        {/* Open to everyone: the catalogue is what a search result or a shared link lands on, and a
            stranger should hear the music before being asked for a phone number. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ headerTransparent: true, title: '', headerStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="release/[id]" options={{ headerTransparent: true, title: '', headerStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal', headerShown: false, animation: 'fade' }} />
        <Stack.Protected guard={signedIn && !hasName}>
          <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        {/* Everything that spends money, or is about your own account. */}
        <Stack.Protected guard={signedIn && hasName}>
          <Stack.Screen name="buy" options={{ presentation: 'modal', title: 'Complete your purchase' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="gift" options={{ presentation: 'modal', title: 'Send a gift' }} />
          <Stack.Screen name="activity" options={{ title: 'Purchases and gifts' }} />
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
    </View>,
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  splash: { alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  splashText: { color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  retry: { alignSelf: 'stretch', maxWidth: 320, width: '100%' },
});
