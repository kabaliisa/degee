import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { getArtist, getRelease, type Artist, type Release, type Track } from '../data/catalog';
import { formatUGX } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { usePlayer } from '../store/player';
import { useWallet } from '../store/wallet';
import { Art } from './Art';

export const tap = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

type IconName = keyof typeof Ionicons.glyphMap;

/** The signature round play button. */
export function PlayButton({ playing, onPress, size = 56, label }: { playing?: boolean; onPress: () => void; size?: number; label?: string }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label ?? (playing ? 'Pause' : 'Play')}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      <Ionicons name={playing ? 'pause' : 'play'} size={size * 0.46} color={colors.accentInk} style={{ marginLeft: playing ? 0 : size * 0.05 }} />
    </Pressable>
  );
}

export function IconButton({ name, onPress, size = 24, color = colors.textMuted, label, active }: {
  name: IconName; onPress: () => void; size?: number; color?: string; label: string; active?: boolean;
}) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 2 })}>
      <Ionicons name={name} size={size} color={active ? colors.accent : color} />
    </Pressable>
  );
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style, small }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: IconName; loading?: boolean; disabled?: boolean; style?: ViewStyle; small?: boolean;
}) {
  const fg = variant === 'primary' ? colors.accentInk : colors.text;
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button, small && { paddingVertical: 8, paddingHorizontal: 16 },
        variant === 'primary' && { backgroundColor: colors.accent },
        variant === 'secondary' && { backgroundColor: colors.surfaceRaised },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.textFaint },
        { opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 15 : 18} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: font.bold, fontSize: small ? 13 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityState={{ selected: active }}
      style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: active ? colors.accent : colors.surfaceRaised }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: active ? colors.accentInk : colors.text }}>{label}</Text>
    </Pressable>
  );
}

/** A titled horizontal row, the backbone of every browse screen. */
export function Shelf({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: space.xl }}>
      <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
        {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
        <Text style={type.heading}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.lg }}>
        {children}
      </ScrollView>
    </View>
  );
}

export function ReleaseCard({ release, size = 148, subtitle }: { release: Release; size?: number; subtitle?: string }) {
  const artist = getArtist(release.artistId);
  return (
    <Pressable onPress={() => router.push(`/release/${release.id}`)} style={({ pressed }) => ({ width: size, opacity: pressed ? 0.75 : 1 })}
      accessibilityLabel={`${release.title} by ${artist?.name}`}>
      <Art seed={release.id} colors={release.colors} size={size} />
      <Text numberOfLines={1} style={[type.bodyBold, { marginTop: space.sm }]}>{release.title}</Text>
      <Text numberOfLines={2} style={type.small}>{subtitle ?? `${release.type} by ${artist?.name}`}</Text>
    </Pressable>
  );
}

export function ArtistCard({ artist, size = 132 }: { artist: Artist; size?: number }) {
  return (
    <Pressable onPress={() => router.push(`/artist/${artist.id}`)} style={({ pressed }) => ({ width: size, opacity: pressed ? 0.75 : 1 })}>
      <Art seed={artist.id} colors={artist.colors} size={size} round />
      <Text numberOfLines={1} style={[type.bodyBold, { marginTop: space.sm, textAlign: 'center' }]}>{artist.name}</Text>
      <Text numberOfLines={1} style={[type.small, { textAlign: 'center' }]}>Artist</Text>
    </Pressable>
  );
}

/** Three bars that bounce while a track plays; still when paused or when reduced motion is on. */
export function Equalizer({ playing, color = colors.accent }: { playing: boolean; color?: string }) {
  const bars = useRef([0, 1, 2].map(() => new Animated.Value(0.4))).current;
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
  }, [playing]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14, width: 14 }}>
      {bars.map((v, i) => (
        <Animated.View key={i} style={{ width: 3, borderRadius: 1, backgroundColor: color, height: v.interpolate({ inputRange: [0, 1], outputRange: [2, 14] }) }} />
      ))}
    </View>
  );
}

export function TrackRow({ track, onPlay, showArt = true, index }: { track: Track; onPlay: () => void; showArt?: boolean; index?: number }) {
  const owned = useWallet((s) => s.ownedTracks.includes(track.id));
  const isCurrent = usePlayer((s) => s.queue[s.index] === track.id);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const artist = getArtist(track.artistId);
  const release = getRelease(track.releaseId)!;
  return (
    <Pressable onPress={onPlay} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
      accessibilityLabel={`${track.title} by ${artist?.name}${owned ? ', owned' : ', preview'}`}>
      {showArt ? <Art seed={release.id} colors={release.colors} size={48} /> : (
        <View style={{ width: 20, alignItems: 'center' }}>
          {isCurrent ? <Equalizer playing={isPlaying} /> : <Text style={[type.small, { fontFamily: font.semibold }]}>{(index ?? 0) + 1}</Text>}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[type.body, isCurrent && { color: colors.accent }]}>{track.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          {owned ? <Ionicons name="arrow-down-circle" size={13} color={colors.accent} accessibilityLabel="Owned" /> : null}
          {showArt && isCurrent ? <Equalizer playing={isPlaying} /> : null}
          <Text numberOfLines={1} style={type.small}>{artist?.name}</Text>
        </View>
      </View>
      {owned ? null : (
        <Pressable onPress={() => { tap(); router.push({ pathname: '/buy', params: { kind: 'track', id: track.id } }); }} hitSlop={8}
          accessibilityLabel={`Buy ${track.title} for ${formatUGX(track.priceUGX)}`}
          style={({ pressed }) => [styles.pricePill, pressed && { backgroundColor: colors.surfacePress }]}>
          <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 12 }}>{formatUGX(track.priceUGX)}</Text>
        </Pressable>
      )}
      <Ionicons name="ellipsis-horizontal" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: space.xxl, gap: space.sm }}>
      <Ionicons name={icon} size={44} color={colors.textFaint} />
      <Text style={[type.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.small, { textAlign: 'center', fontSize: 14 }]}>{body}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 14, paddingHorizontal: space.xl, borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.lg },
  pricePill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
});
