import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { getArtist, getRelease } from '../data/catalog';
import { colors, radius, shade, space, type } from '../lib/theme';
import { useLikes } from '../store/likes';
import { usePlayer } from '../store/player';
import { Art } from './Art';
import { IconButton } from './ui';

/** Art-tinted bar that floats above the tab bar (and at the foot of detail screens). */
export function MiniPlayer({ floating }: { floating?: boolean }) {
  const track = usePlayer((s) => s.current());
  const { isPlaying, isPreview, positionSec, toggle } = usePlayer();
  const limit = usePlayer((s) => s.limitSec());
  const liked = useLikes((s) => (track ? s.liked.includes(track.id) : false));
  const toggleLike = useLikes((s) => s.toggleLike);
  if (!track) return null;
  const release = getRelease(track.releaseId)!;
  const progress = limit ? Math.min(1, positionSec / limit) : 0;

  return (
    <Pressable onPress={() => router.push('/player')} accessibilityLabel={`Now playing ${track.title}. Open player`}
      style={[{ marginHorizontal: space.sm, borderRadius: radius.md, overflow: 'hidden', backgroundColor: shade(release.colors[1], 0.35) },
        floating && { position: 'absolute', left: 0, right: 0, bottom: space.xl }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, padding: space.sm }}>
        <Art seed={release.id} colors={release.colors} size={40} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[type.body, { fontSize: 14 }]}>{track.title}</Text>
          <Text numberOfLines={1} style={[type.small, { color: colors.textMuted }]}>
            {isPreview ? 'Preview · ' : ''}{getArtist(track.artistId)?.name}
          </Text>
        </View>
        <IconButton name={liked ? 'heart' : 'heart-outline'} active={liked} color={colors.text} onPress={() => toggleLike(track.id)} label={liked ? 'Remove from liked songs' : 'Like'} />
        <IconButton name={isPlaying ? 'pause' : 'play'} color={colors.text} size={26} onPress={toggle} label={isPlaying ? 'Pause' : 'Play'} />
      </View>
      <View style={{ height: 2, marginHorizontal: space.sm, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 1 }}>
        <View style={{ height: 2, width: `${progress * 100}%`, backgroundColor: colors.text, borderRadius: 1 }} />
      </View>
      <View style={{ height: 2 }} />
    </Pressable>
  );
}
