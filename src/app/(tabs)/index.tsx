import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease, listArtists, listReleases, releasesInGenre, tracksForRelease, type Artist, type Release } from '../../api';
import { Art } from '../../components/Art';
import { Avatar } from '../../components/profile/Avatar';
import { PriceTag, ReleaseCard, Shelf } from '../../components/ui';
import { Wordmark } from '../../components/Wordmark';
import { PREVIEW_SEC } from '../../lib/format';
import { formatUGX } from '../../lib/money';
import { colors, font, layout, onDark, radius, space, type, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useSession } from '../../store/session';
import { useWallet } from '../../store/wallet';

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const name = useSession((s) => s.user?.name?.trim().split(/\s+/)[0]);
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
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.header}>
          <Wordmark size={32} style={styles.flex} />
          <Pressable onPress={() => router.push('/(tabs)/search')} accessibilityRole="button" accessibilityLabel="Search" hitSlop={8} style={styles.headerIcon}>
            <Ionicons name="search" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.greetRow}>
          <Text style={[type.display, styles.flex]}>{greeting()}{name ? `,\n${name}` : ''}</Text>
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Your profile and settings" hitSlop={6}>
            <Avatar size={48} />
          </Pressable>
        </View>

        <Hero release={featured} playing={currentRelease === featured.id && isPlaying} onPlay={() => playRelease(featured.id)} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={type.heading}>{backed.size ? 'Artists you back' : 'Artists to back'}</Text>
            <Pressable onPress={() => router.push('/(tabs)/search')} accessibilityRole="link" hitSlop={8}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRow}>
            {artists.map((a) => <ArtistBubble key={a.id} artist={a} backed={backed.has(a.id)} />)}
          </ScrollView>
        </View>

        <Shelf title="New in Kampala">
          {newest.map((r) => <ReleaseCard key={r.id} release={r} size={124} />)}
        </Shelf>

        <Shelf title="Kadongo Kamu & storytellers">
          {[...releasesInGenre('Kadongo Kamu'), ...releasesInGenre('Hip Hop')].map((r) => <ReleaseCard key={r.id} release={r} size={124} />)}
        </Shelf>

        <Shelf title="Sunday praise">
          {[...releasesInGenre('Gospel'), ...releasesInGenre('Zouk')].map((r) => <ReleaseCard key={r.id} release={r} size={124} />)}
        </Shelf>
      </ScrollView>
    </View>
  );
}

/** Today's release, big: the cover fills the card, with a preview button and its price. */
function Hero({ release, playing, onPlay }: { release: Release; playing: boolean; onPlay: () => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width, 600) - space.lg * 2;
  const artist = getArtist(release.artistId);
  const open = () => router.push(`/release/${release.id}`);
  return (
    <View style={styles.hero}>
      <Art seed={release.id} colors={release.colors} size={cardWidth} style={styles.heroArt} />
      <LinearGradient colors={[withAlpha(colors.ink, 0.9), withAlpha(colors.ink, 0.55), withAlpha(colors.ink, 0)]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill} />
      <View style={styles.heroBody}>
        <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={`${release.title} by ${artist?.name}`}>
          <Text style={styles.heroArtist}>{artist?.name}</Text>
          <Text numberOfLines={2} style={styles.heroTitle}>{release.title}</Text>
        </Pressable>
        <View style={styles.heroActions}>
          <Pressable onPress={onPlay} accessibilityRole="button" accessibilityLabel={playing ? 'Pause preview' : 'Play preview'}
            style={({ pressed }) => [styles.previewBtn, pressed && styles.pressed]}>
            <Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.accentInk} />
            <Text style={styles.previewLabel}>{playing ? 'Playing' : `Preview 0:${PREVIEW_SEC}`}</Text>
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
  pressed: { opacity: 0.8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, marginTop: space.sm },
  hero: { marginHorizontal: space.lg, marginTop: space.lg, height: 214, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.ink },
  heroArt: { position: 'absolute', right: 0, top: -40, borderRadius: 0 },
  heroBody: { flex: 1, justifyContent: 'flex-end', padding: space.lg, gap: space.xs },
  heroArtist: { fontFamily: font.bold, fontSize: 13, letterSpacing: 0.5, color: onDark.textMuted },
  heroTitle: { fontFamily: font.display, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: onDark.text, maxWidth: '75%' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16 },
  previewLabel: { fontFamily: font.display, fontSize: 14, color: colors.accentInk },
  section: { marginTop: space.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space.lg, marginBottom: space.md },
  seeAll: { fontFamily: font.bold, fontSize: 14, color: colors.accentText },
  artistRow: { gap: space.md, paddingHorizontal: space.lg },
  bubble: { width: 80, alignItems: 'center', gap: space.xs },
  ring: { padding: 3, borderRadius: 40, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: colors.accent },
  bubbleName: { fontFamily: font.bold, fontSize: 12, lineHeight: 15, color: colors.text, textAlign: 'center' },
});
