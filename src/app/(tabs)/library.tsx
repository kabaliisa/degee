import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, TrackRow } from '../../components/ui';
import { getTrack } from '../../data/catalog';
import { space, type } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

export default function Library() {
  const ownedIds = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const currentId = usePlayer((s) => s.queue[s.index]);
  const owned = ownedIds.map(getTrack).filter((t) => t !== undefined);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={{ padding: space.lg }}>
        <Text style={type.title}>Your music</Text>
        <Text style={type.small}>{owned.length} song{owned.length === 1 ? '' : 's'} you own · yours to keep</Text>
      </View>
      {owned.length === 0 ? (
        <EmptyState icon="albums-outline" title="Nothing here yet" body="Songs you buy live here. Play them in full, any time."
          action={<Button label="Discover music" onPress={() => router.push('/(tabs)')} style={{ marginTop: space.md }} />} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
          {owned.length > 1 ? <Button label="Play all" icon="play" variant="secondary" style={{ marginHorizontal: space.lg, marginBottom: space.md }}
            onPress={() => playQueue(owned.map((t) => t.id), 0, owns)} /> : null}
          {owned.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} isCurrent={currentId === t.id} onPlay={() => playQueue(owned.map((x) => x.id), i, owns)} />
          ))}
          <Text style={[type.small, { padding: space.lg }]}>Offline downloads arrive in the next build.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
