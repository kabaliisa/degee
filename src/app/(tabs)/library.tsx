import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getTrack, listArtists, listReleases, tracksForRelease, type Track } from '../../api';
import { Art } from '../../components/Art';
import { Button, Chip, EmptyState, ListRow, PlayButton, TrackRow } from '../../components/ui';
import { colors, layout, radius, space, type } from '../../lib/theme';
import { useLikes } from '../../store/likes';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

const VIEWS = ['Songs', 'Releases', 'Artists'] as const;
type LibraryView = (typeof VIEWS)[number];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function Library() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<LibraryView>('Songs');
  const ownedIds = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const liked = useLikes((s) => s.liked);
  const following = useLikes((s) => s.following);
  const playQueue = usePlayer((s) => s.playQueue);

  const owned = ownedIds.map(getTrack).filter((t): t is Track => t !== undefined);
  const ownedReleases = listReleases().filter((r) => tracksForRelease(r.id).some((t) => ownedIds.includes(t.id)));
  const myArtists = listArtists().filter((a) => following.includes(a.id) || owned.some((t) => t.artistId === a.id));

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]}>
      <Text style={[type.display, styles.padded]}>Your music</Text>
      <View style={styles.chips}>
        {VIEWS.map((v) => <Chip key={v} label={v} active={view === v} onPress={() => setView(v)} />)}
      </View>

      {view === 'Songs' ? (
        <>
          <Pressable onPress={() => liked.length && playQueue(liked, 0, owns)} accessibilityRole="button" accessibilityLabel="Play liked songs" style={styles.liked}>
            <LinearGradient colors={['#0A1A38', colors.accent]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.likedArt}>
              <Ionicons name="heart" size={28} color={colors.text} />
            </LinearGradient>
            <View style={styles.flex}>
              <Text style={type.bodyBold}>Liked songs</Text>
              <Text style={type.small}>{plural(liked.length, 'song')}, including previews</Text>
            </View>
          </Pressable>

          {owned.length === 0 ? (
            <EmptyState icon="musical-notes-outline" title="Songs you buy live here" body="Buy once and they're yours: full length, no limits."
              action={<Button label="Find music" onPress={() => router.push('/(tabs)')} style={styles.emptyAction} />} />
          ) : (
            <>
              <View style={styles.boughtHeader}>
                <View style={styles.flex}>
                  <Text style={type.heading}>Bought</Text>
                  <Text style={type.small}>{plural(owned.length, 'song')}</Text>
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
          <View style={styles.grid}>
            {ownedReleases.map((r) => (
              <Pressable key={r.id} onPress={() => router.push(`/release/${r.id}`)} accessibilityLabel={r.title} style={styles.gridCell}>
                <View style={styles.gridArt}><Art seed={r.id} colors={r.colors} size={170} style={styles.fill} /></View>
                <Text numberOfLines={1} style={[type.bodyBold, styles.gridTitle]}>{r.title}</Text>
                <Text numberOfLines={1} style={type.small}>{r.type} · {getArtist(r.artistId)?.name}</Text>
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      {view === 'Artists' ? (
        myArtists.length === 0 ? <EmptyState icon="people-outline" title="No artists yet" body="Follow artists or buy their music to keep them here." /> : (
          myArtists.map((a) => (
            <ListRow key={a.id} seed={a.id} colors={a.colors} round artSize={64} title={a.name}
              subtitle={following.includes(a.id) ? 'Following' : 'Artist'} onPress={() => router.push(`/artist/${a.id}`)} />
          ))
        )
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: layout.tabScreenBottom },
  padded: { paddingHorizontal: space.lg },
  chips: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.md, marginBottom: space.lg },
  liked: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, marginBottom: space.lg },
  likedArt: { width: 64, height: 64, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  emptyAction: { marginTop: space.md },
  boughtHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg - 6 },
  gridCell: { width: '50%', padding: 6 },
  gridArt: { aspectRatio: 1, width: '100%' },
  fill: { width: '100%', height: '100%' },
  gridTitle: { marginTop: space.sm },
});
