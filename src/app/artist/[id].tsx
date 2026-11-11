import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { buyersFor, getArtist, releasesByArtist, supportersFor, tracksByArtist } from '../../api';
import { Art } from '../../components/Art';
import { GiftButton, SupportCard } from '../../components/artist/GiftEntryPoints';
import { MiniPlayer } from '../../components/player/MiniPlayer';
import { Button, EmptyState, IconButton, PlayButton, ReleaseCard, Shelf, TrackRow } from '../../components/ui';
import { colors, font, layout, radius, space, type, withAlpha } from '../../lib/theme';
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

  const ownReleases = releasesByArtist(artist.id).sort((a, b) => b.year - a.year);
  const popular = tracksByArtist(artist.id).sort((a, b) => buyersFor(b.id) - buyersFor(a.id)).slice(0, 5);
  const link = `deegee.app/${artist.name.toLowerCase().replace(/\s+/g, '')}`;
  const share = () => Share.share({ message: `Support ${artist.name} on Deegee: https://${link}` });
  const play = () => (currentArtist === artist.id ? toggle() : playQueue(popular.map((t) => t.id), 0, owns));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Full-bleed hero: the artist's art fills the top, name set large over a fade. */}
        <View style={styles.hero}>
          <Art seed={artist.id} colors={artist.colors} size={600} style={styles.heroArt} />
          <LinearGradient colors={[withAlpha(colors.bg, 0.1), withAlpha(colors.bg, 0.6), colors.bg]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroText}>
            {artist.verified ? (
              <View style={styles.verified}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                <Text style={[type.smallBold, styles.verifiedText]}>Verified artist</Text>
              </View>
            ) : null}
            <Text style={type.hero} numberOfLines={2} adjustsFontSizeToFit>{artist.name}</Text>
          </View>
        </View>

        <View style={styles.padded}>
          <Text style={type.small}>{supportersFor(artist.id).toLocaleString('en-US')} supporters · {artist.city}</Text>
          <View style={styles.actions}>
            <Button small variant="outline" label={following ? 'Following' : 'Follow'} onPress={() => toggleFollow(artist.id)} />
            <GiftButton artist={artist} />
            <IconButton name="share-outline" label="Share artist page" onPress={share} />
            <View style={styles.flex} />
            <PlayButton playing={currentArtist === artist.id && isPlaying} onPress={play} />
          </View>
        </View>

        <Text style={[type.heading, styles.sectionTitle]}>Popular</Text>
        {popular.map((t, i) => (
          <TrackRow key={t.id} track={t} onPlay={() => playQueue(popular.map((x) => x.id), i, owns)} />
        ))}

        <SupportCard artist={artist} />

        <Shelf title="Releases">
          {ownReleases.map((r) => <ReleaseCard key={r.id} release={r} size={140} subtitle={`${r.year} · ${r.type}`} />)}
        </Shelf>

        <View style={styles.about}>
          <Text style={type.heading}>About</Text>
          <Text style={[type.body, styles.bio]}>{artist.bio}</Text>
          <Text style={[type.small, styles.aboutMeta]}>{artist.genres.join(', ')}</Text>
          <Pressable onPress={share} accessibilityRole="link" style={styles.aboutMeta}>
            <Text style={[type.smallBold, styles.link]}>{link}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <MiniPlayer floating />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: layout.detailScreenBottom },
  hero: { height: 340, overflow: 'hidden' },
  heroArt: { position: 'absolute', top: -130, left: -100, borderRadius: 0 },
  heroText: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  verifiedText: { color: colors.text },
  padded: { paddingHorizontal: space.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md },
  flex: { flex: 1 },
  sectionTitle: { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.sm },
  about: { margin: space.lg, marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  bio: { color: colors.textMuted, marginTop: space.sm, fontFamily: font.regular },
  aboutMeta: { marginTop: space.md },
  link: { color: colors.accent },
});
