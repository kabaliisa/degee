import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getArtist, releasesInGenre, search, type Genre } from '../../api';
import { LinearGradient } from 'expo-linear-gradient';
import { Art } from '../../components/Art';
import { EmptyState, ListRow, ScreenHeader, TrackRow } from '../../components/ui';
import { colors, font, layout, onDark, radius, space, type, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';
import { useLayout } from '../../lib/breakpoints';
import { SIDEBAR_WIDTH } from '../../components/nav/Sidebar';
import { artistHref } from '../../lib/slug';

const GENRES: Genre[] = ['Afrobeat', 'Kadongo Kamu', 'Dancehall', 'Gospel', 'Zouk', 'Hip Hop'];

/** A photo tile: art from a release in that genre, darkened at the foot, with the name in white. */
function GenreTile({ genre, onPress, cellWidth, tall }: { genre: Genre; onPress: () => void; cellWidth: number; tall?: boolean }) {
  const sample = releasesInGenre(genre)[0];
  // The art is a square laid behind the tile, so it has to be wider than the tile it is covering --
  // at a fixed 160 a desktop tile showed a photograph for its first third and flat ink after it.
  const artSize = Math.max(160, cellWidth * 1.5);
  return (
    <View style={[styles.genreCell, { width: cellWidth }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={genre}
        style={({ pressed }) => [styles.genreTile, tall && styles.genreTileTall, pressed && styles.pressed]}>
        {sample ? <Art seed={sample.id} size={artSize} style={styles.genreArt} /> : null}
        <LinearGradient colors={[withAlpha(colors.ink, 0), withAlpha(colors.ink, 0.8)]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
        <Text numberOfLines={2} style={styles.genreName}>{genre}</Text>
      </Pressable>
    </View>
  );
}

export default function Search() {
  const [q, setQ] = useState('');
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);

  const { wide, width } = useLayout();
  // The grid is laid out in pixels rather than percentages because the tile's artwork has to be
  // sized to the cell, and a percentage tells you nothing about how wide that is.
  const gridWidth = Math.min(width - (wide ? SIDEBAR_WIDTH : 0), 1180) - space.lg * 2;
  // Three across at every width: there are six genres, so three gives two full rows instead of
  // a row of five and an orphan.
  const cellWidth = gridWidth / 3;

  const results = search(q);
  const searching = q.trim().length > 0;
  const nothing = searching && !results.artists.length && !results.releases.length && !results.tracks.length;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]}>
      <ScreenHeader title="Discover">
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.text} />
          <TextInput value={q} onChangeText={setQ} placeholder="Artists, songs, albums" placeholderTextColor={colors.textFaint}
            style={styles.input} autoCorrect={false} returnKeyType="search" accessibilityLabel="Search" />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </ScreenHeader>

      {!searching ? (
        <View style={styles.browse}>
          <Text style={[type.heading, styles.browseTitle]}>Genres</Text>
          <View style={styles.genreGrid}>
            {GENRES.map((g) => <GenreTile key={g} genre={g} cellWidth={cellWidth} tall={wide} onPress={() => setQ(g)} />)}
          </View>
        </View>
      ) : null}

      {nothing ? <EmptyState icon="search" title={`No results for “${q}”`} body="Check the spelling, or try an artist or genre." /> : null}

      {searching && !nothing ? (
        <View style={styles.results}>
          {results.artists.map((a) => (
            <ListRow key={a.id} seed={a.id} round title={a.name} subtitle="Artist" onPress={() => router.push(artistHref(a))} />
          ))}
          {results.releases.map((r) => (
            <ListRow key={r.id} seed={r.id} title={r.title} subtitle={`${r.type} · ${getArtist(r.artistId)?.name}`}
              onPress={() => router.push(`/release/${r.id}`)} />
          ))}
          {results.tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} onPlay={() => playQueue(results.tracks.map((x) => x.id), i, owns)} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: layout.tabScreenBottom },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, marginTop: space.md, minHeight: 48 },
  input: { flex: 1, minWidth: 0, color: colors.text, paddingVertical: 12, fontSize: 16, fontFamily: font.semibold },
  results: { paddingTop: space.md },
  browse: { paddingHorizontal: space.lg, paddingTop: space.xl },
  browseTitle: { marginBottom: space.md },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  genreCell: { padding: 5 },
  genreTileTall: { height: 150 },
  genreTile: { height: 92, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink, justifyContent: 'flex-end' },
  pressed: { opacity: 0.85 },
  genreName: { fontFamily: font.display, fontSize: 14, lineHeight: 17, color: onDark.text, padding: space.sm },
  genreArt: { position: 'absolute', left: -20, top: -30, borderRadius: 0 },
});

