import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease } from '../../api';
import { colors, onDark, radius, space, type, withAlpha } from '../../lib/theme';
import { useLikes } from '../../store/likes';
import { usePlayer } from '../../store/player';
import { Art } from '../Art';
import { IconButton } from '../ui';

/**
 * Bar above the tab bar, or docked at the foot of detail screens (which have no tab bar): there the page
 * fades to black behind it, so it doesn't hang over the content. Hidden when nothing is queued.
 */
export function MiniPlayer({ floating }: { floating?: boolean }) {
  const track = usePlayer((s) => s.current());
  const isPlaying = usePlayer((s) => s.isPlaying);
  const isPreview = usePlayer((s) => s.isPreview);
  const positionSec = usePlayer((s) => s.positionSec);
  const toggle = usePlayer((s) => s.toggle);
  const limit = usePlayer((s) => s.limitSec());
  const liked = useLikes((s) => (track ? s.liked.includes(track.id) : false));
  const toggleLike = useLikes((s) => s.toggleLike);
  const insets = useSafeAreaInsets();
  const release = track ? getRelease(track.releaseId) : undefined;
  if (!track || !release) return null;
  const progress = limit ? Math.min(1, positionSec / limit) : 0;

  const bar = (
    <Pressable onPress={() => router.push('/player')} accessibilityLabel={`Now playing ${track.title}. Open player`} style={styles.bar}>
      <View style={styles.row}>
        <Art seed={release.id} colors={release.colors} size={44} style={styles.art} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[type.bodyBold, styles.title]}>{track.title}</Text>
          <Text numberOfLines={1} style={[type.small, styles.sub]}>{isPreview ? 'Preview · ' : ''}{getArtist(track.artistId)?.name}</Text>
        </View>
        <IconButton name={liked ? 'heart' : 'heart-outline'} active={liked} color={onDark.text} onPress={() => toggleLike(track.id)} label={liked ? 'Remove from liked songs' : 'Like'} />
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'} hitSlop={6} style={styles.playBtn}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={colors.ink} style={isPlaying ? undefined : styles.playNudge} />
        </Pressable>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
  if (!floating) return bar;
  return (
    <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: insets.bottom + space.sm }]}>
      <LinearGradient pointerEvents="none" colors={[withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.92), colors.bg]} locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill} />
      {bar}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { marginHorizontal: space.sm, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.ink, paddingBottom: 3 },
  art: { borderRadius: radius.sm },
  sub: { color: onDark.textMuted },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: onDark.text, alignItems: 'center', justifyContent: 'center', marginLeft: space.xs },
  playNudge: { marginLeft: 2 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, padding: space.sm },
  flex: { flex: 1 },
  title: { fontSize: 14, color: onDark.text },
  track: { height: 3, marginHorizontal: space.md, backgroundColor: withAlpha(onDark.text, 0.18), borderRadius: 2 },
  fill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
});
