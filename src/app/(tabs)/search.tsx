import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, releasesInGenre, search, type Genre } from '../../api';
import { Art } from '../../components/Art';
import { EmptyState, ListRow, TrackRow } from '../../components/ui';
import { colors, font, layout, radius, space, type } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

const GENRES: Genre[] = ['Afrobeat', 'Kadongo Kamu', 'Dancehall', 'Gospel', 'Zouk', 'Hip Hop'];

/** Flat dark tile with a tilted piece of art from a release in that genre. */
function GenreTile({ genre, onPress }: { genre: Genre; onPress: () => void }) {
  const sample = releasesInGenre(genre)[0];
  return (
    <View style={styles.genreCell}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={genre}
        style={({ pressed }) => [styles.genreTile, pressed && styles.genreTilePressed]}>
        <Text style={styles.genreName}>{genre}</Text>
        {sample ? <Art seed={sample.id} colors={sample.colors} size={66} style={styles.genreArt} /> : null}
      </Pressable>
    </View>
  );
}

export default function Search() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);

  const results = search(q);
  const searching = q.trim().length > 0;
  const nothing = searching && !results.artists.length && !results.releases.length && !results.tracks.length;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[1]}>
      <Text style={[type.display, styles.title]}>Search</Text>
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.bg} />
          <TextInput value={q} onChangeText={setQ} placeholder="What do you want to hear?" placeholderTextColor={colors.textFaint}
            style={styles.input} autoCorrect={false} returnKeyType="search" accessibilityLabel="Search" />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close" size={20} color={colors.bg} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!searching ? (
        <View style={styles.browse}>
          <Text style={[type.heading, styles.browseTitle]}>Browse by sound</Text>
          <View style={styles.genreGrid}>
            {GENRES.map((g) => <GenreTile key={g} genre={g} onPress={() => setQ(g)} />)}
          </View>
        </View>
      ) : null}

      {nothing ? <EmptyState icon="search" title={`No results for “${q}”`} body="Check the spelling, or try an artist or genre." /> : null}

      {searching && !nothing ? (
        <View>
          {results.artists.map((a) => (
            <ListRow key={a.id} seed={a.id} colors={a.colors} round title={a.name} subtitle="Artist" onPress={() => router.push(`/artist/${a.id}`)} />
          ))}
          {results.releases.map((r) => (
            <ListRow key={r.id} seed={r.id} colors={r.colors} title={r.title} subtitle={`${r.type} · ${getArtist(r.artistId)?.name}`}
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
  title: { paddingHorizontal: space.lg, marginBottom: space.md },
  searchBarWrap: { paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: colors.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.text, borderRadius: radius.md, paddingHorizontal: space.md },
  input: { flex: 1, color: colors.bg, paddingVertical: 12, fontSize: 16, fontFamily: font.semibold },
  browse: { paddingHorizontal: space.lg },
  browseTitle: { marginBottom: space.md },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  genreCell: { width: '50%', padding: 5 },
  genreTile: { height: 100, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceRaised },
  genreTilePressed: { backgroundColor: colors.surfacePress },
  genreName: { fontFamily: font.display, fontSize: 18, color: colors.text, padding: space.md, width: '75%' },
  genreArt: { position: 'absolute', right: -12, bottom: -6, transform: [{ rotate: '25deg' }] },
});
