import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getArtist, getRelease, getTrack, tracksForRelease } from '../api';
import { Art } from '../components/Art';
import { AmountRow, Receipt, ReceiptDivider } from '../components/checkout/Receipt';
import { ResultState } from '../components/checkout/ResultState';
import { Button, EmptyState } from '../components/ui';
import { TERMS, formatUGX, splitRelease, splitSale } from '../lib/money';
import { newIdempotencyKey } from '../lib/ids';
import { colors, space, type } from '../lib/theme';
import { useWallet, type PurchaseResult } from '../store/wallet';

function errorMessage(res: Exclude<PurchaseResult, { ok: true }>) {
  if (res.reason === 'INSUFFICIENT_FUNDS') return `You need ${formatUGX(res.shortBy ?? 0)} more.`;
  return res.message;
}

export default function Buy() {
  const { kind, id } = useLocalSearchParams<{ kind: 'track' | 'release'; id: string }>();
  const balance = useWallet((s) => s.balance);
  const buy = useWallet((s) => s.buy);
  const [idempotencyKey] = useState(newIdempotencyKey); // one per checkout, so retries never charge twice
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const track = kind === 'track' ? getTrack(id) : undefined;
  const release = getRelease(kind === 'release' ? id : track?.releaseId ?? '');
  const artist = release ? getArtist(release.artistId) : undefined;
  if (!release || !artist || (kind === 'track' && !track)) {
    return <EmptyState icon="alert-circle-outline" title="Item not found" body="Go back and try again." />;
  }

  const price = track ? track.priceUGX : release.priceUGX;
  const title = track ? track.title : `${release.title} (${release.type})`;
  const split = track ? splitSale(price, track.writers) : splitRelease(price, tracksForRelease(release.id));
  const shortBy = Math.max(0, price - balance);
  const topUpAmount = Math.max(shortBy, TERMS.minTopUp);

  const pay = async () => {
    setError(null);
    setPaying(true);
    const res = await buy(track ? 'TRACK' : 'RELEASE', track ? track.id : release.id, idempotencyKey);
    setPaying(false);
    if (res.ok) setDone(true);
    else setError(errorMessage(res));
  };

  if (done) {
    return (
      <ResultState icon="checkmark-circle" title="It’s yours" body={`${title} is in your library. ${formatUGX(split.artist)} went to ${artist.name}.`}>
        <Button label="Go to your music" onPress={() => { router.dismissAll(); router.push('/(tabs)/library'); }} />
        <Button label="Keep browsing" variant="ghost" onPress={() => router.back()} />
      </ResultState>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.item}>
        <Art seed={release.id} colors={release.colors} size={72} />
        <View style={styles.flex}>
          <Text style={type.heading} numberOfLines={2}>{title}</Text>
          <Text style={type.small}>{artist.name}</Text>
        </View>
        <Text style={[type.heading, styles.price]}>{formatUGX(price)}</Text>
      </View>

      <Receipt title="Where your money goes">
        <AmountRow label={artist.name} value={split.artist} />
        <AmountRow label="Songwriters (incl. UPRS)" value={split.uprs + split.songwritersDirect} />
        <AmountRow label="Deegee" value={split.platform} />
        <ReceiptDivider />
        <AmountRow label="Total" value={price} strong />
      </Receipt>

      <Receipt>
        <AmountRow label="Wallet balance" value={balance} />
        {shortBy > 0
          ? <Text style={[type.small, styles.error]}>You need {formatUGX(shortBy)} more. Add money with mobile money first.</Text>
          : <AmountRow label="After purchase" value={balance - price} />}
      </Receipt>

      {error ? <Text style={[type.body, styles.error]}>{error}</Text> : null}

      {shortBy > 0 ? (
        <Button label={`Add ${formatUGX(topUpAmount)}`} icon="add" onPress={() => router.push({ pathname: '/topup', params: { amount: String(topUpAmount) } })} />
      ) : (
        <Button label={`Pay ${formatUGX(price)}`} icon="lock-closed" onPress={pay} loading={paying} />
      )}
      <Text style={[type.small, styles.centered]}>Buy once, keep forever. Play in full any time in your library.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  item: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  flex: { flex: 1 },
  price: { color: colors.accent },
  error: { color: colors.danger, marginTop: space.xs },
  centered: { textAlign: 'center' },
});
