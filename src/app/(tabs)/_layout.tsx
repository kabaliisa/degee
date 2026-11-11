import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBar, Tabs } from 'expo-router/tabs';
import { View } from 'react-native';
import { MiniPlayer } from '../../components/MiniPlayer';
import { colors, font, withAlpha } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (on: IconName, off: IconName) =>
  ({ color, size, focused }: { color: unknown; size: number; focused: boolean }) =>
    <Ionicons name={focused ? on : off} size={size} color={color as string} />;

export default function TabsLayout() {
  return (
    <Tabs
      // Mini player floats above a tab bar that fades into the content, so art shows through.
      tabBar={(props) => (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <LinearGradient colors={[withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.92), colors.bg]} locations={[0, 0.35, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: -40, bottom: 0 }} pointerEvents="none" />
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen name="library" options={{ title: 'Your music', tabBarIcon: icon('library', 'library-outline') }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: icon('wallet', 'wallet-outline') }} />
    </Tabs>
  );
}
