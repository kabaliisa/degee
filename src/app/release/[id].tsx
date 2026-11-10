import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MiniPlayer } from '../../components/MiniPlayer';
import { Button, Cover, EmptyState, TrackRow } from '../../components/ui';
import { getArtist, getRelease, tracksForRelease } from '../../data/catalog';
import { formatUGX } from '../../lib/money';
import { colors, space, type } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

export default function ReleaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const release = getRelease(id);
  const ownedIds = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const currentId = usePlayer((s) => s.queue[s.index]);
  if (!release) return <EmptyState icon="disc-outline" title="Release not found" body="This page may have moved." />;

  const artist = getArtist(release.artistId)!;
  const list = tracksForRelease(release.id);
  const ownsAll = list.every((t) => ownedIds.includes(t.id));
  const separateTotal = list.reduce((s, t) => s + t.priceUGX, 0);
  const saving = separateTotal - release.priceUGX;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={{ alignItems: 'center', padding: space.lg, gap: space.xs }}>
          <Cover title={release.title} colors={release.colors} size={220} />
          <Text style={[type.title, { marginTop: space.md }]}>{release.title}</Text>
          <Pressable onPress={() => router.push(`/artist/${artist.id}`)}>
            <Text style={[type.body, { color: colors.accent, fontWeight: '600' }]}>{artist.name}</Text>
          </Pressable>
          <Text style={type.small}>{release.type} · {release.year} · {list.length} song{list.length === 1 ? '' : 's'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.lg }}>
          <Button label={ownsAll ? 'Play' : 'Preview'} icon="play" variant={ownsAll ? 'primary' : 'secondary'} style={{ flex: 1 }}
            onPress={() => playQueue(list.map((t) => t.id), 0, owns)} />
          {!ownsAll ? (
            <Button label={`Buy ${formatUGX(release.priceUGX)}`} icon="bag-handle" style={{ flex: 1.4 }}
              onPress={() => router.push({ pathname: '/buy', params: { kind: 'release', id: release.id } })} />
          ) : null}
        </View>
        {!ownsAll && list.length > 1 && saving > 0 ? (
          <Text style={[type.small, { textAlign: 'center', marginTop: -space.sm, marginBottom: space.md }]}>Save {formatUGX(saving)} versus buying songs one by one</Text>
        ) : null}

        {list.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} isCurrent={currentId === t.id}
            onPlay={() => playQueue(list.map((x) => x.id), i, owns)}
            onBuy={() => router.push({ pathname: '/buy', params: { kind: 'track', id: t.id } })} />
        ))}
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}
