import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease, listArtists, listReleases, releasesInGenre, tracksForRelease, type Artist, type Release } from '../../api';
import { Art } from '../../components/Art';
import { Avatar } from '../../components/profile/Avatar';
import { PriceTag, ReleaseCard, Shelf } from '../../components/ui';
import { LightStatusBar } from '../../components/LightStatusBar';
import { Wordmark } from '../../components/Wordmark';
import { formatUGX } from '../../lib/money';
import { colors, font, layout, onDark, radius, space, type, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

export default function Home() {
  const owned = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const currentRelease = usePlayer((s) => s.current()?.releaseId);
  const isPlaying = usePlayer((s) => s.isPlaying);

  const releases = listReleases();
  const featured = releases.find((r) => r.exclusive) ?? releases[0];
  const newest = [...releases].sort((a, b) => b.year - a.year);

  // Artists you've bought from come first, with a coral ring; then others worth backing.
  const backed = new Set(owned.map((t) => releases.find((r) => tracksForRelease(r.id).some((x) => x.id === t))?.artistId));
  const artists = [...listArtists()].sort((a, b) => Number(backed.has(b.id)) - Number(backed.has(a.id)));

  const playRelease = (id: string) => {
    if (currentRelease === id) return toggle();
    if (getRelease(id)) playQueue(tracksForRelease(id).map((t) => t.id), 0, owns);
  };

  return (
    <View style={styles.screen}>
      <LightStatusBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Hero release={featured} playing={currentRelease === featured.id && isPlaying} onPlay={() => playRelease(featured.id)} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={type.heading}>Curated local releases</Text>
            <Pressable onPress={() => router.push('/(tabs)/search')} accessibilityRole="link" hitSlop={8}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {newest.map((r) => <ReleaseCard key={r.id} release={r} size={132} />)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={type.heading}>{backed.size ? 'Artists you back' : 'Artists to back'}</Text>
            <Pressable onPress={() => router.push('/(tabs)/search')} accessibilityRole="link" hitSlop={8}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {artists.map((a) => <ArtistBubble key={a.id} artist={a} backed={backed.has(a.id)} />)}
          </ScrollView>
        </View>

        <Shelf title="Kadongo Kamu & storytellers">
          {[...releasesInGenre('Kadongo Kamu'), ...releasesInGenre('Hip Hop')].map((r) => <ReleaseCard key={r.id} release={r} size={132} />)}
        </Shelf>

        <Shelf title="Sunday praise">
          {[...releasesInGenre('Gospel'), ...releasesInGenre('Zouk')].map((r) => <ReleaseCard key={r.id} release={r} size={132} />)}
        </Shelf>
      </ScrollView>
    </View>
  );
}

/** Full-width, edge to edge: the artist's photo, their name big, and Listen now. */
function Hero({ release, playing, onPlay }: { release: Release; playing: boolean; onPlay: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const artist = getArtist(release.artistId);
  const height = insets.top + 400;
  const open = () => router.push(`/release/${release.id}`);
  return (
    <View style={[styles.hero, { height }]}>
      {artist ? <Art seed={artist.id} colors={artist.colors} size={Math.max(width, height)} style={[styles.heroArt, { left: (width - Math.max(width, height)) / 2 }]} /> : null}
      <LinearGradient colors={[withAlpha(colors.ink, 0.55), withAlpha(colors.ink, 0), withAlpha(colors.ink, 0.35), withAlpha(colors.ink, 0.95)]}
        locations={[0, 0.25, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.heroTop, { paddingTop: insets.top + space.sm }]}>
        <Wordmark size={30} style={styles.flex} />
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Your profile and settings" hitSlop={6}>
          <Avatar size={38} />
        </Pressable>
      </View>
      <View style={styles.heroBody}>
        <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={`${release.title} by ${artist?.name}`}>
          <Text style={styles.heroKicker}>New from</Text>
          <Text numberOfLines={2} style={styles.heroTitle}>{artist?.name}</Text>
          <Text numberOfLines={2} style={styles.heroBlurb}>{release.title}, a new {release.type.toLowerCase()}{release.exclusive ? ', only on Deegee' : ''}.</Text>
        </Pressable>
        <View style={styles.heroActions}>
          <Pressable onPress={onPlay} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Listen now'}
            style={({ pressed }) => [styles.listenBtn, pressed && styles.pressed]}>
            <Ionicons name={playing ? 'pause' : 'play'} size={16} color={colors.accentInk} />
            <Text style={styles.listenLabel}>{playing ? 'Playing' : 'Listen now'}</Text>
          </Pressable>
          <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Buy ${release.title}, ${formatUGX(release.priceUGX)}`}>
            <PriceTag release={release} onDark />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ArtistBubble({ artist, backed }: { artist: Artist; backed: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/artist/${artist.id}`)} accessibilityRole="button"
      accessibilityLabel={backed ? `${artist.name}, you back this artist` : artist.name} style={styles.bubble}>
      <View style={[styles.ring, backed && styles.ringOn]}>
        <Art seed={artist.id} colors={artist.colors} size={68} round />
      </View>
      <Text numberOfLines={2} style={styles.bubbleName}>{artist.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: layout.tabScreenBottom },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  hero: { backgroundColor: colors.ink, overflow: 'hidden' },
  heroArt: { position: 'absolute', left: 0, top: 0, borderRadius: 0 },
  heroTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  heroBody: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.xl, gap: space.md },
  heroKicker: { fontFamily: font.display, fontSize: 20, color: onDark.text },
  heroTitle: { fontFamily: font.display, fontSize: 46, lineHeight: 50, letterSpacing: -1.5, color: onDark.text },
  heroBlurb: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: onDark.textMuted, maxWidth: 280, marginTop: space.xs },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 20 },
  listenLabel: { fontFamily: font.display, fontSize: 15, color: colors.accentInk },
  section: { marginTop: space.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space.lg, marginBottom: space.md },
  seeAll: { fontFamily: font.bold, fontSize: 14, color: colors.accentText },
  row: { gap: space.md, paddingHorizontal: space.lg },
  bubble: { width: 80, alignItems: 'center', gap: space.xs },
  ring: { padding: 3, borderRadius: 40, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: colors.accent },
  bubbleName: { fontFamily: font.bold, fontSize: 12, lineHeight: 15, color: colors.text, textAlign: 'center' },
});
