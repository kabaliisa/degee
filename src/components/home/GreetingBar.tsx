import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../../lib/theme';
import { useSession } from '../../store/session';

/** Oli otya is how you say hello in Luganda, which is how this app should say it. */
export function GreetingBar() {
  const name = useSession((s) => s.user?.name?.trim().split(' ')[0]);
  return (
    <View style={styles.bar}>
      <View style={styles.words}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.hello}>
          Oli otya{name ? `, ${name}` : ''} <Text style={styles.wave}>👋</Text>
        </Text>
        <Text numberOfLines={1} style={styles.sub}>What are we listening to today?</Text>
      </View>
      <Pressable onPress={() => router.push('/(tabs)/search')} accessibilityRole="button" accessibilityLabel="Search"
        hitSlop={8} style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
        <Ionicons name="search" size={21} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  words: { flex: 1, minWidth: 0 },
  hello: { fontFamily: font.semibold, fontSize: 19, lineHeight: 26, color: colors.text },
  wave: { fontSize: 17 },
  sub: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 1 },
  icon: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  pressed: { opacity: 0.7 },
});
