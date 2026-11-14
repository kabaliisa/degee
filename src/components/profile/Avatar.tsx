import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../../lib/theme';
import { initials } from '../../lib/format';
import { useSession } from '../../store/session';

/** The signed-in user's avatar: their initials on coral. */
export function Avatar({ size = 34 }: { size?: number }) {
  const name = useSession((s) => s.user?.name) ?? '';
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{name ? initials(name) : '♪'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: font.bold, color: colors.accentInk },
});
