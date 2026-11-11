import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Art } from '../../components/Art';
import { MiniPlayer } from '../../components/MiniPlayer';
import { Button, EmptyState, IconButton, PlayButton, ReleaseCard, Shelf, TrackRow } from '../../components/ui';
import { buyersFor, getArtist, releasesByArtist, supportersFor, tracks } from '../../data/catalog';
import { colors, font, space, type, withAlpha } from '../../lib/theme';
import { useLikes } from '../../store/likes';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artist = getArtist(id);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const currentArtist = usePlayer((s) => s.current()?.artistId);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const following = useLikes((s) => (artist ? s.following.includes(artist.id) : false));
  const toggleFollow = useLikes((s) => s.toggleFollow);
  if (!artist) return <EmptyState icon="person-outline" title="Artist not found" body="This page may have moved." />;

  const own = releasesByArtist(artist.id).sort((a, b) => b.year - a.year);
  const popular = tracks.filter((t) => t.artistId === artist.id).sort((a, b) => buyersFor(b.id) - buyersFor(a.id)).slice(0, 5);
  const link = `deegee.app/${artist.name.toLowerCase().replace(/\s+/g, '')}`;
  const play = () => (currentArtist === artist.id ? toggle() : playQueue(popular.map((t) => t.id), 0, owns));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Full-bleed hero: the artist's art fills the top, name set large over a fade. */}
        <View style={{ height: 340, overflow: 'hidden' }}>
          <Art seed={artist.id} colors={artist.colors} size={600} style={{ position: 'absolute', top: -130, left: -100, borderRadius: 0 }} />
          <LinearGradient colors={[withAlpha(colors.bg, 0.1), withAlpha(colors.bg, 0.6), colors.bg]} locations={[0, 0.6, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: space.md }}>
            {artist.verified ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                <Text style={[type.smallBold, { color: colors.text }]}>Verified artist</Text>
              </View>
            ) : null}
            <Text style={type.hero} numberOfLines={2} adjustsFontSizeToFit>{artist.name}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          <Text style={type.small}>{supportersFor(artist.id).toLocaleString('en-US')} supporters · {artist.city}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.md }}>
            <Button small variant="outline" label={following ? 'Following' : 'Follow'} onPress={() => toggleFollow(artist.id)} />
            <Button small variant="outline" icon="gift-outline" label="Gift"
              onPress={() => router.push({ pathname: '/gift', params: { artistId: artist.id } })} />
            <IconButton name="share-outline" label="Share artist page" onPress={() => Share.share({ message: `Support ${artist.name} on Deegee: https://${link}` })} />
            <View style={{ flex: 1 }} />
            <PlayButton playing={currentArtist === artist.id && isPlaying} onPress={play} />
          </View>
        </View>

        <Text style={[type.heading, { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.sm }]}>Popular</Text>
        {popular.map((t, i) => (
          <View key={t.id}>
            <TrackRow track={t} onPlay={() => playQueue(popular.map((x) => x.id), i, owns)} />
          </View>
        ))}

        <Pressable onPress={() => router.push({ pathname: '/gift', params: { artistId: artist.id } })}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, margin: space.lg, marginBottom: 0, padding: space.lg, borderRadius: 16, backgroundColor: pressed ? colors.surfacePress : colors.surface })}>
          <Ionicons name="gift" size={26} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={type.bodyBold}>Support {artist.name} directly</Text>
            <Text style={type.small}>Send a gift from your wallet. 95% goes straight to them.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>

        <Shelf title="Releases">
          {own.map((r) => <ReleaseCard key={r.id} release={r} size={140} subtitle={`${r.year} · ${r.type}`} />)}
        </Shelf>

        <View style={{ margin: space.lg, marginTop: space.xl, padding: space.lg, borderRadius: 16, backgroundColor: colors.surface }}>
          <Text style={type.heading}>About</Text>
          <Text style={[type.body, { color: colors.textMuted, marginTop: space.sm, fontFamily: font.regular }]}>{artist.bio}</Text>
          <Text style={[type.small, { marginTop: space.md }]}>{artist.genres.join(', ')}</Text>
          <Pressable onPress={() => Share.share({ message: `https://${link}` })} style={{ marginTop: space.md }}>
            <Text style={[type.smallBold, { color: colors.accent }]}>{link}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <MiniPlayer floating />
    </View>
  );
}
