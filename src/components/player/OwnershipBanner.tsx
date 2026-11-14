import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Artist, Track } from '../../api';
import { formatUGX } from '../../lib/money';
import { colors, font, onDark, radius, space, type, withAlpha } from '../../lib/theme';

/** Under the player controls: a buy prompt during a preview, or a quiet note once you own the song. */
export function OwnershipBanner({ track, artist, isPreview, dark }: { track: Track; artist: Artist; isPreview: boolean; dark?: boolean }) {
  if (!isPreview) {
    return (
      <View style={styles.owned}>
        <Ionicons name="checkmark-circle" size={16} color={colors.lime} />
        <Text style={[type.small, dark && styles.mutedDark]}>Yours, saved to play any time.</Text>
      </View>
    );
  }
  return (
    <Pressable onPress={() => router.push({ pathname: '/buy', params: { kind: 'track', id: track.id } })} accessibilityRole="button"
      accessibilityLabel={`Buy ${track.title} for ${formatUGX(track.priceUGX)}`} style={styles.upsell}>
      <Ionicons name="lock-open-outline" size={22} color={colors.accent} />
      <View style={styles.flex}>
        <Text style={[type.bodyBold, styles.upsellTitle, dark && styles.textDark]}>Hear it all, keep it forever</Text>
        <Text style={[type.small, dark && styles.mutedDark]}>Most of it goes straight to {artist.name}.</Text>
      </View>
      <View style={styles.price}>
        <Text style={styles.priceText}>{formatUGX(track.priceUGX)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  owned: { marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' },
  upsell: { marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: withAlpha('#FFFFFF', 0.08), borderWidth: 1, borderColor: withAlpha('#FFFFFF', 0.12) },
  flex: { flex: 1 },
  textDark: { color: onDark.text },
  mutedDark: { color: onDark.textMuted },
  upsellTitle: { fontSize: 14 },
  price: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  priceText: { fontFamily: font.bold, color: colors.accentInk, fontSize: 13 },
});
