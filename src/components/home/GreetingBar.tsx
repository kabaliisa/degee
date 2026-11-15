import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, space } from '../../lib/theme';
import { useSession } from '../../store/session';

/**
 * The one line on the app addressed to a person rather than about the music.
 *
 * It sits over a photograph, so it uses a true white and a neutral grey rather than the warm pair the
 * rest of the app is set in: warm white over warm skin tones reads as dirty, and the icons are bare
 * because a filled circle behind each one would punch holes in the picture.
 */
const ON_PHOTO = '#FFFFFF';
const ON_PHOTO_MUTED = '#A1A1AA';
const UNREAD = '#D90000';

export function GreetingBar() {
  const first = useSession((s) => s.user?.name?.trim().split(' ')[0]);
  return (
    <View style={styles.bar}>
      <View style={styles.words}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.hello}>
          Oli otya, {first || 'there'} <Text style={styles.wave}>👋</Text>
        </Text>
        <Text numberOfLines={1} style={styles.sub}>What are we listening to today?</Text>
      </View>
      <Pressable onPress={() => router.push('/(tabs)/search')} accessibilityRole="button" accessibilityLabel="Search"
        hitSlop={12} style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
        <Ionicons name="search" size={24} color={ON_PHOTO} />
      </Pressable>
      <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Notification settings"
        hitSlop={12} style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
        <Ionicons name="notifications-outline" size={24} color={ON_PHOTO} />
        <View style={styles.dot} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.xl, paddingHorizontal: space.xl },
  words: { flex: 1, minWidth: 0, gap: space.xs },
  hello: { fontFamily: font.semibold, fontSize: 22, lineHeight: 29, color: ON_PHOTO },
  wave: { fontSize: 19 },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: ON_PHOTO_MUTED },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  dot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: UNREAD },
});
