import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBar, Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { StyleSheet, View } from 'react-native';
import { MiniPlayer } from '../../components/player/MiniPlayer';
import type { IconName } from '../../components/ui';
import { colors, font, withAlpha } from '../../lib/theme';

function TabIcon({ on, off, focused, color, size }: { on: IconName; off: IconName; focused: boolean; color: string; size: number }) {
  return <Ionicons name={focused ? on : off} size={size} color={color} />;
}

const tabIcon = (on: IconName, off: IconName) => {
  const render = ({ focused, color, size }: { focused: boolean; color: unknown; size: number }) =>
    <TabIcon on={on} off={off} focused={focused} color={color as string} size={size} />;
  render.displayName = `TabIcon(${on})`;
  return render;
};

/** Mini player floats above a tab bar that fades into the content, so art shows through. */
function TabBarWithPlayer(props: BottomTabBarProps) {
  return (
    <View style={styles.dock}>
      <LinearGradient colors={[withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.92), colors.bg]} locations={[0, 0.35, 1]} style={styles.fade} pointerEvents="none" />
      <MiniPlayer />
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBarWithPlayer {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: styles.scene,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="search" options={{ title: 'Discover', tabBarIcon: tabIcon('search', 'search-outline') }} />
      <Tabs.Screen name="library" options={{ title: 'My music', tabBarIcon: tabIcon('musical-notes', 'musical-notes-outline') }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: tabIcon('wallet', 'wallet-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { position: 'absolute', left: 0, right: 0, top: -40, bottom: 0 },
  tabBar: { backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
  tabLabel: { fontFamily: font.bold, fontSize: 11 },
  scene: { backgroundColor: colors.bg },
});
