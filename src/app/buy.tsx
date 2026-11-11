import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Art } from '../components/Art';
import { Button, EmptyState } from '../components/ui';
import { getArtist, getRelease, getTrack, tracksForRelease } from '../data/catalog';
import { formatUGX, splitSale, type SaleSplit } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { useWallet } from '../store/wallet';

function addSplits(a: SaleSplit, b: SaleSplit): SaleSplit {
  return { total: a.total + b.total, uprs: a.uprs + b.uprs, songwritersDirect: a.songwritersDirect + b.songwritersDirect, artist: a.artist + b.artist, platform: a.platform + b.platform };
}

export default function Buy() {
  const { kind, id } = useLocalSearchParams<{ kind: 'track' | 'release'; id: string }>();
  const balance = useWallet((s) => s.balance);
  const buyTrack = useWallet((s) => s.buyTrack);
  const buyRelease = useWallet((s) => s.buyRelease);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const track = kind === 'track' ? getTrack(id) : undefined;
  const release = getRelease(kind === 'release' ? id : track?.releaseId ?? '');
  if (!release || (kind === 'track' && !track)) return <EmptyState icon="alert-circle-outline" title="Item not found" body="Go back and try again." />;

  const artist = getArtist(release.artistId)!;
  const price = track ? track.priceUGX : release.priceUGX;
  const title = track ? track.title : `${release.title} (${release.type})`;

  // Show where the money goes. For a release, spread its price across tracks by their list prices.
  let split: SaleSplit;
  if (track) split = splitSale(price, track.writers);
  else {
    const list = tracksForRelease(release.id);
    const listTotal = list.reduce((s, t) => s + t.priceUGX, 0);
    let remaining = price;
    split = list.reduce<SaleSplit>((acc, t, i) => {
      const part = i === list.length - 1 ? remaining : Math.floor((price * t.priceUGX) / listTotal);
      remaining -= part;
      return addSplits(acc, splitSale(part, t.writers));
    }, { total: 0, uprs: 0, songwritersDirect: 0, artist: 0, platform: 0 });
  }
  const songwriters = split.uprs + split.songwritersDirect;
  const shortBy = Math.max(0, price - balance);

  const confirm = () => {
    const res = track ? buyTrack(track.id) : buyRelease(release.id);
    if (res.ok) setDone(true);
    else if (res.reason === 'INSUFFICIENT_FUNDS') setError(`You need ${formatUGX(res.shortBy ?? 0)} more.`);
    else if (res.reason === 'ALREADY_OWNED') setError('You already own this.');
    else setError('Something went wrong. Try again.');
  };

  if (done) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        <Text style={type.title}>It's yours</Text>
        <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>
          {title} is in your library. {formatUGX(split.artist)} went to {artist.name}.
        </Text>
        <Button label="Go to library" onPress={() => { router.dismissAll(); router.push('/(tabs)/library'); }} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
        <Button label="Keep browsing" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const Row = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={[type.body, { color: strong ? colors.text : colors.textMuted, fontFamily: strong ? font.bold : font.regular }]}>{label}</Text>
      <Text style={[type.body, { fontFamily: strong ? font.bold : font.medium }]}>{formatUGX(value)}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <Art seed={release.id} colors={release.colors} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={type.heading} numberOfLines={2}>{title}</Text>
          <Text style={type.small}>{artist.name}</Text>
        </View>
        <Text style={[type.heading, { color: colors.accent }]}>{formatUGX(price)}</Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg }}>
        <Text style={[type.smallBold, { marginBottom: space.sm }]}>Where your money goes</Text>
        <Row label={artist.name} value={split.artist} />
        <Row label="Songwriters (incl. UPRS)" value={songwriters} />
        <Row label="Deegee" value={split.platform} />
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.sm }} />
        <Row label="Total" value={price} strong />
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg }}>
        <Row label="Wallet balance" value={balance} />
        {shortBy > 0 ? <Text style={[type.small, { color: colors.danger, marginTop: space.xs }]}>You need {formatUGX(shortBy)} more. Add money with mobile money first.</Text> : <Row label="After purchase" value={balance - price} />}
      </View>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      {shortBy > 0 ? (
        <Button label={`Add ${formatUGX(Math.max(shortBy, 1000))}`} icon="add" onPress={() => router.push({ pathname: '/topup', params: { amount: String(Math.max(shortBy, 1000)) } })} />
      ) : (
        <Button label={`Pay ${formatUGX(price)}`} icon="lock-closed" onPress={confirm} />
      )}
      <Text style={[type.small, { textAlign: 'center' }]}>Buy once, keep forever. Play in full any time in your library.</Text>
    </ScrollView>
  );
}
