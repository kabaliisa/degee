import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBar, Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '../../components/player/MiniPlayer';
import type { IconName } from '../../components/ui';
import { useLayout } from '../../lib/breakpoints';
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
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  return (
    <Tabs
      // On a wide screen the sidebar and the player sit above this navigator, in the root layout,
      // so that they also stay put on an artist page. The tabs render no bar of their own there.
      tabBar={(props) => (wide ? null : <TabBarWithPlayer {...props} />)}
      screenOptions={{
        headerShown: false,
        // A stacked icon and label need 28 + 15 = 43pt of content box. The default bar leaves less
        // than that, so flexbox shrinks the label instead of the icon and overflow:hidden slices
        // Poppins' descenders -- Library and Discover read as cut in half. 66 with 6/8 padding
        // leaves 52pt, comfortably clear, with the device's own bottom inset added rather than
        // assumed.
        tabBarStyle: [styles.tabBar, {
          height: 66 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        }],
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: styles.scene,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }} />
      {/* The magnifier rather than a compass: searching is what people come to this tab to do, and
          it is the icon the home screen used to carry before this became its home. */}
      <Tabs.Screen name="search" options={{ title: 'Discover', tabBarIcon: tabIcon('search', 'search-outline') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: tabIcon('musical-notes', 'musical-notes-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person', 'person-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { position: 'absolute', left: 0, right: 0, top: -40, height: 120 },
  tabBar: { backgroundColor: colors.ink, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, elevation: 0 },
  // lineHeight is not optional here. Without it the label's box is measured tight -- ten pixels for an
  // eleven pixel font -- and the navigator clips it, so Poppins' descenders are sliced off and the
  // words read as cut in half. Fifteen leaves room for the g in Discover and the y in Library.
  tabLabel: { fontFamily: font.bold, fontSize: 11, lineHeight: 15, flexShrink: 0 },
  scene: { backgroundColor: colors.bg },
});
