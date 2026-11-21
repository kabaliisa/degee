import seed from '../api/catalog.seed.json';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { buyersFor, getArtist, listArtists, releasesByArtist, supportersFor, tracksByArtist } from '../api';
import { Art } from '../components/Art';
import { GiftButton, SupportCard } from '../components/artist/GiftEntryPoints';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { Button, EmptyState, IconButton, PlayButton, ReleaseCard, Shelf, TrackRow } from '../components/ui';
import { colors, font, layout, onDark, radius, space, type, withAlpha } from '../lib/theme';
import { siteUrl } from '../lib/site';
import { artistSlug, artistBySlug } from '../lib/slug';
import { useLayout } from '../lib/breakpoints';
import { useLikes } from '../store/likes';
import { usePlayer } from '../store/player';
import { useWallet } from '../store/wallet';

export default function ArtistScreen() {
  // The address is the artist's name (deegee.ug/nalu-kizza). Ids still resolve, so a link made
  // before an artist picked a handle, or one written down from the database, keeps working.
  const { wide } = useLayout();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const artist = artistBySlug(slug ?? '', listArtists()) ?? getArtist(slug);
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
  // The real page, so a shared link opens the artist rather than the front door.
  const url = siteUrl(`/${artistSlug(artist)}`);
  const link = url.replace(/^https?:\/\//, '');
  const share = () => Share.share({ message: `Support ${artist.name} on Deegee: ${url}` });
  const play = () => (currentArtist === artist.id ? toggle() : playQueue(popular.map((t) => t.id), 0, owns));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, wide && styles.contentWide]}>
        {/* Full-bleed hero: the artist's art fills the top, name set large over a fade. Wide, it
            turns on its side -- the photograph held right, the name in the clear space beside it --
            because a tall square crop on a broad window leaves half the banner empty. */}
        <View style={[styles.hero, wide && styles.heroWide]}>
          <Art seed={artist.id} size={wide ? 760 : 600} style={wide ? styles.heroArtWide : styles.heroArt} />
          {/* Ends on the page's own colour, so the photograph dissolves into it rather than stopping. */}
          {wide ? (
            <LinearGradient colors={[colors.bg, withAlpha(colors.bg, 0.9), withAlpha(colors.bg, 0.25), withAlpha(colors.bg, 0)]}
              locations={[0, 0.36, 0.72, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          ) : (
            <LinearGradient colors={[withAlpha(colors.bg, 0.6), withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.4), colors.bg]}
              locations={[0, 0.3, 0.68, 1]} style={StyleSheet.absoluteFill} />
          )}
          {wide ? <LinearGradient colors={[withAlpha(colors.bg, 0), colors.bg]} style={styles.heroFootWide} pointerEvents="none" /> : null}
          <View style={[styles.heroText, wide && styles.heroTextWide]}>
            {/* Wide, the words take only the room they need so the play button sits beside the name
                rather than drifting out over the photograph. */}
            <View style={wide ? undefined : styles.flex}>
              {artist.verified ? (
                <View style={styles.verified}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.ownedInk} />
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
          {/* Both sized to their words rather than stretched across the row. Follow filling half the
              screen in solid gold outweighed the music underneath it, which is what the page is for. */}
          <Button variant={following ? 'secondary' : 'primary'} icon={following ? 'checkmark' : undefined} label={following ? 'Following' : 'Follow'}
            small onPress={() => toggleFollow(artist.id)} />
          <GiftButton artist={artist} small />
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
      {/* The wide layout already has a player bar along the foot of the window. */}
      {wide ? null : <MiniPlayer floating />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: layout.detailScreenBottom },
  // A track row that runs the whole width of a laptop puts the price a hand's width from the title.
  // The page keeps a column it can be read in, and the hero still reaches both edges.
  contentWide: { maxWidth: 1180, width: '100%', alignSelf: 'center', paddingBottom: space.xxl },
  hero: { height: 380, overflow: 'hidden', backgroundColor: colors.bg },
  heroWide: { height: 420 },
  heroArtWide: { position: 'absolute', right: 0, top: '50%', transform: [{ translateY: '-50%' }], borderRadius: 0 },
  heroFootWide: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  heroTextWide: { left: space.xl, right: undefined, maxWidth: 560, bottom: space.xxl },

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

/** One page per artist, written out as HTML at build time, so searching their name can find them. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return seed.artists.map((a) => ({ slug: artistSlug(a) }));
}

