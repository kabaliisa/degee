import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
  const { width } = useWindowDimensions();
  // "How are you" needs room it does not have on a small phone, where it would clip the person's own
  // name. A narrow screen gets the short form rather than a truncated long one. 384 is where the long
  // form stops fitting beside the two icons, measured rather than guessed; an iPhone SE is 375.
  const greeting = width < 384 ? 'Hi,' : 'How are you,';
  return (
    <View style={styles.bar}>
      <View style={styles.topRow}>
        {/* The wave sits outside the line that truncates, so a long name shortens itself rather
            than swallowing the hand. */}
        <Text accessibilityRole="header" numberOfLines={1} style={styles.hello}>
          {greeting} {first || 'there'}
        </Text>
        <Text style={styles.wave}> 👋</Text>
        <View style={styles.spacer} />
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
      {/* The question runs the full width underneath rather than sharing the line with the icons,
          which is what used to cut it short on a small phone. */}
      <Text numberOfLines={1} style={styles.sub}>What are we listening to today?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: space.xs, paddingHorizontal: space.xl },
  // 'How are you, <name>' is a long line to fit beside two icons. The icons keep their 24px size and
  // a generous hitSlop, but sit closer together so the greeting gets the width instead of truncating.
  topRow: { flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1, minWidth: space.md },
  hello: { flexShrink: 1, fontFamily: font.semibold, fontSize: 20, lineHeight: 27, color: ON_PHOTO },
  wave: { fontSize: 17 },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: ON_PHOTO_MUTED },
  icon: { width: 24, height: 24, marginLeft: space.md, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  dot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: UNREAD },
});
