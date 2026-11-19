import Ionicons from '@expo/vector-icons/Ionicons';
import { type BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IconName } from '../ui';
import { colors, font, radius, space, withAlpha } from '../../lib/theme';

export const SIDEBAR_WIDTH = 232;

/** Matches the tab order. Icons are the filled/outline pair the tab bar uses. */
const ITEMS: { route: string; label: string; on: IconName; off: IconName }[] = [
  { route: 'index', label: 'Home', on: 'home', off: 'home-outline' },
  { route: 'search', label: 'Discover', on: 'compass', off: 'compass-outline' },
  { route: 'library', label: 'Library', on: 'albums', off: 'albums-outline' },
  { route: 'profile', label: 'Profile', on: 'person', off: 'person-outline' },
];

/**
 * On a wide screen the four tabs move to the side, where there is room for them to stay visible
 * while the content scrolls. The navigator is the same one the phone uses -- only its presentation
 * changes -- so a route is never in two places at once.
 */
export function Sidebar({ state, navigateToTab }: BottomTabBarProps) {
  const current = state.routes[state.index]?.name;
  const keyOf = (route: string) => state.routes.find((r) => r.name === route)?.key;
  return (
    <View style={styles.bar}>
      <Text style={styles.wordmark}>deegee</Text>
      <View style={styles.items}>
        {ITEMS.map((item) => {
          const active = current === item.route;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                const key = keyOf(item.route);
                if (key) navigateToTab(key);
              }}
              // hovered is real on the web, where this layout lives, but it is not in React Native's
              // own Pressable types because a touch screen has no hover.
              style={(s) => {
                const { hovered, pressed } = s as { hovered?: boolean; pressed: boolean };
                return [styles.item, (hovered || pressed) && !active && styles.itemHover, active && styles.itemActive];
              }}>
              <Ionicons name={active ? item.on : item.off} size={22} color={active ? colors.accentText : colors.textMuted} />
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.footer}>Buy direct from Ugandan artists.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.ink,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    paddingHorizontal: space.md,
    paddingTop: space.xl,
    paddingBottom: space.lg,
  },
  wordmark: { fontFamily: font.display, fontSize: 24, color: colors.accentText, paddingHorizontal: space.sm, marginBottom: space.xl },
  items: { gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.sm, height: 46, borderRadius: radius.md },
  itemHover: { backgroundColor: colors.surface },
  itemActive: { backgroundColor: withAlpha(colors.accent, 0.14) },
  label: { fontFamily: font.bold, fontSize: 15, color: colors.textMuted },
  labelActive: { color: colors.accentText },
  footer: { marginTop: 'auto', paddingHorizontal: space.sm, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.textFaint },
});
