import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getArtist, getRelease, listArtists, listReleases, releasesInGenre, tracksForRelease, type Artist, type Release } from '../../api';
import { Art } from '../../components/Art';
import { GreetingBar } from '../../components/home/GreetingBar';
import { Kitenge } from '../../components/home/Kitenge';
import { ReleaseCard, SectionHeading, Shelf, StatusBarStrip } from '../../components/ui';
import { askToSignIn } from '../../lib/auth';
import { formatUGX } from '../../lib/money';
import { colors, font, layout, radius, space, type, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useSignedIn } from '../../store/session';
import { useWallet } from '../../store/wallet';

export default function Home() {
  const [heroScrolledAway, setHeroScrolledAway] = useState(false);
  const insets = useSafeAreaInsets();
  const owned = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const currentRelease = usePlayer((s) => s.current()?.releaseId);
  const isPlaying = usePlayer((s) => s.isPlaying);

  const releases = listReleases();
  const featured = releases.find((r) => r.exclusive) ?? releases[0];
  const newest = [...releases].sort((a, b) => b.year - a.year);
  // The one release put forward to buy, rather than to browse: the newest that isn't already the hero.
  const pick = newest.find((r) => r.id !== featured.id) ?? featured;

  // Artists you've bought from come first, with a gold ring; then others worth backing.
  const backed = new Set(owned.map((t) => releases.find((r) => tracksForRelease(r.id).some((x) => x.id === t))?.artistId));
  const artists = [...listArtists()].sort((a, b) => Number(backed.has(b.id)) - Number(backed.has(a.id)));

  const playRelease = (id: string) => {
    if (currentRelease === id) return toggle();
    if (getRelease(id)) playQueue(tracksForRelease(id).map((t) => t.id), 0, owns);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]}
        scrollEventThrottle={16}
        onScroll={(e) => setHeroScrolledAway(e.nativeEvent.contentOffset.y > 40)}
      >
        <GreetingBar />

        <Hero release={featured} playing={currentRelease === featured.id && isPlaying} onPlay={() => playRelease(featured.id)} />

        <View style={styles.section}>
          <SectionHeading title="New releases" rule={false} onSeeAll={() => router.push('/(tabs)/search')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {newest.map((r) => <ReleaseCard key={r.id} release={r} size={148} />)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeading title="Made in Uganda" />
          <FeatureCard release={pick} />
          <PaymentRow />
        </View>

        <View style={styles.section}>
          <SectionHeading title={backed.size ? 'Artists you back' : 'Artists to back'} rule={false}
            onSeeAll={() => router.push('/(tabs)/search')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {artists.map((a) => <ArtistBubble key={a.id} artist={a} backed={backed.has(a.id)} />)}
          </ScrollView>
        </View>

        <Shelf title="Kadongo Kamu & storytellers">
          {[...releasesInGenre('Kadongo Kamu'), ...releasesInGenre('Hip Hop')].map((r) => <ReleaseCard key={r.id} release={r} size={148} />)}
        </Shelf>

        <Shelf title="Sunday praise">
          {[...releasesInGenre('Gospel'), ...releasesInGenre('Zouk')].map((r) => <ReleaseCard key={r.id} release={r} size={148} />)}
        </Shelf>
      </ScrollView>
      <StatusBarStrip visible={heroScrolledAway} />
    </View>
  );
}

/** The artist put forward today: their photograph, their name, and a way into their music. */
function Hero({ release, playing, onPlay }: { release: Release; playing: boolean; onPlay: () => void }) {
  const { width } = useWindowDimensions();
  const artist = getArtist(release.artistId);
  const size = width - space.lg * 2;
  const openArtist = () => router.push(`/artist/${release.artistId}`);
  return (
    <View style={[styles.hero, { height: size * 1.04 }]}>
      {artist ? <Art seed={artist.id} size={size * 1.35} style={styles.heroArt} /> : null}
      <LinearGradient
        colors={[withAlpha(colors.bg, 0.1), withAlpha(colors.bg, 0.55), withAlpha(colors.bg, 0.9), colors.bg]}
        locations={[0, 0.42, 0.72, 1]} style={StyleSheet.absoluteFill} pointerEvents="none"
      />
      <View style={styles.heroBody}>
        <View style={styles.featuredPill}>
          <Text style={styles.featuredText}>Featured artist</Text>
        </View>
        <Pressable onPress={openArtist} accessibilityRole="link" accessibilityLabel={`${release.title} by ${artist?.name}`}>
          <Text numberOfLines={2} style={styles.heroTitle}>{release.title}</Text>
          <Text numberOfLines={1} style={styles.heroArtist}>{artist?.name.toUpperCase()}</Text>
          <View style={styles.heroRule} />
        </Pressable>
        <View style={styles.heroActions}>
          <Pressable onPress={openArtist} accessibilityRole="button" accessibilityLabel={`Explore ${artist?.name}'s music`}
            style={({ pressed }) => [styles.goldButton, pressed && styles.pressed]}>
            <Text style={styles.goldButtonText}>Explore music</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accentInk} />
          </Pressable>
          <Pressable onPress={onPlay} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'}
            style={({ pressed }) => [styles.heroPlay, pressed && styles.pressed]}>
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** One release, put forward to be bought rather than browsed: the price and the button are the point. */
function FeatureCard({ release }: { release: Release }) {
  const artist = getArtist(release.artistId);
  const signedIn = useSignedIn();
  const ownsAll = useWallet((s) => tracksForRelease(release.id).every((t) => s.ownedTracks.includes(t.id)));
  const buy = () => (signedIn
    ? router.push({ pathname: '/buy', params: { kind: 'release', id: release.id } })
    : askToSignIn(`/buy?kind=release&id=${release.id}`));
  return (
    <View style={styles.feature}>
      <View style={styles.kitenge} pointerEvents="none"><Kitenge size={104} /></View>
      <Pressable onPress={() => router.push(`/release/${release.id}`)} accessibilityRole="link"
        accessibilityLabel={`${release.title} by ${artist?.name}`}>
        <Art seed={release.id} size={116} style={styles.featureArt} />
      </Pressable>
      <View style={styles.featureBody}>
        <Text numberOfLines={1} style={type.caps}>{artist?.name.toUpperCase()}</Text>
        <Text numberOfLines={2} style={styles.featureTitle}>{release.title}</Text>
        <View style={styles.featureFoot}>
          <View style={styles.flex}>
            <Ionicons name="pulse" size={15} color={colors.accent} />
            <Text style={styles.featurePrice}>{ownsAll ? 'Owned' : formatUGX(release.priceUGX)}</Text>
          </View>
          {ownsAll ? null : (
            <Pressable onPress={buy} accessibilityRole="button" accessibilityLabel={`Buy ${release.title}, ${formatUGX(release.priceUGX)}`}
              style={({ pressed }) => [styles.buyButton, pressed && styles.pressed]}>
              <Text style={styles.goldButtonText}>Buy</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

/** Says how you pay here, before anyone has to ask. */
function PaymentRow() {
  return (
    <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="link"
      accessibilityLabel="How paying works: MTN MoMo and Airtel Money"
      style={({ pressed }) => [styles.payRow, pressed && styles.pressed]}>
      <View style={styles.payIcon}>
        <Ionicons name="phone-portrait-outline" size={17} color={colors.accent} />
      </View>
      <Text style={styles.payText}>MTN MoMo · Airtel Money</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

function ArtistBubble({ artist, backed }: { artist: Artist; backed: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/artist/${artist.id}`)} accessibilityRole="button"
      accessibilityLabel={backed ? `${artist.name}, you back this artist` : artist.name} style={styles.bubble}>
      <View style={[styles.ring, backed && styles.ringOn]}>
        <Art seed={artist.id} size={64} round />
      </View>
      <Text numberOfLines={2} style={styles.bubbleName}>{artist.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: layout.tabScreenBottom },
  flex: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.85 },

  hero: { marginHorizontal: space.lg, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface },
  heroArt: { position: 'absolute', top: 0, right: 0, borderRadius: 0 },
  heroBody: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, gap: space.sm },
  featuredPill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  featuredText: { fontFamily: font.medium, fontSize: 12, color: colors.accent },
  heroTitle: { fontFamily: font.display, fontSize: 34, lineHeight: 39, letterSpacing: -0.8, color: colors.text },
  heroArtist: { fontFamily: font.medium, fontSize: 12, letterSpacing: 3, color: colors.text, marginTop: 6 },
  heroRule: { width: 34, height: 3, borderRadius: radius.pill, backgroundColor: colors.flag, marginTop: 8 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  goldButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 46, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.accent },
  goldButtonText: { fontFamily: font.semibold, fontSize: 15, color: colors.accentInk },
  heroPlay: { width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.text, 0.16) },

  section: { marginTop: space.xl },
  row: { gap: space.md, paddingHorizontal: space.lg },

  feature: { flexDirection: 'row', gap: space.md, marginHorizontal: space.lg, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  kitenge: { position: 'absolute', top: 0, right: 0, opacity: 0.9 },
  featureArt: { borderRadius: radius.md },
  featureBody: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 2 },
  featureTitle: { fontFamily: font.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.text },
  featureFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  featurePrice: { fontFamily: font.semibold, fontSize: 17, color: colors.accent },
  buyButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: colors.accent },

  payRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.md, paddingVertical: space.sm },
  payIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  payText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.text },

  bubble: { width: 78, alignItems: 'center', gap: space.xs },
  ring: { padding: 3, borderRadius: 40, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.accent },
  bubbleName: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: colors.text, textAlign: 'center' },
});
