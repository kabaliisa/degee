import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getArtist, tracksForRelease, type Artist, type Release } from '../../api';
import { formatUGX } from '../../lib/money';
import { useWallet } from '../../store/wallet';
import { colors, font, radius, space, type } from '../../lib/theme';
import { Art } from '../Art';

/** A titled horizontal row, the backbone of every browse screen. */
export function Shelf({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHeader}>
        <Text style={type.heading}>{title}</Text>
        {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * A price reads as a fact, so it is set as plain type. Owning something is a state, so it gets the one
 * chip: the lime tick is the only badge in a shelf, which is what makes it carry.
 */
export function PriceTag({ release, onDark }: { release: Release; onDark?: boolean }) {
  const owned = useWallet((s) => tracksForRelease(release.id).every((t) => s.ownedTracks.includes(t.id)));
  if (owned) {
    return (
      <View style={[styles.ownedChip, onDark && styles.ownedChipOnDark]}>
        <Ionicons name="checkmark" size={13} color={colors.limeInk} />
        <Text style={styles.ownedText}>Owned</Text>
      </View>
    );
  }
  return <Text style={[styles.price, onDark && styles.priceOnDark]}>{formatUGX(release.priceUGX)}</Text>;
}

export function ReleaseCard({ release, size = 148, subtitle, price = true }: { release: Release; size?: number; subtitle?: string; price?: boolean }) {
  const artist = getArtist(release.artistId);
  return (
    <Pressable onPress={() => router.push(`/release/${release.id}`)} accessibilityLabel={`${release.title} by ${artist?.name}`}
      style={({ pressed }) => [{ width: size }, pressed && styles.pressed]}>
      <View>
        <Art seed={release.id} colors={release.colors} size={size} style={styles.cover} />
        {release.year >= new Date().getFullYear() ? <View style={styles.newBadge}><Text style={styles.newText}>NEW</Text></View> : null}
      </View>
      <Text numberOfLines={1} style={[type.bodyBold, styles.cardTitle]}>{release.title}</Text>
      <Text numberOfLines={1} style={type.small}>{subtitle ?? artist?.name}</Text>
      {price ? <PriceTag release={release} /> : null}
    </Pressable>
  );
}

export function ArtistCard({ artist, size = 132 }: { artist: Artist; size?: number }) {
  return (
    <Pressable onPress={() => router.push(`/artist/${artist.id}`)} accessibilityLabel={artist.name}
      style={({ pressed }) => [{ width: size }, pressed && styles.pressed]}>
      <Art seed={artist.id} colors={artist.colors} size={size} round />
      <Text numberOfLines={1} style={[type.bodyBold, styles.cardTitle, styles.centered]}>{artist.name}</Text>
      <Text numberOfLines={1} style={[type.small, styles.centered]}>Artist</Text>
    </Pressable>
  );
}

/** A tappable list row with art and two lines of text: used for artists and releases in lists. */
export function ListRow({ seed, colors: art, round, title, subtitle, onPress, artSize = 48 }: {
  seed: string; colors: [string, string]; round?: boolean; title: string; subtitle: string; onPress: () => void; artSize?: number;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}>
      <Art seed={seed} colors={art} size={artSize} round={round} />
      <View style={styles.flex}>
        <Text numberOfLines={1} style={type.bodyBold}>{title}</Text>
        <Text numberOfLines={1} style={type.small}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shelf: { marginTop: space.xl },
  shelfHeader: { paddingHorizontal: space.lg, marginBottom: space.md },
  shelfRow: { gap: space.md, paddingHorizontal: space.lg },
  cover: { borderRadius: radius.md },
  newBadge: { position: 'absolute', left: 8, top: 8, backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 },
  newText: { fontFamily: font.display, fontSize: 10, letterSpacing: 0.5, color: colors.accentInk },
  price: { fontFamily: font.bold, fontSize: 13, color: colors.text, marginTop: 2 },
  priceOnDark: { fontSize: 15, color: '#FFFFFF', marginTop: 0 },
  ownedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginTop: 4, paddingVertical: 2, paddingLeft: 5, paddingRight: 9, borderRadius: radius.pill, backgroundColor: colors.lime },
  ownedChipOnDark: { marginTop: 0, paddingVertical: 6, paddingLeft: 10, paddingRight: 14 },
  ownedText: { fontFamily: font.bold, fontSize: 12, color: colors.limeInk },
  cardTitle: { marginTop: space.sm },
  centered: { textAlign: 'center' },
  pressed: { opacity: 0.75 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.lg },
  listRowPressed: { backgroundColor: colors.surfaceRaised },
  flex: { flex: 1 },
});
