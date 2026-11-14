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
      <Text style={styles.text}>Offline · you can still play songs you’ve saved</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.accent, paddingVertical: 4, paddingHorizontal: 12 },
  text: { fontFamily: font.bold, fontSize: 12, color: colors.accentInk, textAlign: 'center' },
});
