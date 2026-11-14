import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, onDark, radius, space } from '../../lib/theme';
import { Wordmark } from '../Wordmark';

/**
 * The dark top every main screen shares: the wordmark, a big white title, and room for one thing below
 * (a search box, a profile). It runs up under the status bar and ends in rounded corners.
 */
export function ScreenHeader({ title, subtitle, right, children }: {
  title?: string; subtitle?: ReactNode; right?: ReactNode; children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.bar}>
        <Wordmark size={28} style={styles.flex} />
        {right}
      </View>
      {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

/**
 * Keeps the status bar readable once a dark header has scrolled away: a strip of the same dark behind
 * the clock and battery. Put it after the scroll view so it sits on top.
 */
export function StatusBarStrip({ visible = true }: { visible?: boolean }) {
  const insets = useSafeAreaInsets();
  if (!visible || insets.top === 0) return null;
  return <View pointerEvents="none" style={[styles.strip, { height: insets.top }]} />;
}

const styles = StyleSheet.create({
  top: { backgroundColor: colors.ink, paddingHorizontal: space.lg, paddingBottom: space.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  flex: { flex: 1 },
  title: { fontFamily: font.display, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: onDark.text, marginTop: space.xs },
  subtitle: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, color: onDark.textMuted, marginTop: space.xs },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.ink },
});
