import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font, radius, space, type } from '../../lib/theme';

/**
 * A heading with a short red rule beneath it. The rule is the one place the flag's red appears: it marks
 * a section the way a stripe does, which is why it stays a mark and never becomes a fill or a button.
 */
export function SectionHeading({ title, onSeeAll, rule = true }: { title: string; onSeeAll?: () => void; rule?: boolean }) {
  return (
    <View style={styles.row}>
      <View>
        <Text accessibilityRole="header" style={type.title}>{title}</Text>
        {rule ? <View style={styles.rule} /> : null}
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} accessibilityRole="link" hitSlop={10} style={styles.seeAll}>
          <Text style={styles.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: space.lg, marginBottom: space.md },
  rule: { width: 34, height: 3, borderRadius: radius.pill, backgroundColor: colors.flag, marginTop: 6 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 4 },
  seeAllText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
});
