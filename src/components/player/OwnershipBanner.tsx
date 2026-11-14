import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Artist, Track } from '../../api';
import { formatUGX } from '../../lib/money';
import { colors, font, onDark, radius, space, type, withAlpha } from '../../lib/theme';

/** Under the player controls: a buy prompt during a preview, or a quiet note once you own the song. */
export function OwnershipBanner({ track, artist, isPreview, dark }: { track: Track; artist: Artist; isPreview: boolean; dark?: boolean }) {
  if (!isPreview) {
    return (
      <View style={styles.ownedWrap}>
        <Pressable onPress={() => router.push({ pathname: '/gift', params: { artistId: artist.id } })} accessibilityRole="button"
          style={({ pressed }) => [styles.support, pressed && styles.pressed]}>
          <Ionicons name="heart" size={18} color={colors.accent} />
          <Text style={styles.supportText}>Support the artist</Text>
        </Pressable>
        <Text style={[type.small, styles.centered, dark && styles.mutedDark]}>Yours to keep. Send {artist.name} a gift to help them keep creating.</Text>
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
  ownedWrap: { marginTop: space.xl, gap: space.sm },
  support: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 13, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.12) },
  supportText: { fontFamily: font.display, fontSize: 15, color: '#FF8A6B' },
  pressed: { opacity: 0.8 },
  centered: { textAlign: 'center' },
  upsell: { marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: withAlpha('#FFFFFF', 0.08), borderWidth: 1, borderColor: withAlpha('#FFFFFF', 0.12) },
  flex: { flex: 1 },
  textDark: { color: onDark.text },
  mutedDark: { color: onDark.textMuted },
  upsellTitle: { fontSize: 14 },
  price: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  priceText: { fontFamily: font.bold, color: colors.accentInk, fontSize: 13 },
});
