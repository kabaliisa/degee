import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Artist } from '../../api';
import { TERMS } from '../../lib/money';
import { colors, font, radius, space, type } from '../../lib/theme';
import { tap } from '../ui';

const openGift = (artistId: string) => { tap(); router.push({ pathname: '/gift', params: { artistId } }); };
const artistSharePct = 100 - TERMS.giftPlatformPct;

/** Compact "Send a gift" button for the artist header row. */
export function GiftButton({ artist }: { artist: Artist }) {
  return (
    <Pressable onPress={() => openGift(artist.id)} accessibilityRole="button" accessibilityLabel={`Send ${artist.name} a gift`}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Ionicons name="gift" size={16} color={colors.accent} />
      <Text style={styles.buttonLabel}>Send a gift</Text>
    </Pressable>
  );
}

/** A card further down the artist page for fans who scroll past the header. */
export function SupportCard({ artist }: { artist: Artist }) {
  return (
    <Pressable onPress={() => openGift(artist.id)} accessibilityRole="button" accessibilityLabel={`Support ${artist.name} directly with a gift`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Ionicons name="gift" size={26} color={colors.accent} />
      <View style={styles.flex}>
        <Text style={type.bodyBold}>Support {artist.name} directly</Text>
        <Text style={type.small}>Send a gift with mobile money. {artistSharePct}% goes straight to them.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accent },
  buttonLabel: { fontFamily: font.bold, fontSize: 13, color: colors.text },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, margin: space.lg, marginBottom: 0, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.surfacePress },
  flex: { flex: 1 },
});
