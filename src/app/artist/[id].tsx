import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { buyersFor, getArtist, releasesByArtist, supportersFor, tracksByArtist } from '../../api';
import { Art } from '../../components/Art';
import { SupportCard } from '../../components/artist/GiftEntryPoints';
import { MiniPlayer } from '../../components/player/MiniPlayer';
import { Button, EmptyState, IconButton, PlayButton, ReleaseCard, Shelf, TrackRow } from '../../components/ui';
import { colors, font, layout, onDark, radius, space, type, withAlpha } from '../../lib/theme';
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
          <LinearGradient colors={[withAlpha(colors.ink, 0.5), withAlpha(colors.ink, 0), withAlpha(colors.ink, 0.3), withAlpha(colors.ink, 0.95)]}
            locations={[0, 0.25, 0.55, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroText}>
            <View style={styles.flex}>
              {artist.verified ? (
                <View style={styles.verified}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.lime} />
                  <Text style={styles.verifiedText}>Verified artist</Text>
                </View>
              ) : null}
              <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>{artist.name}</Text>
              <Text style={styles.meta}>{supportersFor(artist.id).toLocaleString('en-US')} supporters · {artist.city}</Text>
            </View>
            <PlayButton playing={currentArtist === artist.id && isPlaying} onPress={play} />
          </View>
        </View>

        <View style={styles.actions}>
          <Button variant={following ? 'secondary' : 'primary'} icon={following ? 'checkmark' : undefined} label={following ? 'Following' : 'Follow'}
            onPress={() => toggleFollow(artist.id)} style={styles.flex} />
          <Button variant="outline" label="Send a gift" onPress={() => router.push({ pathname: '/gift', params: { artistId: artist.id } })}
            style={styles.flex} />
          <IconButton name="share-outline" label="Share artist page" onPress={share} />
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
  hero: { height: 380, overflow: 'hidden', backgroundColor: colors.ink, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroArt: { position: 'absolute', top: -110, left: -100, borderRadius: 0 },
  heroText: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.xl, flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  verifiedText: { fontFamily: font.bold, fontSize: 13, color: onDark.text },
  name: { fontFamily: font.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: onDark.text },
  meta: { fontFamily: font.medium, fontSize: 14, color: onDark.textMuted, marginTop: space.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.lg },
  flex: { flex: 1 },
  sectionTitle: { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.sm },
  about: { margin: space.lg, marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  bio: { color: colors.textMuted, marginTop: space.sm, fontFamily: font.regular },
  aboutMeta: { marginTop: space.md },
  link: { color: colors.accentText },
});
