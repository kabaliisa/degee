import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Art } from '../../components/Art';
import { MiniPlayer } from '../../components/MiniPlayer';
import { Button, EmptyState, IconButton, PlayButton, ReleaseCard, Shelf, TrackRow } from '../../components/ui';
import { getArtist, getRelease, releasesByArtist, totalDuration, tracksForRelease } from '../../data/catalog';
import { formatUGX } from '../../lib/money';
import { colors, font, shade, space, type } from '../../lib/theme';
import { useLikes } from '../../store/likes';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

export default function ReleaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const release = getRelease(id);
  const ownedIds = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const currentRelease = usePlayer((s) => s.current()?.releaseId);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const liked = useLikes((s) => s.liked);
  const toggleLike = useLikes((s) => s.toggleLike);
  if (!release) return <EmptyState icon="disc-outline" title="Release not found" body="It may have been removed by the artist." />;

  const artist = getArtist(release.artistId)!;
  const list = tracksForRelease(release.id);
  const ownedCount = list.filter((t) => ownedIds.includes(t.id)).length;
  const ownsAll = ownedCount === list.length;
  const saved = list.every((t) => liked.includes(t.id));
  const separateTotal = list.reduce((s, t) => s + t.priceUGX, 0);
  const mins = Math.round(totalDuration(list) / 60);
  const playingThis = currentRelease === release.id && isPlaying;
  const more = releasesByArtist(artist.id).filter((r) => r.id !== release.id);

  const play = () => (currentRelease === release.id ? toggle() : playQueue(list.map((t) => t.id), 0, owns));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <LinearGradient colors={[shade(release.colors[0], 0.25), shade(release.colors[1], 0.55), colors.bg]} locations={[0, 0.55, 1]}
          style={{ paddingTop: insets.top + 56, paddingHorizontal: space.lg, paddingBottom: space.md }}>
          <View style={{ alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }}>
            <Art seed={release.id} colors={release.colors} size={240} />
          </View>
          <Text style={[type.display, { marginTop: space.xl }]}>{release.title}</Text>
          <Pressable onPress={() => router.push(`/artist/${artist.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
            <Art seed={artist.id} colors={artist.colors} size={24} round />
            <Text style={type.bodyBold}>{artist.name}</Text>
          </Pressable>
          <Text style={[type.small, { marginTop: space.xs }]}>
            {release.type} · {release.year}{release.exclusive ? ' · Only on Deegee' : ''}
          </Text>
        </LinearGradient>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, marginBottom: space.md }}>
          <IconButton name={saved ? 'checkmark-circle' : 'add-circle-outline'} active={saved} size={28}
            label={saved ? 'Remove from your music' : 'Save to your music'}
            onPress={() => list.forEach((t) => { if (saved === liked.includes(t.id)) toggleLike(t.id); })} />
          <IconButton name="share-outline" size={24} label="Share"
            onPress={() => Share.share({ message: `Listen to ${release.title} by ${artist.name} on Deegee` })} />
          {ownsAll ? <IconButton name="arrow-down-circle" active size={28} label="Downloaded" onPress={() => {}} /> : null}
          <View style={{ flex: 1 }} />
          {!ownsAll ? (
            <Button small label={`Buy ${formatUGX(release.priceUGX)}`} variant="outline"
              onPress={() => router.push({ pathname: '/buy', params: { kind: 'release', id: release.id } })} />
          ) : null}
          <PlayButton playing={playingThis} onPress={play} />
        </View>

        {!ownsAll ? (
          <Text style={[type.small, { paddingHorizontal: space.lg, marginBottom: space.sm }]}>
            {ownedCount ? `You own ${ownedCount} of ${list.length}. ` : 'Previews play 30 seconds. '}
            {list.length > 1 && separateTotal > release.priceUGX ? `The full ${release.type.toLowerCase()} saves ${formatUGX(separateTotal - release.priceUGX)}.` : ''}
          </Text>
        ) : null}

        {list.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} showArt={false} onPlay={() => playQueue(list.map((x) => x.id), i, owns)} />
        ))}

        <Text style={[type.small, { paddingHorizontal: space.lg, marginTop: space.lg }]}>
          {list.length} song{list.length === 1 ? '' : 's'}, {mins} min
        </Text>
        <Text style={[type.small, { paddingHorizontal: space.lg, fontFamily: font.regular, color: colors.textFaint }]}>
          ℗ {release.year} {artist.name}. Released on Deegee.
        </Text>

        {more.length ? (
          <Shelf title={`More by ${artist.name}`}>
            {more.map((r) => <ReleaseCard key={r.id} release={r} size={140} subtitle={`${r.year} · ${r.type}`} />)}
          </Shelf>
        ) : null}
      </ScrollView>
      <MiniPlayer floating />
    </View>
  );
}
