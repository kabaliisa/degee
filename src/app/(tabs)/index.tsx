import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cover, ReleaseCard, SectionTitle, TrackRow } from '../../components/ui';
import { artists, releases, tracks, type Genre } from '../../data/catalog';
import { formatUGX } from '../../lib/money';
import { colors, radius, space, type } from '../../lib/theme';
import { usePlayer } from '../../store/player';
import { useWallet } from '../../store/wallet';

const GENRES: Genre[] = ['Afrobeat', 'Kadongo Kamu', 'Dancehall', 'Gospel', 'Zouk', 'Hip Hop'];

export default function Discover() {
  const balance = useWallet((s) => s.balance);
  const owns = useWallet((s) => s.owns);
  const playQueue = usePlayer((s) => s.playQueue);
  const currentId = usePlayer((s) => s.queue[s.index]);
  const exclusive = releases.find((r) => r.exclusive);
  const fresh = [...tracks].slice(0, 5);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.md }}>
          <Text style={[type.display, { color: colors.accent }]}>deegee</Text>
          <Pressable onPress={() => router.push('/(tabs)/wallet')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill }}>
            <Ionicons name="wallet" size={16} color={colors.accent} />
            <Text style={{ color: colors.text, fontWeight: '700' }}>{formatUGX(balance)}</Text>
          </Pressable>
        </View>
        <Text style={[type.small, { paddingHorizontal: space.lg, marginTop: space.xs }]}>Buy music straight from Ugandan artists.</Text>

        {exclusive ? (
          <Pressable onPress={() => router.push(`/release/${exclusive.id}`)} style={{ margin: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
            <Cover title={exclusive.title} colors={exclusive.colors} size={96} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.label, { color: colors.accent }]}>Deegee exclusive</Text>
              <Text style={type.title}>{exclusive.title}</Text>
              <Text style={type.small}>Only here, before anywhere else. {formatUGX(exclusive.priceUGX)}</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={{ paddingHorizontal: space.lg }}>
          <SectionTitle>New releases</SectionTitle>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.lg }}>
          {releases.map((r) => <ReleaseCard key={r.id} release={r} />)}
        </ScrollView>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <SectionTitle>Genres</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {GENRES.map((g) => (
              <Pressable key={g} onPress={() => router.push({ pathname: '/(tabs)/search', params: { q: g } })} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <SectionTitle>Artists</SectionTitle>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.lg }}>
          {artists.map((a) => (
            <Pressable key={a.id} onPress={() => router.push(`/artist/${a.id}`)} style={{ width: 92, alignItems: 'center' }}>
              <Cover title={a.name} colors={a.colors} size={84} style={{ borderRadius: 42 }} />
              <Text numberOfLines={1} style={[type.small, { color: colors.text, marginTop: space.sm, fontWeight: '600' }]}>{a.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <SectionTitle>Fresh tracks</SectionTitle>
        </View>
        {fresh.map((t, i) => (
          <TrackRow key={t.id} track={t} isCurrent={currentId === t.id}
            onPlay={() => playQueue(fresh.map((x) => x.id), i, owns)}
            onBuy={() => router.push({ pathname: '/buy', params: { kind: 'track', id: t.id } })} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
