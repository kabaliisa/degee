import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cover, EmptyState, ReleaseCard, SectionTitle, TrackRow } from '../../components/ui';
import { search } from '../../data/catalog';
import { colors, radius, space, type } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

export default function Search() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  useEffect(() => { if (params.q) setQ(params.q); }, [params.q]);
  const results = search(q);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const nothing = q.trim() && !results.artists.length && !results.releases.length && !results.tracks.length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={{ padding: space.lg }}>
        <Text style={[type.title, { marginBottom: space.md }]}>Search</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md }}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Artists, songs, genres" placeholderTextColor={colors.textFaint}
            style={{ flex: 1, color: colors.text, paddingVertical: 12, fontSize: 16 }} autoCorrect={false} returnKeyType="search" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.textFaint} /></Pressable> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        {!q.trim() ? <EmptyState icon="musical-notes" title="Find your next favourite" body="Try “Kadongo Kamu”, “Gospel” or an artist's name." /> : null}
        {nothing ? <EmptyState icon="sad-outline" title="No matches" body={`Nothing found for “${q}”.`} /> : null}

        {results.artists.length ? (
          <View style={{ paddingHorizontal: space.lg, marginBottom: space.lg }}>
            <SectionTitle>Artists</SectionTitle>
            {results.artists.map((a) => (
              <Pressable key={a.id} onPress={() => router.push(`/artist/${a.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
                <Cover title={a.name} colors={a.colors} size={48} style={{ borderRadius: 24 }} />
                <View><Text style={[type.body, { fontWeight: '700' }]}>{a.name}</Text><Text style={type.small}>{a.genres.join(' · ')} · {a.city}</Text></View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {results.releases.length ? (
          <View style={{ marginBottom: space.lg }}>
            <View style={{ paddingHorizontal: space.lg }}><SectionTitle>Releases</SectionTitle></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.lg }}>
              {results.releases.map((r) => <ReleaseCard key={r.id} release={r} size={120} />)}
            </ScrollView>
          </View>
        ) : null}

        {results.tracks.length ? (
          <View>
            <View style={{ paddingHorizontal: space.lg }}><SectionTitle>Songs</SectionTitle></View>
            {results.tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} onPlay={() => playQueue(results.tracks.map((x) => x.id), i, owns)}
                onBuy={() => router.push({ pathname: '/buy', params: { kind: 'track', id: t.id } })} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
