import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { formatDuration, getArtist, type Release, type Track } from '../data/catalog';
import { formatUGX } from '../lib/money';
import { colors, radius, space, type } from '../lib/theme';
import { useWallet } from '../store/wallet';

/** Generated cover art: a two-tone tile with the title's initials (no image assets needed). */
export function Cover({ title, colors: c, size = 140, style }: { title: string; colors: [string, string]; size?: number; style?: ViewStyle }) {
  const initials = title.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <View style={[{ width: size, height: size, borderRadius: radius.md, backgroundColor: c[1], overflow: 'hidden' }, style]}>
      <View style={{ position: 'absolute', width: size * 1.1, height: size * 1.1, borderRadius: size, backgroundColor: c[0], top: -size * 0.45, left: -size * 0.3, opacity: 0.9 }} />
      <View style={{ position: 'absolute', width: size * 0.5, height: size * 0.5, borderRadius: size, borderWidth: size * 0.04, borderColor: c[1], bottom: size * 0.12, right: size * 0.12, opacity: 0.6 }} />
      <Text style={{ position: 'absolute', left: size * 0.1, bottom: size * 0.08, color: '#fff', fontWeight: '900', fontSize: size * 0.22 }}>{initials}</Text>
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap; loading?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const primary = variant === 'primary';
  const fg = primary ? colors.accentInk : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary && { backgroundColor: colors.accent },
        variant === 'secondary' && { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
      <Text style={type.heading}>{children}</Text>
      {action}
    </View>
  );
}

export function ReleaseCard({ release, size = 140 }: { release: Release; size?: number }) {
  const artist = getArtist(release.artistId);
  return (
    <Pressable onPress={() => router.push(`/release/${release.id}`)} style={{ width: size }} accessibilityLabel={`${release.title} by ${artist?.name}`}>
      <Cover title={release.title} colors={release.colors} size={size} />
      <Text numberOfLines={1} style={[type.body, { fontWeight: '700', marginTop: space.sm }]}>{release.title}</Text>
      <Text numberOfLines={1} style={type.small}>{artist?.name} · {release.type}</Text>
    </Pressable>
  );
}

export function TrackRow({ track, index, onPlay, onBuy, isCurrent }: {
  track: Track; index?: number; onPlay: () => void; onBuy?: () => void; isCurrent?: boolean;
}) {
  const owned = useWallet((s) => s.ownedTracks.includes(track.id));
  const artist = getArtist(track.artistId);
  return (
    <Pressable onPress={onPlay} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      {index !== undefined ? (
        <Text style={[styles.index, isCurrent && { color: colors.accent }]}>{index + 1}</Text>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[type.body, { fontWeight: '600' }, isCurrent && { color: colors.accent }]}>{track.title}</Text>
        <Text numberOfLines={1} style={type.small}>{artist?.name} · {formatDuration(track.durationSec)}{owned ? '' : ' · preview'}</Text>
      </View>
      {owned ? (
        <View style={styles.ownedPill}><Ionicons name="checkmark" size={14} color={colors.success} /><Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>Owned</Text></View>
      ) : onBuy ? (
        <Pressable onPress={onBuy} hitSlop={8} style={styles.pricePill} accessibilityLabel={`Buy ${track.title} for ${formatUGX(track.priceUGX)}`}>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>{formatUGX(track.priceUGX)}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: space.xxl, gap: space.sm }}>
      <Ionicons name={icon} size={40} color={colors.textFaint} />
      <Text style={type.heading}>{title}</Text>
      <Text style={[type.small, { textAlign: 'center' }]}>{body}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 14, paddingHorizontal: space.xl, borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.sm },
  index: { width: 22, textAlign: 'center', color: colors.textFaint, fontWeight: '700' },
  pricePill: { paddingVertical: 6, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.accent },
  ownedPill: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
