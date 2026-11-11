import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Art } from '../components/Art';
import { Button, EmptyState, IconButton, PlayButton } from '../components/ui';
import { formatDuration, getArtist, getRelease } from '../data/catalog';
import { formatUGX } from '../lib/money';
import { colors, font, radius, space, type, withAlpha } from '../lib/theme';
import { useLikes } from '../store/likes';
import { usePlayer } from '../store/player';
import { useWallet } from '../store/wallet';

export default function Player() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const track = usePlayer((s) => s.current());
  const { isPlaying, isPreview, positionSec, toggle, next, prev, seek } = usePlayer();
  const limit = usePlayer((s) => s.limitSec());
  const owns = useWallet((s) => s.owns);
  const liked = useLikes((s) => (track ? s.liked.includes(track.id) : false));
  const toggleLike = useLikes((s) => s.toggleLike);
  const [barWidth, setBarWidth] = useState(0);
  if (!track) return <EmptyState icon="musical-notes-outline" title="Nothing playing" body="Pick a song to start listening." action={<Button label="Close" variant="secondary" onPress={() => router.back()} />} />;

  const release = getRelease(track.releaseId)!;
  const artist = getArtist(track.artistId)!;
  const pct = limit ? Math.min(1, positionSec / limit) : 0;
  const artSize = Math.min(width - space.xl * 2, height * 0.42, 420);

  return (
    <LinearGradient colors={[colors.surfaceRaised, colors.bg]} locations={[0, 0.6]}
      style={{ flex: 1, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton name="chevron-down" color={colors.text} size={28} label="Close player" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[type.tiny, { color: colors.text, opacity: 0.75 }]}>Playing from {release.type.toLowerCase()}</Text>
          <Text numberOfLines={1} style={[type.bodyBold, { fontSize: 13 }]}>{release.title}</Text>
        </View>
        <IconButton name="share-outline" color={colors.text} label="Share" onPress={() => Share.share({ message: `${track.title} by ${artist.name} on Deegee` })} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 30, shadowOffset: { width: 0, height: 16 } }}>
          <Art seed={release.id} colors={release.colors} size={artSize} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={type.title}>{track.title}</Text>
          <Pressable onPress={() => { router.back(); router.push(`/artist/${artist.id}`); }}>
            <Text style={[type.body, { color: colors.textMuted }]}>{artist.name}</Text>
          </Pressable>
        </View>
        <IconButton name={liked ? 'heart' : 'heart-outline'} active={liked} size={28} color={colors.text} label={liked ? 'Remove from liked songs' : 'Like'} onPress={() => toggleLike(track.id)} />
      </View>

      <View style={{ marginTop: space.lg }}>
        <Pressable onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)} accessibilityLabel="Seek" accessibilityRole="adjustable"
          onPress={(e) => { if (barWidth) seek(Math.round((e.nativeEvent.locationX / barWidth) * limit)); }} style={{ height: 22, justifyContent: 'center' }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: withAlpha('#FFFFFF', 0.22) }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.text, width: `${pct * 100}%` }} />
          </View>
          <View style={{ position: 'absolute', left: Math.max(0, pct * barWidth - 6), width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text }} />
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={type.tiny}>{formatDuration(positionSec)}</Text>
          <Text style={type.tiny}>{isPreview ? `Preview ${formatDuration(limit)}` : formatDuration(limit)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md }}>
        <IconButton name="shuffle" color={colors.textMuted} label="Shuffle" onPress={() => {}} />
        <IconButton name="play-skip-back" color={colors.text} size={34} label="Previous" onPress={() => prev(owns)} />
        <PlayButton size={68} playing={isPlaying} onPress={toggle} />
        <IconButton name="play-skip-forward" color={colors.text} size={34} label="Next" onPress={() => next(owns)} />
        <IconButton name="repeat" color={colors.textMuted} label="Repeat" onPress={() => {}} />
      </View>

      {isPreview ? (
        <Pressable onPress={() => router.push({ pathname: '/buy', params: { kind: 'track', id: track.id } })}
          style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: withAlpha('#000000', 0.32) }}>
          <Ionicons name="lock-open-outline" size={22} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[type.bodyBold, { fontSize: 14 }]}>Hear it all, keep it forever</Text>
            <Text style={type.small}>Most of it goes straight to {artist.name}.</Text>
          </View>
          <View style={{ backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 }}>
            <Text style={{ fontFamily: font.bold, color: colors.accentInk, fontSize: 13 }}>{formatUGX(track.priceUGX)}</Text>
          </View>
        </Pressable>
      ) : (
        <View style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' }}>
          <Ionicons name="arrow-down-circle" size={16} color={colors.accent} />
          <Text style={type.small}>You own this song. Play it in full any time.</Text>
        </View>
      )}
    </LinearGradient>
  );
}
