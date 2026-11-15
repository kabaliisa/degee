import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease } from '../../api';
import { colors, font, radius, space, withAlpha } from '../../lib/theme';
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
      {/* Frosted rather than solid: the artwork and the page carry on underneath, which is what stops a
          bar pinned over the content from reading as a second floor.
          The bar itself must stay transparent. A blur samples what is painted behind it, so a solid
          colour on the bar is all the blur would ever see; density comes from the tint laid on top. */}
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.tint} pointerEvents="none" />
      {/* Light catching the top and bottom edges. A pane of glass is read by its edges, not its face. */}
      <LinearGradient pointerEvents="none" colors={[withAlpha(GLASS_WHITE, 0), withAlpha(GLASS_WHITE, 0.95), withAlpha(GLASS_WHITE, 0)]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.edgeTop} />
      <LinearGradient pointerEvents="none" colors={[withAlpha(colors.accent, 0), withAlpha(colors.accent, 0.85), withAlpha(colors.accent, 0)]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.edgeBottom} />
      <View style={styles.row}>
        <Art seed={release.id} size={56} style={styles.art} />
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <View style={styles.words}>
              <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
              {/* Tighter tracking while previewing, so the marker never squeezes out whose song it is. */}
              <Text numberOfLines={1} style={[styles.artist, isPreview && styles.artistTight]}>
                {isPreview ? 'PREVIEW · ' : ''}{getArtist(track.artistId)?.name.toUpperCase()}
              </Text>
            </View>
            <Pressable onPress={() => prev(owns)} accessibilityRole="button" accessibilityLabel="Previous song" hitSlop={10} style={styles.skip}>
              <Ionicons name="play-skip-back" size={22} color={GLASS_WHITE} />
            </Pressable>
            <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'} hitSlop={8} style={styles.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={21} color={GLASS_WHITE} style={isPlaying ? undefined : styles.playNudge} />
            </Pressable>
            <Pressable onPress={() => next(owns)} accessibilityRole="button" accessibilityLabel="Next song" hitSlop={10} style={styles.skip}>
              <Ionicons name="play-skip-forward" size={22} color={GLASS_WHITE} />
            </Pressable>
          </View>
          <View style={styles.track}>
            <View testID="player-progress" style={[styles.fill, { width: `${progress * 100}%` }]} />
            <View style={[styles.knob, { left: `${progress * 100}%` }]} />
          </View>
        </View>
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

/** The glass reads against pure white, not the warm white the rest of the app is set in. */
const GLASS_WHITE = '#FFFFFF';

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: space.md, borderRadius: 26, overflow: 'hidden',
    backgroundColor: 'transparent', // see above: a colour here would be the only thing the blur sees
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(GLASS_WHITE, 0.22),
  },
  // Laid over the blur, not under it: deep enough to read white type against, sheer enough that the
  // artwork behind still comes through as colour.
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: withAlpha(colors.surfaceRaised, 0.42) },
  edgeTop: { position: 'absolute', top: 0, left: 20, right: 20, height: 2 },
  edgeBottom: { position: 'absolute', bottom: 0, left: 56, right: 56, height: 2 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.sm + 2, paddingVertical: space.sm },
  art: { borderRadius: radius.lg },
  flex: { flex: 1, minWidth: 0, gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  words: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.semibold, fontSize: 17, lineHeight: 23, color: GLASS_WHITE },
  artist: { fontFamily: font.medium, fontSize: 11, lineHeight: 16, letterSpacing: 2.2, color: withAlpha(GLASS_WHITE, 0.72) },
  artistTight: { letterSpacing: 0.6 },
  skip: { width: 26, height: 34, alignItems: 'center', justifyContent: 'center' },
  // A disc of the same glass with a gold rim and a gold glow around it, rather than a solid button:
  // solid gold turns the one control you reach for without looking into a sticker on the pane.
  playBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.2),
    shadowColor: colors.accent, shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  playNudge: { marginLeft: 2 },
  track: { height: 5, borderRadius: 3, backgroundColor: withAlpha(GLASS_WHITE, 0.45) },
  fill: { height: 5, backgroundColor: colors.accent, borderRadius: 3 },
  knob: { position: 'absolute', top: -5, width: 15, height: 15, borderRadius: 7.5, marginLeft: -7.5, backgroundColor: GLASS_WHITE },
});
