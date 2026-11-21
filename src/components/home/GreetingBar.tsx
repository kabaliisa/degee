import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, space, withAlpha } from '../../lib/theme';
import { useSession } from '../../store/session';

/**
 * The one line on the app addressed to a person rather than about the music.
 *
 * It sits over a photograph, so it uses a true white and a neutral grey rather than the warm pair the
 * rest of the app is set in: warm white over warm skin tones reads as dirty, and the icons are bare
 * because a filled circle behind each one would punch holes in the picture.
 */
const ON_PHOTO = '#FFFFFF';

/**
 * How tall this bar stands. The hero starts the photograph directly under it, so the two have to
 * agree; kept here beside the styles that decide it rather than guessed at from the other side.
 */
export const GREETING_HEIGHT = 36;

/** Two letters: the initials of a two-part name, or the first two of a single one. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? '').slice(0, 2).toUpperCase();
}

export function GreetingBar() {
  const name = useSession((s) => s.user?.name?.trim());
  const initials = name ? initialsOf(name) : '';
  return (
    <View style={styles.bar}>
      <View style={styles.topRow}>
        {/* Without "today" -- at 18pt semibold the longer line truncates on a 390pt phone beside
            the bell and the avatar, and a question cut off mid-word is worse than a shorter one. */}
        <Text accessibilityRole="header" numberOfLines={1} style={styles.hello}>
          What are we listening to?
        </Text>
        <View style={styles.spacer} />
        {/* Signed in, the person's own initials; signed out there is nobody to initial, so the
            generic figure stands in rather than two invented letters. */}
        <Pressable onPress={() => router.push(initials ? '/(tabs)/profile' : '/sign-in')}
          accessibilityRole="button" accessibilityLabel={initials ? `Your profile, ${name}` : 'Sign in'}
          hitSlop={12} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
          {initials
            ? <Text style={styles.initials}>{initials}</Text>
            : <Ionicons name="person" size={17} color={ON_PHOTO} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: space.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', minHeight: GREETING_HEIGHT },
  spacer: { flex: 1, minWidth: space.md },
  hello: { flexShrink: 1, fontFamily: font.semibold, fontSize: 18, lineHeight: 26, color: ON_PHOTO },
  // A ring rather than a filled disc, so it reads as the person's mark on the photograph instead of
  // a hole punched in it.
  avatar: {
    width: 34, height: 34, borderRadius: 17, marginLeft: space.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(ON_PHOTO, 0.65), backgroundColor: withAlpha('#000000', 0.25),
  },
  initials: { fontFamily: font.bold, fontSize: 13, lineHeight: 17, color: ON_PHOTO, letterSpacing: 0.3 },
  pressed: { opacity: 0.6 },
});
