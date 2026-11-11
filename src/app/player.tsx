import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease } from '../api';
import { Art } from '../components/Art';
import { ArtworkBackdrop } from '../components/ArtworkBackdrop';
import { OwnershipBanner } from '../components/player/OwnershipBanner';
import { SeekBar } from '../components/player/SeekBar';
import { Button, EmptyState, IconButton, PlayButton } from '../components/ui';
import { colors, space, type } from '../lib/theme';
import { useLikes } from '../store/likes';
import { usePlayer } from '../store/player';
import { useWallet } from '../store/wallet';

export default function Player() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const track = usePlayer((s) => s.current());
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isPreview = usePlayer((s) => s.isPreview);
  const positionSec = usePlayer((s) => s.positionSec);
  const limit = usePlayer((s) => s.limitSec());
  const { toggle, next, prev, seek } = usePlayer.getState();
  const owns = useWallet((s) => s.owns);
  const liked = useLikes((s) => (track ? s.liked.includes(track.id) : false));
  const toggleLike = useLikes((s) => s.toggleLike);

  const release = track ? getRelease(track.releaseId) : undefined;
  const artist = track ? getArtist(track.artistId) : undefined;
  if (!track || !release || !artist) {
    return <EmptyState icon="musical-notes-outline" title="Nothing playing" body="Pick a song to start listening."
      action={<Button label="Close" variant="secondary" onPress={() => router.back()} />} />;
  }

  const artSize = Math.min(width - space.xl * 2, height * 0.42, 420);
  const openArtist = () => { router.back(); router.push(`/artist/${artist.id}`); };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg }]}>
      <ArtworkBackdrop key={release.id} seed={release.id} colors={release.colors} fadeAt={0.85} />
      <View style={styles.topBar}>
        <IconButton name="chevron-down" color={colors.text} size={28} label="Close player" onPress={() => router.back()} />
        <View style={styles.source}>
          <Text style={[type.tiny, styles.sourceLabel]}>Playing from {release.type.toLowerCase()}</Text>
          <Text numberOfLines={1} style={[type.bodyBold, styles.sourceTitle]}>{release.title}</Text>
        </View>
        <IconButton name="share-outline" color={colors.text} label="Share" onPress={() => Share.share({ message: `${track.title} by ${artist.name} on Deegee` })} />
      </View>

      <View style={styles.artArea}>
        <View style={styles.artShadow}>
          <Art seed={release.id} colors={release.colors} size={artSize} />
        </View>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={type.title}>{track.title}</Text>
          <Pressable onPress={openArtist} accessibilityRole="link">
            <Text style={[type.body, styles.artist]}>{artist.name}</Text>
          </Pressable>
        </View>
        <IconButton name={liked ? 'heart' : 'heart-outline'} active={liked} size={28} color={colors.text}
          label={liked ? 'Remove from liked songs' : 'Like'} onPress={() => toggleLike(track.id)} />
      </View>

      <View style={styles.seek}>
        <SeekBar positionSec={positionSec} limitSec={limit} isPreview={isPreview} onSeek={seek} />
      </View>

      <View style={styles.controls}>
        {/* Shuffle and repeat are placeholders until queue modes are built. */}
        <IconButton name="shuffle" color={colors.textMuted} label="Shuffle" onPress={() => {}} />
        <IconButton name="play-skip-back" color={colors.text} size={34} label="Previous" onPress={() => prev(owns)} />
        <PlayButton size={68} playing={isPlaying} onPress={toggle} />
        <IconButton name="play-skip-forward" color={colors.text} size={34} label="Next" onPress={() => next(owns)} />
        <IconButton name="repeat" color={colors.textMuted} label="Repeat" onPress={() => {}} />
      </View>

      <OwnershipBanner track={track} artist={artist} isPreview={isPreview} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.xl, backgroundColor: colors.bg, overflow: 'hidden' },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  source: { flex: 1, alignItems: 'center' },
  sourceLabel: { color: colors.text, opacity: 0.75 },
  sourceTitle: { fontSize: 13 },
  artArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  artShadow: { alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 30, shadowOffset: { width: 0, height: 16 } },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  artist: { color: colors.textMuted },
  seek: { marginTop: space.lg },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
});
