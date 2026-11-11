import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Art } from '../../components/Art';
import { Avatar } from '../../components/Avatar';
import { ArtistCard, Chip, Equalizer, PlayButton, ReleaseCard, Shelf } from '../../components/ui';
import { artists, getArtist, releases, tracksForRelease, type Genre } from '../../data/catalog';
import { formatUGX } from '../../lib/money';
import { colors, font, radius, space, type, withAlpha } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

const FILTERS = ['All', 'Exclusives', 'New', 'Owned'] as const;

export default function Home() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const balance = useWallet((s) => s.balance);
  const owned = useWallet((s) => s.ownedTracks);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const currentRelease = usePlayer((s) => s.current()?.releaseId);
  const isPlaying = usePlayer((s) => s.isPlaying);

  const featured = releases.find((r) => r.exclusive) ?? releases[0];
  const featuredArtist = getArtist(featured.artistId)!;
  const visible = releases.filter((r) =>
    filter === 'Exclusives' ? r.exclusive : filter === 'New' ? r.year >= 2026 : filter === 'Owned' ? tracksForRelease(r.id).some((t) => owned.includes(t.id)) : true);

  const playRelease = (id: string) => {
    if (currentRelease === id) return toggle();
    const ids = tracksForRelease(id).map((t) => t.id);
    playQueue(ids, 0, owns);
  };

  const byGenre = (g: Genre) => releases.filter((r) => getArtist(r.artistId)?.genres.includes(g));

  return (
    <View style={{ flex: 1 }}>
      {/* Soft blue wash behind the top of Home. */}
      <LinearGradient colors={[withAlpha(colors.accent, 0.22), colors.bg]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 360 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: 170 }}>
        {/* Just the brand: wordmark left, wallet and profile right. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.md }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: font.display, fontSize: 30, letterSpacing: -1, color: colors.text }}>Deegee</Text>
          <Pressable onPress={() => router.push('/(tabs)/wallet')} accessibilityLabel={`Wallet balance ${formatUGX(balance)}`}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised }}>
            <Text style={{ fontFamily: font.bold, color: colors.text, fontSize: 13 }}>{formatUGX(balance)}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Your profile and settings" hitSlop={6}>
            <Avatar />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg, marginTop: space.lg }}>
          {FILTERS.map((f) => <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />)}
        </ScrollView>

        {/* Quick-pick grid: two columns of compact tiles. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg - 4, marginTop: space.lg }}>
          {visible.slice(0, 6).map((r) => {
            const playing = currentRelease === r.id && isPlaying;
            return (
              <View key={r.id} style={{ width: '50%', padding: 4 }}>
                <Pressable onPress={() => router.push(`/release/${r.id}`)} onLongPress={() => playRelease(r.id)}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: pressed ? colors.surfacePress : colors.surfaceRaised })}>
                  <Art seed={r.id} colors={r.colors} size={56} style={{ borderRadius: 0 }} />
                  <Text numberOfLines={2} style={{ flex: 1, paddingHorizontal: space.sm, fontFamily: font.bold, fontSize: 13, color: colors.text }}>{r.title}</Text>
                  {playing ? <View style={{ paddingRight: space.sm }}><Equalizer playing /></View> : null}
                </Pressable>
              </View>
            );
          })}
          {visible.length === 0 ? <Text style={[type.small, { padding: space.sm }]}>Nothing here yet. Songs you buy show up under Owned.</Text> : null}
        </View>

        {/* Featured drop: the one big moment on Home. */}
        <View style={{ marginHorizontal: space.lg, marginTop: space.xl }}>
          <Text style={type.small}>New from {featuredArtist.name}</Text>
          <Text style={[type.heading, { marginBottom: space.md }]}>Only on Deegee</Text>
          <Pressable onPress={() => router.push(`/release/${featured.id}`)}
            style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface }}>
            <View style={{ flexDirection: 'row', gap: space.lg, padding: space.lg }}>
              <Art seed={featured.id} colors={featured.colors} size={120} />
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                <View>
                  <Text style={type.title} numberOfLines={2}>{featured.title}</Text>
                  <Text style={type.small}>{featured.type} · {featuredArtist.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: font.bold, color: colors.text }}>{formatUGX(featured.priceUGX)}</Text>
                  <PlayButton size={44} playing={currentRelease === featured.id && isPlaying} onPress={() => playRelease(featured.id)} />
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        <Shelf title="New releases">
          {releases.map((r) => <ReleaseCard key={r.id} release={r} />)}
        </Shelf>

        <Shelf title="Artists to support" subtitle="Buy direct, they get paid to their phone">
          {artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
        </Shelf>

        <Shelf title="Kadongo Kamu & storytellers">
          {byGenre('Kadongo Kamu').concat(byGenre('Hip Hop')).map((r) => <ReleaseCard key={r.id} release={r} />)}
        </Shelf>

        <Shelf title="Sunday praise">
          {byGenre('Gospel').concat(byGenre('Zouk')).map((r) => <ReleaseCard key={r.id} release={r} />)}
        </Shelf>
      </ScrollView>
    </View>
  );
}
