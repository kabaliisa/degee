import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, useFonts } from '@expo-google-fonts/figtree';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { PlayerEngine } from '../components/PlayerEngine';
import { colors, font } from '../lib/theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        <Stack.Screen name="topup" options={{ presentation: 'modal', title: 'Add money' }} />
      </Stack>
    </View>
  );
}
