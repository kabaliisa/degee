import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease } from '../../api';
import { colors, font, radius, space, type, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';
import { Art } from '../Art';

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
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const limit = usePlayer((s) => s.limitSec());
  const owns = useWallet((s) => s.owns);
  const insets = useSafeAreaInsets();
  const release = track ? getRelease(track.releaseId) : undefined;
  if (!track || !release) return null;
  const progress = limit ? Math.min(1, positionSec / limit) : 0;

  const bar = (
    <Pressable onPress={() => router.push('/player')} accessibilityLabel={`Now playing ${track.title}. Open player`} style={styles.bar}>
      <View style={styles.row}>
        <Art seed={release.id} size={46} style={styles.art} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
          <Text numberOfLines={1} style={type.caps}>
            {isPreview ? 'PREVIEW · ' : ''}{getArtist(track.artistId)?.name.toUpperCase()}
          </Text>
        </View>
        <Pressable onPress={() => prev(owns)} accessibilityRole="button" accessibilityLabel="Previous song" hitSlop={8} style={styles.skip}>
          <Ionicons name="play-skip-back" size={18} color={colors.text} />
        </Pressable>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'} hitSlop={6} style={styles.playBtn}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={colors.accent} style={isPlaying ? undefined : styles.playNudge} />
        </Pressable>
        <Pressable onPress={() => next(owns)} accessibilityRole="button" accessibilityLabel="Next song" hitSlop={8} style={styles.skip}>
          <Ionicons name="play-skip-forward" size={18} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.track}>
        <View testID="player-progress" style={[styles.fill, { width: `${progress * 100}%` }]} />
        <View style={[styles.knob, { left: `${progress * 100}%` }]} />
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
  bar: { marginHorizontal: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, paddingBottom: space.md, paddingTop: 3 },
  art: { borderRadius: radius.sm },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm + 2, paddingVertical: space.sm },
  flex: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: colors.text },
  skip: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  // The gold ring is how the mockup marks the one control you reach for without looking.
  playBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.12), alignItems: 'center', justifyContent: 'center' },
  playNudge: { marginLeft: 2 },
  track: { height: 3, marginHorizontal: space.lg, backgroundColor: withAlpha(colors.text, 0.14), borderRadius: 2 },
  fill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
  knob: { position: 'absolute', top: -3.5, width: 10, height: 10, borderRadius: 5, marginLeft: -5, backgroundColor: colors.text },
});
