import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getArtist, getRelease } from '../data/catalog';
import { colors, radius, space, type } from '../lib/theme';
import { usePlayer } from '../store/player';
import { useWallet } from '../store/wallet';
import { Cover } from './ui';

export function MiniPlayer() {
  const track = usePlayer((s) => s.current());
  const { isPlaying, isPreview, positionSec, toggle, next } = usePlayer();
  const limit = usePlayer((s) => s.limitSec());
  const owns = useWallet((s) => s.owns);
  if (!track) return null;
  const release = getRelease(track.releaseId)!;
  const progress = limit ? positionSec / limit : 0;

  return (
    <Pressable onPress={() => router.push('/player')} style={styles.wrap} accessibilityLabel="Open player">
      <View style={styles.row}>
        <Cover title={release.title} colors={release.colors} size={42} style={{ borderRadius: radius.sm }} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[type.body, { fontWeight: '700' }]}>{track.title}</Text>
          <Text numberOfLines={1} style={type.small}>{getArtist(track.artistId)?.name}{isPreview ? ' · 30s preview' : ''}</Text>
        </View>
        <Pressable onPress={toggle} hitSlop={10} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => next(owns)} hitSlop={10} accessibilityLabel="Next">
          <Ionicons name="play-skip-forward" size={22} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: space.sm, marginBottom: space.sm, backgroundColor: colors.surfaceRaised, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingRight: space.lg },
  track: { height: 2, backgroundColor: colors.border },
  fill: { height: 2, backgroundColor: colors.accent },
});
