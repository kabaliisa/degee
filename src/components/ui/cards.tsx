import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getArtist, type Artist, type Release } from '../../api';
import { colors, space, type } from '../../lib/theme';
import { Art } from '../Art';

/** A titled horizontal row, the backbone of every browse screen. */
export function Shelf({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHeader}>
        {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
        <Text style={type.heading}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
        {children}
      </ScrollView>
    </View>
  );
}

export function ReleaseCard({ release, size = 148, subtitle }: { release: Release; size?: number; subtitle?: string }) {
  const artist = getArtist(release.artistId);
  return (
    <Pressable onPress={() => router.push(`/release/${release.id}`)} accessibilityLabel={`${release.title} by ${artist?.name}`}
      style={({ pressed }) => [{ width: size }, pressed && styles.pressed]}>
      <Art seed={release.id} colors={release.colors} size={size} />
      <Text numberOfLines={1} style={[type.bodyBold, styles.cardTitle]}>{release.title}</Text>
      <Text numberOfLines={2} style={type.small}>{subtitle ?? `${release.type} by ${artist?.name}`}</Text>
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
  shelfRow: { gap: space.lg, paddingHorizontal: space.lg },
  cardTitle: { marginTop: space.sm },
  centered: { textAlign: 'center' },
  pressed: { opacity: 0.75 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.lg },
  listRowPressed: { backgroundColor: colors.surface },
  flex: { flex: 1 },
});
