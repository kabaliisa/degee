import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease, releasesByArtist, tracksForRelease } from '../../api';
import { Art } from '../../components/Art';
import { MiniPlayer } from '../../components/player/MiniPlayer';
import { Button, EmptyState, IconButton, PlayButton, ReleaseCard, Shelf, TrackRow } from '../../components/ui';
import { PREVIEW_SEC, totalDuration } from '../../lib/format';
import { formatUGX } from '../../lib/money';
import { colors, font, layout, onDark, radius, space, type } from '../../lib/theme';
import { useLikes } from '../../store/likes';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

export default function ReleaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
        <View style={styles.stage}>
          <View style={[styles.header, { paddingTop: insets.top + 56 }]}>
            <View style={styles.cover}>
              <Art seed={release.id} colors={release.colors} size={Math.min(width - space.lg * 2, 340)} style={styles.coverArt} />
            </View>
            <Text style={[type.display, styles.title]}>{release.title}</Text>
            <Pressable onPress={() => router.push(`/artist/${artist.id}`)} accessibilityRole="link" style={styles.artist}>
              <Text style={[type.bodyBold, styles.light]}>{artist.name}</Text>
            </Pressable>
            <Text style={[type.small, styles.meta]}>
              {release.type} · {list.length} song{list.length === 1 ? '' : 's'} · {mins} min{release.exclusive ? ' · Only on Deegee' : ''}
            </Text>
          </View>

          <View style={styles.buttons}>
            {ownsAll ? (
              <View style={styles.ownedPill}>
                <Ionicons name="checkmark-circle" size={18} color={colors.limeInk} />
                <Text style={styles.ownedText}>Owned · plays in full</Text>
              </View>
            ) : (
              <Button icon="bag-handle" label={`Buy ${release.type === 'EP' ? 'EP' : release.type.toLowerCase()} · ${formatUGX(release.priceUGX)}`}
                onPress={() => router.push({ pathname: '/buy', params: { kind: 'release', id: release.id } })} />
            )}
            <Pressable onPress={play} accessibilityRole="button" style={({ pressed }) => [styles.listen, pressed && styles.pressed]}>
              <Ionicons name={currentRelease === release.id && isPlaying ? 'pause' : 'play'} size={18} color={colors.text} />
              <Text style={styles.listenText}>{currentRelease === release.id && isPlaying ? 'Pause' : ownsAll ? 'Play' : `Listen to previews`}</Text>
            </Pressable>
            <View style={styles.iconRow}>
              <IconButton name={saved ? 'heart' : 'heart-outline'} active={saved} size={26} color={onDark.text}
                label={saved ? 'Remove from your music' : 'Save to your music'} onPress={toggleSaved} />
              <IconButton name="share-outline" size={24} color={onDark.text} label="Share" onPress={share} />
            </View>
          </View>
        </View>

        {!ownsAll ? (
          <Text style={[type.small, styles.note, styles.noteTop]}>
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
  stage: { backgroundColor: onDark.bg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden', paddingBottom: space.lg },
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  cover: { alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  coverArt: { borderRadius: radius.lg },
  title: { marginTop: space.xl, color: onDark.text },
  light: { color: onDark.text },
  artist: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  meta: { marginTop: space.xs, color: onDark.textMuted },
  buttons: { paddingHorizontal: space.lg, gap: space.sm },
  listen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 13, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised },
  listenText: { fontFamily: font.display, fontSize: 15, color: colors.text },
  pressed: { opacity: 0.85 },
  iconRow: { flexDirection: 'row', justifyContent: 'center', gap: space.xl, marginTop: space.xs },
  ownedPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.lime },
  ownedText: { fontFamily: font.display, fontSize: 15, color: colors.limeInk },
  noteTop: { marginTop: space.lg },
  flex: { flex: 1 },
  note: { paddingHorizontal: space.lg, marginBottom: space.sm },
  footer: { paddingHorizontal: space.lg, marginTop: space.lg },
  copyright: { paddingHorizontal: space.lg, fontFamily: font.regular, color: colors.textFaint },
});
