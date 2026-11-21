import { StyleSheet, Text, View } from 'react-native';
import { useCatalog } from '../api/catalog';
import { colors, font } from '../lib/theme';

/**
 * One line, only when the app couldn't reach the server and is running on the copy it kept. Saying so
 * is the difference between "my music app is broken" and "I'm on the bus".
 */
export function OfflineBar() {
  const stale = useCatalog((s) => s.stale);
  if (!stale) return null;
  return (
    <View style={styles.bar}>
      <View style={styles.dot} />
      <Text style={styles.text}>Offline · you can still play songs you’ve saved</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Being offline is a condition, not an alarm. A gold band across the top of the app reads as
  // something having gone wrong; this says the same thing quietly, and a small amber dot carries
  // the state without the whole bar having to shout it.
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  text: { fontFamily: font.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
