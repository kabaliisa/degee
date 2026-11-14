import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { getArtist, getRelease, type Track } from '../../api';
import { formatUGX } from '../../lib/money';
import { colors, font, radius, space, type } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';
import { Art } from '../Art';
import { tap } from './haptics';

/** Three bars that bounce while a track plays; still when paused or when reduced motion is on. */
export function Equalizer({ playing, color = colors.accent }: { playing: boolean; color?: string }) {
  const [bars] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.4)));
  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce || !playing) return;
      loops = bars.map((v, i) => Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 260 + i * 90, useNativeDriver: false }),
        Animated.timing(v, { toValue: 0.25, duration: 260 + i * 70, useNativeDriver: false }),
      ])));
      loops.forEach((l) => l.start());
    });
    return () => { cancelled = true; loops.forEach((l) => l.stop()); };
  }, [playing, bars]);
  return (
    <View style={styles.eq}>
      {bars.map((v, i) => (
        <Animated.View key={i} style={[styles.eqBar, { backgroundColor: color, height: v.interpolate({ inputRange: [0, 1], outputRange: [2, 14] }) }]} />
      ))}
    </View>
  );
}

export function TrackRow({ track, onPlay, showArt = true, index }: { track: Track; onPlay: () => void; showArt?: boolean; index?: number }) {
  const owned = useWallet((s) => s.ownedTracks.includes(track.id));
  const isCurrent = usePlayer((s) => s.queue[s.index] === track.id);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const artist = getArtist(track.artistId);
  const release = getRelease(track.releaseId);
  const buy = () => { tap(); router.push({ pathname: '/buy', params: { kind: 'track', id: track.id } }); };

  return (
    <Pressable onPress={onPlay} accessibilityLabel={`${track.title} by ${artist?.name}${owned ? ', owned' : ', preview'}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {showArt && release ? <Art seed={release.id} colors={release.colors} size={48} /> : (
        <View style={styles.index}>
          {isCurrent ? <Equalizer playing={isPlaying} /> : <Text style={[type.small, styles.indexText]}>{(index ?? 0) + 1}</Text>}
        </View>
      )}
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[type.body, isCurrent && styles.current]}>{track.title}</Text>
        <View style={styles.meta}>
          {owned ? <Ionicons name="arrow-down-circle" size={13} color={colors.accent} accessibilityLabel="Owned" /> : null}
          {showArt && isCurrent ? <Equalizer playing={isPlaying} /> : null}
          <Text numberOfLines={1} style={type.small}>{artist?.name}</Text>
        </View>
      </View>
      {owned ? null : (
        <Pressable onPress={buy} hitSlop={8} accessibilityLabel={`Buy ${track.title} for ${formatUGX(track.priceUGX)}`}
          style={({ pressed }) => [styles.price, pressed && styles.pricePressed]}>
          <Text style={styles.priceText}>{formatUGX(track.priceUGX)}</Text>
        </Pressable>
      )}
      <Ionicons name="ellipsis-horizontal" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eq: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14, width: 14 },
  eqBar: { width: 3, borderRadius: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.lg },
  rowPressed: { backgroundColor: colors.surface },
  index: { width: 20, alignItems: 'center' },
  indexText: { fontFamily: font.semibold },
  flex: { flex: 1 },
  current: { color: colors.accentText },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  price: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  pricePressed: { backgroundColor: colors.surfacePress },
  priceText: { color: colors.text, fontFamily: font.bold, fontSize: 12 },
});
