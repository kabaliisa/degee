import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, Text, View } from 'react-native';
import { MiniPlayer } from '../../components/MiniPlayer';
import { Button, Cover, EmptyState, ReleaseCard, SectionTitle, TrackRow } from '../../components/ui';
import { getArtist, releasesByArtist, tracks } from '../../data/catalog';
import { colors, space, type } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artist = getArtist(id);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const currentId = usePlayer((s) => s.queue[s.index]);
  if (!artist) return <EmptyState icon="person-outline" title="Artist not found" body="This page may have moved." />;

  const own = releasesByArtist(artist.id);
  const songs = tracks.filter((t) => t.artistId === artist.id);
  const shareLink = `https://deegee.app/${artist.name.toLowerCase().replace(/\s+/g, '')}`;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={{ alignItems: 'center', padding: space.lg, gap: space.sm }}>
          <Cover title={artist.name} colors={artist.colors} size={140} style={{ borderRadius: 70 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm }}>
            <Text style={type.title}>{artist.name}</Text>
            {artist.verified ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} accessibilityLabel="Verified artist" /> : null}
          </View>
          <Text style={type.small}>{artist.genres.join(' · ')} · {artist.city}</Text>
          <Text style={[type.body, { textAlign: 'center', color: colors.textMuted, marginTop: space.xs }]}>{artist.bio}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <Button label="Play" icon="play" onPress={() => playQueue(songs.map((s) => s.id), 0, owns)} />
            <Button label="Share" icon="share-social" variant="secondary"
              onPress={() => Share.share({ message: `Support ${artist.name} on Deegee: ${shareLink}` })} />
          </View>
        </View>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.lg }}><SectionTitle>Releases</SectionTitle></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.lg }}>
          {own.map((r) => <ReleaseCard key={r.id} release={r} size={130} />)}
        </ScrollView>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}><SectionTitle>Songs</SectionTitle></View>
        {songs.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} isCurrent={currentId === t.id}
            onPlay={() => playQueue(songs.map((s) => s.id), i, owns)}
            onBuy={() => router.push({ pathname: '/buy', params: { kind: 'track', id: t.id } })} />
        ))}
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}
