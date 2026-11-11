import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRelease, listArtists, listReleases, releasesInGenre, tracksForRelease } from '../../api';
import { Avatar } from '../../components/profile/Avatar';
import { FeaturedDrop } from '../../components/home/FeaturedDrop';
import { QuickPickGrid } from '../../components/home/QuickPickGrid';
import { ArtistCard, Chip, ReleaseCard, Shelf } from '../../components/ui';
import { formatUGX } from '../../lib/money';
import { colors, font, layout, radius, space, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

const FILTERS = ['All', 'Exclusives', 'New', 'Owned'] as const;
type Filter = (typeof FILTERS)[number];

export default function Home() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('All');
  const balance = useWallet((s) => s.balance);
  const owned = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const currentRelease = usePlayer((s) => s.current()?.releaseId);
  const isPlaying = usePlayer((s) => s.isPlaying);

  const releases = listReleases();
  const featured = releases.find((r) => r.exclusive) ?? releases[0];
  const visible = releases.filter((r) => {
    if (filter === 'Exclusives') return r.exclusive;
    if (filter === 'New') return r.year >= 2026;
    if (filter === 'Owned') return tracksForRelease(r.id).some((t) => owned.includes(t.id));
    return true;
  });

  const playRelease = (id: string) => {
    if (currentRelease === id) return toggle();
    if (getRelease(id)) playQueue(tracksForRelease(id).map((t) => t.id), 0, owns);
  };

  return (
    <View style={styles.screen}>
      {/* Soft blue wash behind the top of Home. */}
      <LinearGradient colors={[withAlpha(colors.accent, 0.22), colors.bg]} style={styles.wash} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.wordmark}>Deegee</Text>
          <Pressable onPress={() => router.push('/(tabs)/wallet')} accessibilityLabel={`Wallet balance ${formatUGX(balance)}`} style={styles.balance}>
            <Text style={styles.balanceText}>{formatUGX(balance)}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Your profile and settings" hitSlop={6}>
            <Avatar />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />)}
        </ScrollView>

        <QuickPickGrid releases={visible} playingReleaseId={isPlaying ? currentRelease : undefined} onPlay={playRelease} />

        <FeaturedDrop release={featured} playing={currentRelease === featured.id && isPlaying} onPlay={() => playRelease(featured.id)} />

        <Shelf title="New releases">
          {releases.map((r) => <ReleaseCard key={r.id} release={r} />)}
        </Shelf>

        <Shelf title="Artists to support" subtitle="Buy direct, they get paid to their phone">
          {listArtists().map((a) => <ArtistCard key={a.id} artist={a} />)}
        </Shelf>

        <Shelf title="Kadongo Kamu & storytellers">
          {[...releasesInGenre('Kadongo Kamu'), ...releasesInGenre('Hip Hop')].map((r) => <ReleaseCard key={r.id} release={r} />)}
        </Shelf>

        <Shelf title="Sunday praise">
          {[...releasesInGenre('Gospel'), ...releasesInGenre('Zouk')].map((r) => <ReleaseCard key={r.id} release={r} />)}
        </Shelf>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  wash: { position: 'absolute', left: 0, right: 0, top: 0, height: 360 },
  content: { paddingBottom: layout.tabScreenBottom },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.md },
  wordmark: { flex: 1, fontFamily: font.display, fontSize: 30, letterSpacing: -1, color: colors.text },
  balance: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  balanceText: { fontFamily: font.bold, color: colors.text, fontSize: 13 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, marginTop: space.lg },
});
