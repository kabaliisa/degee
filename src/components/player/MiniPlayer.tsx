import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease } from '../../api';
import { colors, font, radius, space, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';
import { Art } from '../Art';
import { GLASS_IS_BLURRED, GlassSurface } from './GlassSurface';

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
    // The shadow lives on the outside and the clipping on the inside: a view cannot both hide its
    // overflow and cast a shadow, because the shadow is overflow.
    <Pressable onPress={() => router.push('/player')} accessibilityLabel={`Now playing ${track.title}. Open player`} style={styles.lift}>
      <View style={styles.bar}>
        {/* Frosted rather than solid: the artwork and the page carry on underneath, which is what stops
            a bar pinned over the content from reading as a second floor. The pane itself holds no
            colour — a blur samples what is painted behind it, so a colour of its own is all it would
            ever see. Density comes from the tint laid on top of it. */}
        <GlassSurface style={styles.pane} />
        <View style={[styles.tint, !GLASS_IS_BLURRED && styles.tintFallback]} pointerEvents="none" />
        {/* The sheen a pane picks up from a light source off to one side. Steep and short: past the
            first third it is gone, so it reads as a reflection rather than as a gradient. */}
        <LinearGradient pointerEvents="none" style={styles.sheen}
          colors={[withAlpha(GLASS_WHITE, 0.12), withAlpha(GLASS_WHITE, 0.035), withAlpha(GLASS_WHITE, 0)]}
          locations={[0, 0.35, 0.7]} start={{ x: 0.3, y: 0 }} end={{ x: 0.64, y: 0.95 }} />
        {/* The lit top edge. Glass is read by its edges far more than by its face. */}
        <View style={styles.topEdge} pointerEvents="none" />
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
/** Warm charcoal: a brown dark enough to read white type against, warm enough to belong to this app. */
const GLASS_TINT = '#413029';

const fill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

const styles = StyleSheet.create({
  lift: {
    marginHorizontal: space.md,
    // Floated rather than resting: the gap under it is what says this bar is over the page, not part
    // of it, and the blur only reads as glass once there is a shadow saying there is a pane at all.
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  bar: {
    borderRadius: 22, overflow: 'hidden',
    backgroundColor: 'transparent', // see above: a colour here would be the only thing the blur sees
    borderWidth: 1, borderColor: withAlpha(GLASS_WHITE, 0.18),
  },
  pane: fill,
  // Laid over the blur, not under it: deep enough to read white type against, sheer enough that the
  // artwork behind still comes through as colour.
  tint: { ...fill, backgroundColor: withAlpha(GLASS_TINT, 0.55) },
  // With no blur to soften what is behind it, the tint has to carry the legibility on its own.
  tintFallback: { backgroundColor: withAlpha(GLASS_TINT, 0.92) },
  sheen: fill,
  topEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: withAlpha(GLASS_WHITE, 0.12) },
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
  // A disc of the same glass, tinted amber and ringed in gold, rather than a solid button: solid gold
  // turns the one control you reach for without looking into a sticker stuck on the pane. No glow —
  // a lit halo reads as plastic, and the ring alone is enough to find.
  playBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: withAlpha(colors.accent, 0.75), backgroundColor: withAlpha(colors.accent, 0.22),
  },
  playNudge: { marginLeft: 2 },
  track: { height: 5, borderRadius: 3, backgroundColor: withAlpha(GLASS_WHITE, 0.45) },
  fill: { height: 5, backgroundColor: colors.accent, borderRadius: 3 },
  knob: { position: 'absolute', top: -5, width: 15, height: 15, borderRadius: 7.5, marginLeft: -7.5, backgroundColor: GLASS_WHITE },
});
