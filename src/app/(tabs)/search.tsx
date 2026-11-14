import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, releasesInGenre, search, type Genre } from '../../api';
import { LinearGradient } from 'expo-linear-gradient';
import { Art } from '../../components/Art';
import { LightStatusBar } from '../../components/LightStatusBar';
import { Wordmark } from '../../components/Wordmark';
import { EmptyState, ListRow, TrackRow } from '../../components/ui';
import { colors, font, layout, onDark, radius, space, type, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

const GENRES: Genre[] = ['Afrobeat', 'Kadongo Kamu', 'Dancehall', 'Gospel', 'Zouk', 'Hip Hop'];

/** A photo tile: art from a release in that genre, darkened at the foot, with the name in white. */
function GenreTile({ genre, onPress }: { genre: Genre; onPress: () => void }) {
  const sample = releasesInGenre(genre)[0];
  return (
    <View style={styles.genreCell}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={genre}
        style={({ pressed }) => [styles.genreTile, pressed && styles.pressed]}>
        {sample ? <Art seed={sample.id} colors={sample.colors} size={160} style={styles.genreArt} /> : null}
        <LinearGradient colors={[withAlpha(colors.ink, 0), withAlpha(colors.ink, 0.8)]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
        <Text numberOfLines={2} style={styles.genreName}>{genre}</Text>
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
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]}>
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <LightStatusBar />
        <Wordmark size={28} />
        <Text accessibilityRole="header" style={styles.title}>Explore</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.text} />
          <TextInput value={q} onChangeText={setQ} placeholder="Artists, songs, albums" placeholderTextColor={colors.textFaint}
            style={styles.input} autoCorrect={false} returnKeyType="search" accessibilityLabel="Search" />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!searching ? (
        <View style={styles.browse}>
          <Text style={[type.heading, styles.browseTitle]}>Genres</Text>
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
  top: { backgroundColor: colors.ink, paddingHorizontal: space.lg, paddingBottom: space.lg },
  title: { fontFamily: font.display, fontSize: 32, letterSpacing: -1, color: onDark.text, marginTop: space.xs, marginBottom: space.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md },
  input: { flex: 1, minWidth: 0, color: colors.text, paddingVertical: 12, fontSize: 16, fontFamily: font.semibold },
  browse: { paddingHorizontal: space.lg, paddingTop: space.xl },
  browseTitle: { marginBottom: space.md },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  genreCell: { width: '33.333%', padding: 5 },
  genreTile: { height: 92, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink, justifyContent: 'flex-end' },
  pressed: { opacity: 0.85 },
  genreName: { fontFamily: font.display, fontSize: 14, lineHeight: 17, color: onDark.text, padding: space.sm },
  genreArt: { position: 'absolute', left: -20, top: -30, borderRadius: 0 },
});
