import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { MiniPlayer } from '../../components/MiniPlayer';
import { colors } from '../../lib/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} size={size} color={color as string} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.bg },
      }}
      screenLayout={({ children }) => (
        <>
          {children}
          <MiniPlayer />
        </>
      )}>
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: icon('disc') }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: icon('search') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: icon('albums') }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: icon('wallet') }} />
    </Tabs>
  );
}
