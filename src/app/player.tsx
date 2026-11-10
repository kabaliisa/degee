import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Cover, EmptyState } from '../components/ui';
import { formatDuration, getArtist, getRelease } from '../data/catalog';
import { formatUGX } from '../lib/money';
import { colors, space, type } from '../lib/theme';
import { usePlayer } from '../store/player';
import { useWallet } from '../store/wallet';

export default function Player() {
  const track = usePlayer((s) => s.current());
  const { isPlaying, isPreview, positionSec, toggle, next, prev, seek } = usePlayer();
  const limit = usePlayer((s) => s.limitSec());
  const owns = useWallet((s) => s.owns);
  const [barWidth, setBarWidth] = useState(0);
  if (!track) return <EmptyState icon="musical-notes-outline" title="Nothing playing" body="Pick a song to start listening." />;

  const release = getRelease(track.releaseId)!;
  const artist = getArtist(track.artistId)!;
  const pct = limit ? positionSec / limit : 0;

  return (
    <View style={{ flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'center' }}>
      <Cover title={release.title} colors={release.colors} size={300} style={{ alignSelf: 'center', maxWidth: '100%' }} />
      <View>
        <Text style={type.title} numberOfLines={1}>{track.title}</Text>
        <Pressable onPress={() => { router.back(); router.push(`/artist/${artist.id}`); }}>
          <Text style={[type.body, { color: colors.accent }]}>{artist.name}</Text>
        </Pressable>
      </View>

      <View>
        <Pressable onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          onPress={(e) => { if (barWidth) seek(Math.round((e.nativeEvent.locationX / barWidth) * limit)); }} style={{ height: 24, justifyContent: 'center' }} accessibilityLabel="Seek">
          <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.accent, width: `${Math.min(100, pct * 100)}%` }} />
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={type.small}>{formatDuration(positionSec)}</Text>
          <Text style={type.small}>{formatDuration(limit)}{isPreview ? ' preview' : ''}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xxl }}>
        <Pressable onPress={() => prev(owns)} hitSlop={12} accessibilityLabel="Previous"><Ionicons name="play-skip-back" size={30} color={colors.text} /></Pressable>
        <Pressable onPress={toggle} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={colors.accentInk} />
        </Pressable>
        <Pressable onPress={() => next(owns)} hitSlop={12} accessibilityLabel="Next"><Ionicons name="play-skip-forward" size={30} color={colors.text} /></Pressable>
      </View>

      {isPreview ? (
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Text style={[type.small, { textAlign: 'center' }]}>You're hearing a 30-second preview. Buy it to hear it all and keep it.</Text>
          <Button label={`Buy for ${formatUGX(track.priceUGX)}`} icon="bag-handle"
            onPress={() => router.push({ pathname: '/buy', params: { kind: 'track', id: track.id } })} />
        </View>
      ) : null}
    </View>
  );
}
