import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease, releasesByArtist, tracksForRelease } from '../../api';
import { Art } from '../../components/Art';
import { ArtworkBackdrop } from '../../components/ArtworkBackdrop';
import { MiniPlayer } from '../../components/player/MiniPlayer';
import { Button, EmptyState, IconButton, PlayButton, ReleaseCard, Shelf, TrackRow } from '../../components/ui';
import { PREVIEW_SEC, totalDuration } from '../../lib/format';
import { formatUGX } from '../../lib/money';
import { colors, font, layout, space, type } from '../../lib/theme';
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
  const artist = release ? getArtist(release.artistId) : undefined;
  if (!release || !artist) return <EmptyState icon="disc-outline" title="Release not found" body="It may have been removed by the artist." />;

  const list = tracksForRelease(release.id);
  const ids = list.map((t) => t.id);
  const ownedCount = ids.filter((t) => ownedIds.includes(t)).length;
  const ownsAll = ownedCount === list.length;
  const saved = ids.every((t) => liked.includes(t));
  const saving = list.reduce((s, t) => s + t.priceUGX, 0) - release.priceUGX;
  const mins = Math.round(totalDuration(list) / 60);
  const more = releasesByArtist(artist.id).filter((r) => r.id !== release.id);

  const play = () => (currentRelease === release.id ? toggle() : playQueue(ids, 0, owns));
  const toggleSaved = () => ids.forEach((t) => { if (saved === liked.includes(t)) toggleLike(t); });
  const share = () => Share.share({ message: `Listen to ${release.title} by ${artist.name} on Deegee` });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Taller than the header so the colour runs down behind the title and fades out there. */}
        <ArtworkBackdrop seed={release.id} colors={release.colors} height={insets.top + 56 + 240 + 200} fadeAt={1} />
        <View style={[styles.header, { paddingTop: insets.top + 56 }]}>
          <View style={styles.cover}>
            <Art seed={release.id} colors={release.colors} size={240} />
          </View>
          <Text style={[type.display, styles.title]}>{release.title}</Text>
          <Pressable onPress={() => router.push(`/artist/${artist.id}`)} accessibilityRole="link" style={styles.artist}>
            <Art seed={artist.id} colors={artist.colors} size={24} round />
            <Text style={type.bodyBold}>{artist.name}</Text>
          </Pressable>
          <Text style={[type.small, styles.meta]}>
            {release.type} · {release.year}{release.exclusive ? ' · Only on Deegee' : ''}
          </Text>
        </View>

        <View style={styles.actions}>
          <IconButton name={saved ? 'checkmark-circle' : 'add-circle-outline'} active={saved} size={28}
            label={saved ? 'Remove from your music' : 'Save to your music'} onPress={toggleSaved} />
          <IconButton name="share-outline" size={24} label="Share" onPress={share} />
          {ownsAll ? <Ionicons name="arrow-down-circle" size={28} color={colors.accent} accessibilityLabel="You own this" /> : null}
          <View style={styles.flex} />
          {!ownsAll ? (
            <Button small variant="outline" label={`Buy ${formatUGX(release.priceUGX)}`}
              onPress={() => router.push({ pathname: '/buy', params: { kind: 'release', id: release.id } })} />
          ) : null}
          <PlayButton playing={currentRelease === release.id && isPlaying} onPress={play} />
        </View>

        {!ownsAll ? (
          <Text style={[type.small, styles.note]}>
            {ownedCount ? `You own ${ownedCount} of ${list.length}. ` : `Previews play ${PREVIEW_SEC} seconds. `}
            {list.length > 1 && saving > 0 ? `The full ${release.type.toLowerCase()} saves ${formatUGX(saving)}.` : ''}
          </Text>
        ) : null}

        {list.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} showArt={false} onPlay={() => playQueue(ids, i, owns)} />
        ))}

        <Text style={[type.small, styles.footer]}>{list.length} song{list.length === 1 ? '' : 's'}, {mins} min</Text>
        <Text style={[type.small, styles.copyright]}>℗ {release.year} {artist.name}. Released on Deegee.</Text>

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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: layout.detailScreenBottom },
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  cover: { alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  title: { marginTop: space.xl },
  artist: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  meta: { marginTop: space.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, marginBottom: space.md },
  flex: { flex: 1 },
  note: { paddingHorizontal: space.lg, marginBottom: space.sm },
  footer: { paddingHorizontal: space.lg, marginTop: space.lg },
  copyright: { paddingHorizontal: space.lg, fontFamily: font.regular, color: colors.textFaint },
});
