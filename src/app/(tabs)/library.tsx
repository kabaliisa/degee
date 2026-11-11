import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Art } from '../../components/Art';
import { Button, Chip, EmptyState, PlayButton, TrackRow } from '../../components/ui';
import { artists, getArtist, getTrack, releases, tracksForRelease } from '../../data/catalog';
import { colors, radius, space, type } from '../../lib/theme';
import { useLikes } from '../../store/likes';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

const VIEWS = ['Songs', 'Releases', 'Artists'] as const;

export default function Library() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<(typeof VIEWS)[number]>('Songs');
  const ownedIds = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const liked = useLikes((s) => s.liked);
  const following = useLikes((s) => s.following);
  const playQueue = usePlayer((s) => s.playQueue);

  const owned = ownedIds.map(getTrack).filter((t) => t !== undefined);
  const ownedReleases = releases.filter((r) => tracksForRelease(r.id).some((t) => ownedIds.includes(t.id)));
  const myArtists = artists.filter((a) => following.includes(a.id) || owned.some((t) => t.artistId === a.id));

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: 170 }}>
      <Text style={[type.display, { paddingHorizontal: space.lg }]}>Your music</Text>
      <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.md, marginBottom: space.lg }}>
        {VIEWS.map((v) => <Chip key={v} label={v} active={view === v} onPress={() => setView(v)} />)}
      </View>

      {view === 'Songs' ? (
        <>
          <Pressable onPress={() => liked.length && playQueue(liked, 0, owns)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, marginBottom: space.lg }}>
            <LinearGradient colors={['#0A1A38', colors.accent]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
              style={{ width: 64, height: 64, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="heart" size={28} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={type.bodyBold}>Liked songs</Text>
              <Text style={type.small}>{liked.length} song{liked.length === 1 ? '' : 's'}, including previews</Text>
            </View>
          </Pressable>

          {owned.length === 0 ? (
            <EmptyState icon="musical-notes-outline" title="Songs you buy live here" body="Buy once and they're yours: full length, no limits."
              action={<Button label="Find music" onPress={() => router.push('/(tabs)')} style={{ marginTop: space.md }} />} />
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={type.heading}>Bought</Text>
                  <Text style={type.small}>{owned.length} song{owned.length === 1 ? '' : 's'}</Text>
                </View>
                <PlayButton size={48} onPress={() => playQueue(owned.map((t) => t.id), 0, owns)} label="Play all bought songs" />
              </View>
              {owned.map((t, i) => <TrackRow key={t.id} track={t} onPlay={() => playQueue(owned.map((x) => x.id), i, owns)} />)}
            </>
          )}
        </>
      ) : null}

      {view === 'Releases' ? (
        ownedReleases.length === 0 ? <EmptyState icon="disc-outline" title="No releases yet" body="Albums, EPs and singles you buy from show here." /> : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg - 6 }}>
            {ownedReleases.map((r) => (
              <Pressable key={r.id} onPress={() => router.push(`/release/${r.id}`)} style={{ width: '50%', padding: 6 }}>
                <View style={{ aspectRatio: 1, width: '100%' }}><Art seed={r.id} colors={r.colors} size={170} style={{ width: '100%', height: '100%' }} /></View>
                <Text numberOfLines={1} style={[type.bodyBold, { marginTop: space.sm }]}>{r.title}</Text>
                <Text numberOfLines={1} style={type.small}>{r.type} · {getArtist(r.artistId)?.name}</Text>
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      {view === 'Artists' ? (
        myArtists.length === 0 ? <EmptyState icon="people-outline" title="No artists yet" body="Follow artists or buy their music to keep them here." /> : (
          myArtists.map((a) => (
            <Pressable key={a.id} onPress={() => router.push(`/artist/${a.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.lg, backgroundColor: pressed ? colors.surface : 'transparent' })}>
              <Art seed={a.id} colors={a.colors} size={64} round />
              <View><Text style={type.bodyBold}>{a.name}</Text><Text style={type.small}>{following.includes(a.id) ? 'Following' : 'Artist'}</Text></View>
            </Pressable>
          ))
        )
      ) : null}
    </ScrollView>
  );
}
