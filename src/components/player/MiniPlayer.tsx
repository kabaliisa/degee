import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getArtist, getRelease } from '../../api';
import { colors, radius, space, type, withAlpha } from '../../lib/theme';
import { useLikes } from '../../store/likes';
import { usePlayer } from '../../store/player';
import { Art } from '../Art';
import { IconButton } from '../ui';

/** Bar that floats above the tab bar (and at the foot of detail screens). Hidden when nothing is queued. */
export function MiniPlayer({ floating }: { floating?: boolean }) {
  const track = usePlayer((s) => s.current());
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isPreview = usePlayer((s) => s.isPreview);
  const positionSec = usePlayer((s) => s.positionSec);
  const toggle = usePlayer((s) => s.toggle);
  const limit = usePlayer((s) => s.limitSec());
  const liked = useLikes((s) => (track ? s.liked.includes(track.id) : false));
  const toggleLike = useLikes((s) => s.toggleLike);
  const release = track ? getRelease(track.releaseId) : undefined;
  if (!track || !release) return null;
  const progress = limit ? Math.min(1, positionSec / limit) : 0;

  return (
    <Pressable onPress={() => router.push('/player')} accessibilityLabel={`Now playing ${track.title}. Open player`} style={[styles.bar, floating && styles.floating]}>
      <View style={styles.row}>
        <Art seed={release.id} colors={release.colors} size={40} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[type.body, styles.title]}>{track.title}</Text>
          <Text numberOfLines={1} style={type.small}>{isPreview ? 'Preview · ' : ''}{getArtist(track.artistId)?.name}</Text>
        </View>
        <IconButton name={liked ? 'heart' : 'heart-outline'} active={liked} color={colors.text} onPress={() => toggleLike(track.id)} label={liked ? 'Remove from liked songs' : 'Like'} />
        <IconButton name={isPlaying ? 'pause' : 'play'} color={colors.text} size={26} onPress={toggle} label={isPlaying ? 'Pause' : 'Play'} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { marginHorizontal: space.sm, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceRaised, paddingBottom: 2 },
  floating: { position: 'absolute', left: 0, right: 0, bottom: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, padding: space.sm },
  flex: { flex: 1 },
  title: { fontSize: 14 },
  track: { height: 2, marginHorizontal: space.sm, backgroundColor: withAlpha(colors.text, 0.18), borderRadius: 1 },
  fill: { height: 2, backgroundColor: colors.text, borderRadius: 1 },
});
