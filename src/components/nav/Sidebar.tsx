import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IconName } from '../ui';
import { colors, font, radius, space, withAlpha } from '../../lib/theme';

export const SIDEBAR_WIDTH = 232;

/** Matches the tab order. Icons are the filled/outline pair the tab bar uses. */
const ITEMS: { path: string; label: string; on: IconName; off: IconName }[] = [
  { path: '/', label: 'Home', on: 'home', off: 'home-outline' },
  { path: '/search', label: 'Discover', on: 'search', off: 'search-outline' },
  { path: '/library', label: 'Library', on: 'musical-notes', off: 'musical-notes-outline' },
  { path: '/profile', label: 'Profile', on: 'person', off: 'person-outline' },
];

/**
 * On a wide screen the four tabs move to the side, where there is room for them to stay visible
 * while the content scrolls.
 *
 * It navigates by path rather than through the tab navigator, because it lives above the whole app:
 * an artist page is not a tab, and the sidebar has to stay put and stay correct while you are on
 * one. That is the difference between a site and a phone app wearing a sidebar.
 */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <View style={styles.bar}>
      <Text style={styles.wordmark}>deegee</Text>
      <View style={styles.items}>
        {ITEMS.map((item) => {
          const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          return (
            <Pressable
              key={item.path}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => router.navigate(item.path)}
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
