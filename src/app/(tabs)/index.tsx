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
import { Button, ReleaseCard, SectionHeading, Shelf, StatusBarStrip } from '../../components/ui';
import { askToSignIn } from '../../lib/auth';
import { formatUGX } from '../../lib/money';
import { hasPhoto } from '../../lib/photos';
import { colors, fadeStops, font, layout, radius, space, type, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useSignedIn } from '../../store/session';
import { useWallet } from '../../store/wallet';
import { artistHref } from '../../lib/slug';
import { useLayout } from '../../lib/breakpoints';
import { SIDEBAR_WIDTH } from '../../components/nav/Sidebar';

/** Ssalongo Beats. Change the id to change who leads the app. */
const HEADLINE_ARTIST = 'a2';

export default function Home() {
  const [heroScrolledAway, setHeroScrolledAway] = useState(false);
  const owned = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const currentRelease = usePlayer((s) => s.current()?.releaseId);
  const isPlaying = usePlayer((s) => s.isPlaying);

  const releases = listReleases();
  // Deegee launches with nothing in it, so this is not a rare edge: until the first artist
  // publishes, it is the only home screen anybody sees. It gets a real page rather than a guard,
  // because a visitor who arrives to a blank screen does not come back to check later.
  if (releases.length === 0) return <NothingYet />;
  // The hero is a photograph the width of the screen, so it leads with a release we actually have a
  // picture for. Generated art earns its place on a shelf tile; stretched across the top of the app
  // it only announces that there is no photograph.
  const withPhoto = releases.filter((r) => hasPhoto(r.id) || hasPhoto(r.artistId));
  // Whoever is being put in front of the house this week. Editorial, not computed -- and the first
  // thing to move to the server once there is somebody deciding it rather than a constant here.
  const headline = withPhoto.find((r) => r.artistId === HEADLINE_ARTIST);
  const featured = headline ?? withPhoto.find((r) => r.exclusive) ?? withPhoto[0]
    ?? releases.find((r) => r.exclusive) ?? releases[0];
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
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(e) => setHeroScrolledAway(e.nativeEvent.contentOffset.y > 40)}
      >
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

/**
 * The artist put forward today, running the full width with the greeting over the top of them.
 *
 * The header reads as near-solid black that the photograph emerges from, rather than a photograph with
 * a bar laid on it: the scrim is held opaque only for the height of the greeting, then falls away over
 * a long ramp with enough stops that there is no edge to find. Nothing darkens the middle of the frame,
 * so the face keeps its light. A second scrim at the foot carries the picture into the page.
 *
 * The height is taken from the window rather than fixed, so the hero is the same shape on an SE as on a
 * 16 Pro instead of swallowing the smaller screen.
 */
function Hero({ release, playing, onPlay }: { release: Release; playing: boolean; onPlay: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const { wide } = useLayout();
  const artist = getArtist(release.artistId);
  // On a wide screen the hero turns on its side: a banner with the photograph held to the right and
  // the words in the clear space beside it. Keeping the phone's full-bleed square would push the
  // subject off the bottom of a short, broad window and leave the top half empty.
  if (wide) return <WideHero release={release} artist={artist} playing={playing} onPlay={onPlay} />;
  const height = insets.top + Math.min(Math.max(windowHeight * 0.54, 380), 490);
  // The photograph is the background of the whole hero: it starts at the top of the screen, behind
  // the status bar and the wordmark, rather than below them. Before this it began under the header
  // and left a band of flat black above it that belonged to neither the words nor the picture.
  const artSize = Math.max(width, height) * 1.15;
  const bottomFade = fadeStops(colors.bg);
  const openArtist = () => (artist ? router.push(artistHref(artist)) : undefined);
  return (
    <View style={[styles.hero, { height }]}>
      {artist ? <Art seed={artist.id} size={artSize} style={styles.heroArt} /> : null}
      {/* The bottom scrim runs the other way: transparent at the top of the range, solid where the
          picture meets the shelves below it. */}
      <LinearGradient
        colors={[...bottomFade.colors].reverse() as [string, string, ...string[]]} locations={bottomFade.locations}
        style={styles.heroBottomFade} pointerEvents="none"
      />
      <View style={[styles.heroTop, { paddingTop: insets.top + space.md }]}>
        <GreetingBar />
      </View>
      <View style={styles.heroBody}>
        <View style={styles.featuredPill}>
          <Text style={styles.featuredText}>Featured artist</Text>
        </View>
        <Pressable onPress={openArtist} accessibilityRole="link" accessibilityLabel={`${release.title} by ${artist?.name}`}>
          <Text numberOfLines={2} style={styles.heroTitle}>{release.title}</Text>
          <Text numberOfLines={1} style={styles.heroArtist}>{artist?.name.toUpperCase()}</Text>
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

/**
 * The hero as a banner. The photograph sits to the right under a fade that runs sideways rather
 * than down, so the words have flat colour to sit on and the picture still reaches the edge.
 */
/**
 * The home screen before there is any music. It has one job: say what Deegee is to somebody who
 * arrived from a link, and give the only person who can change the situation -- an artist -- a way
 * in. It deliberately does not apologise or say "check back soon"; there is nothing to come back
 * for until somebody uploads.
 */
function NothingYet() {
  const signedIn = useSignedIn();
  return (
    <ScrollView contentContainerStyle={styles.nothing}>
      <Text style={styles.nothingMark} accessibilityRole="header">deegee</Text>
      <Text style={styles.nothingLead}>Buy music straight from Ugandan artists.</Text>
      <Text style={styles.nothingBody}>
        No streaming pennies and no middleman: you pay in shillings over mobile money, the artist
        keeps almost all of it, and the song is yours to keep and play offline.
      </Text>
      <View style={styles.nothingRule} />
      <Text style={styles.nothingTitle}>Nobody has put anything up yet</Text>
      <Text style={styles.nothingBody}>
        Deegee is open and empty. The first artist on it gets the whole front page.
      </Text>
      <Button
        label={signedIn ? 'Put your music up' : 'Sign in and put your music up'}
        onPress={() => (signedIn ? router.push('/studio/apply') : askToSignIn('/studio/apply'))}
      />
    </ScrollView>
  );
}

function WideHero({ release, artist, playing, onPlay }: { release: Release; artist?: Artist; playing: boolean; onPlay: () => void }) {
  const { width } = useLayout();
  const insets = useSafeAreaInsets();
  const height = 460;
  // Wide enough to cover from the middle of the banner to its right edge, and tall enough to crop
  // to a face rather than a full figure.
  const artSize = Math.max(height * 1.5, (width - SIDEBAR_WIDTH) * 0.62);
  const openArtist = () => (artist ? router.push(artistHref(artist)) : undefined);
  return (
    <View style={[styles.wideHero, { height }]}>
      {artist ? <Art seed={artist.id} size={artSize} style={styles.wideHeroArt} /> : null}
      {/* Sideways, so the left half is readable without dulling the photograph's own side. */}
      <LinearGradient
        colors={[colors.bg, withAlpha(colors.bg, 0.92), withAlpha(colors.bg, 0.3), withAlpha(colors.bg, 0)]}
        locations={[0, 0.34, 0.68, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill} pointerEvents="none"
      />
      <LinearGradient
        colors={[withAlpha(colors.bg, 0), colors.bg]} locations={[0, 1]}
        style={styles.wideHeroFoot} pointerEvents="none"
      />
      <View style={[styles.wideHeroTop, { paddingTop: insets.top + space.md }]}>
        <GreetingBar />
      </View>
      <View style={styles.wideHeroBody}>
        <View style={styles.featuredPill}>
          <Text style={styles.featuredText}>Featured artist</Text>
        </View>
        <Pressable onPress={openArtist} accessibilityRole="link" accessibilityLabel={`${release.title} by ${artist?.name}`}>
          <Text numberOfLines={2} style={styles.wideHeroTitle}>{release.title}</Text>
          <Text numberOfLines={1} style={styles.heroArtist}>{artist?.name.toUpperCase()}</Text>
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
      <View style={styles.kitenge} pointerEvents="none"><Kitenge size={120} /></View>
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

function ArtistBubble({ artist, backed }: { artist: Artist; backed: boolean }) {
  return (
    <Pressable onPress={() => router.push(artistHref(artist))} accessibilityRole="button"
      accessibilityLabel={backed ? `${artist.name}, you back this artist` : artist.name} style={styles.bubble}>
      <View style={[styles.ring, backed && styles.ringOn]}>
        <Art seed={artist.id} size={64} round />
      </View>
      <Text numberOfLines={2} style={styles.bubbleName}>{artist.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nothing: { paddingHorizontal: space.xl, paddingTop: 72, paddingBottom: space.xxl, gap: space.md, maxWidth: 520, width: '100%', alignSelf: 'center' },
  nothingMark: { fontFamily: font.display, fontSize: 34, lineHeight: 40, color: colors.accentText },
  nothingLead: { ...type.heading, color: colors.text },
  nothingBody: { ...type.small, color: colors.textMuted, lineHeight: 21 },
  nothingRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space.md },
  nothingTitle: { ...type.bodyBold, color: colors.text },
  screen: { flex: 1 },
  content: { paddingBottom: layout.tabScreenBottom },
  flex: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.85 },

  hero: { overflow: 'hidden', backgroundColor: colors.bg }, // edge to edge: the photograph is the header
  wideHero: { overflow: 'hidden', backgroundColor: colors.bg, justifyContent: 'center' },
  wideHeroArt: { position: 'absolute', right: 0, top: '50%', transform: [{ translateY: '-50%' }], borderRadius: 0 },
  wideHeroFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  wideHeroTop: { position: 'absolute', left: 0, right: 0, top: 0 },
  wideHeroBody: { position: 'absolute', left: space.xl, bottom: space.xl, maxWidth: 520, gap: space.sm },
  wideHeroTitle: { fontFamily: font.display, fontSize: 44, lineHeight: 50, letterSpacing: -1.2, color: colors.text },
  heroArt: { position: 'absolute', right: 0, top: 0, borderRadius: 0 },
  heroBottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '56%' },
  heroTop: { position: 'absolute', left: 0, right: 0, top: 0 },
  heroBody: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.lg, gap: space.sm },
  featuredPill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  featuredText: { fontFamily: font.medium, fontSize: 12, color: colors.accent },
  heroTitle: { fontFamily: font.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: colors.text },
  heroArtist: { fontFamily: font.medium, fontSize: 12, letterSpacing: 3, color: colors.text, marginTop: 6 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  goldButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 46, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.accent },
  goldButtonText: { fontFamily: font.semibold, fontSize: 15, color: colors.accentInk },
  heroPlay: { width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.text, 0.16) },

  section: { marginTop: space.xl },
  row: { gap: space.md, paddingHorizontal: space.lg },

  kitenge: { position: 'absolute', top: 0, right: 0 },
  feature: { flexDirection: 'row', gap: space.md, marginHorizontal: space.lg, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  featureArt: { borderRadius: radius.md },
  featureBody: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 2 },
  featureTitle: { fontFamily: font.display, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: colors.text },
  featureFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  featurePrice: { fontFamily: font.semibold, fontSize: 17, color: colors.accent },
  buyButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: colors.accent },


  bubble: { width: 78, alignItems: 'center', gap: space.xs },
  ring: { padding: 3, borderRadius: 40, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.accent },
  bubbleName: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: colors.text, textAlign: 'center' },
});
