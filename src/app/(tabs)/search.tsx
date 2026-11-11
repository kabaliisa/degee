import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Art } from '../../components/Art';
import { EmptyState, TrackRow } from '../../components/ui';
import { getArtist, releases, search, type Genre } from '../../data/catalog';
import { colors, font, radius, space, type } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

// Each genre tile gets its own colour and a tilted piece of art from a release in it.
const GENRES: { name: Genre; color: string }[] = [
  { name: 'Afrobeat', color: '#C2410C' },
  { name: 'Kadongo Kamu', color: '#3F6212' },
  { name: 'Dancehall', color: '#9D174D' },
  { name: 'Gospel', color: '#1D4ED8' },
  { name: 'Zouk', color: '#B45309' },
  { name: 'Hip Hop', color: '#4B5563' },
];

export default function Search() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  useEffect(() => { if (params.q) setQ(params.q); }, [params.q]);
  const results = search(q);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const searching = q.trim().length > 0;
  const nothing = searching && !results.artists.length && !results.releases.length && !results.tracks.length;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: 170 }} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[1]}>
      <Text style={[type.display, { paddingHorizontal: space.lg, marginBottom: space.md }]}>Search</Text>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.text, borderRadius: radius.md, paddingHorizontal: space.md }}>
          <Ionicons name="search" size={20} color={colors.bg} />
          <TextInput value={q} onChangeText={setQ} placeholder="What do you want to hear?" placeholderTextColor="#6b6070"
            style={{ flex: 1, color: colors.bg, paddingVertical: 12, fontSize: 16, fontFamily: font.semibold }} autoCorrect={false} returnKeyType="search" accessibilityLabel="Search" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search"><Ionicons name="close" size={20} color={colors.bg} /></Pressable> : null}
        </View>
      </View>

      {!searching ? (
        <View style={{ paddingHorizontal: space.lg }}>
          <Text style={[type.heading, { marginBottom: space.md }]}>Browse by sound</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
            {GENRES.map((g) => {
              const sample = releases.find((r) => getArtist(r.artistId)?.genres.includes(g.name));
              return (
                <View key={g.name} style={{ width: '50%', padding: 5 }}>
                  <Pressable onPress={() => setQ(g.name)} style={({ pressed }) => ({ height: 100, borderRadius: radius.md, overflow: 'hidden', backgroundColor: g.color, opacity: pressed ? 0.85 : 1 })}>
                    <Text style={{ fontFamily: font.display, fontSize: 18, color: '#fff', padding: space.md, width: '75%' }}>{g.name}</Text>
                    {sample ? <Art seed={sample.id} colors={sample.colors} size={66} style={{ position: 'absolute', right: -12, bottom: -6, transform: [{ rotate: '25deg' }] }} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {nothing ? <EmptyState icon="search" title={`No results for “${q}”`} body="Check the spelling, or try an artist or genre." /> : null}

      {searching && !nothing ? (
        <View>
          {results.artists.map((a) => (
            <Pressable key={a.id} onPress={() => router.push(`/artist/${a.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.lg, backgroundColor: pressed ? colors.surface : 'transparent' })}>
              <Art seed={a.id} colors={a.colors} size={48} round />
              <View><Text style={type.body}>{a.name}</Text><Text style={type.small}>Artist</Text></View>
            </Pressable>
          ))}
          {results.releases.map((r) => (
            <Pressable key={r.id} onPress={() => router.push(`/release/${r.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.lg, backgroundColor: pressed ? colors.surface : 'transparent' })}>
              <Art seed={r.id} colors={r.colors} size={48} />
              <View><Text style={type.body}>{r.title}</Text><Text style={type.small}>{r.type} · {getArtist(r.artistId)?.name}</Text></View>
            </Pressable>
          ))}
          {results.tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} onPlay={() => playQueue(results.tracks.map((x) => x.id), i, owns)} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
