import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getArtist, getRelease, getTrack, tracksForRelease } from '../api';
import { Art } from '../components/Art';
import { PayWithPicker, usePayWith } from '../components/checkout/PayWith';
import { AmountRow, Receipt, ReceiptDivider } from '../components/checkout/Receipt';
import { KeptAsCredit, ResultState, StillWaiting, WaitingForPin } from '../components/checkout/ResultState';
import { Button, EmptyState, FormScrollView } from '../components/ui';
import { useCheckout } from '../hooks/useCheckout';
import { amountDue, formatUGX, splitRelease, splitSale } from '../lib/money';
import { colors, radius, space, type } from '../lib/theme';
import { useWallet } from '../store/wallet';

export default function Buy() {
  const { kind, id } = useLocalSearchParams<{ kind: 'track' | 'release'; id: string }>();
  const credit = useWallet((s) => s.balance);
  const payWith = usePayWith();
  const checkout = useCheckout();

  const track = kind === 'track' ? getTrack(id) : undefined;
  const release = getRelease(kind === 'release' ? id : track?.releaseId ?? '');
  const artist = release ? getArtist(release.artistId) : undefined;
  if (!release || !artist || (kind === 'track' && !track)) {
    return <EmptyState icon="alert-circle-outline" title="Item not found" body="Go back and try again." />;
  }

  const price = track ? track.priceUGX : release.priceUGX;
  const title = track ? track.title : release.title;
  const what = track ? 'Song' : release.type;
  const split = track ? splitSale(price, track.writers) : splitRelease(price, tracksForRelease(release.id));
  const due = amountDue(price, credit);
  const needsPhone = due.toPay > 0;
  const extra = due.fromCredit + due.toPay - price; // collected above the price because of the mobile money minimum

  const pay = () => {
    if (needsPhone && !payWith.payWith) return checkout.setError('Enter a valid MTN or Airtel number, like 0772 123456.');
    void checkout.pay({ kind: track ? 'TRACK' : 'RELEASE', id: track ? track.id : release.id }, needsPhone ? payWith.payWith : null);
  };
  const close = () => router.back();

  if (checkout.stage === 'waiting') return <WaitingForPin pay={payWith.payWith} amount={checkout.order?.collectUgx ?? due.toPay} />;
  if (checkout.stage === 'slow') return <StillWaiting what={`${title} is added to your music`} onDone={close} />;
  if (checkout.stage === 'credited') {
    return <KeptAsCredit reason={checkout.order?.failureMessage ?? null} credit={checkout.order?.creditUgx ?? 0} onDone={close} />;
  }
  if (checkout.stage === 'done') {
    return (
      <ResultState icon="checkmark" tone="lime" title="It’s yours" art={<Art seed={release.id} colors={release.colors} size={148} />}
        body={`${title} is in your music, yours to keep. ${formatUGX(split.artist)} went to ${artist.name}.`}>
        <Button label="Go to my music" onPress={() => { router.dismissAll(); router.push('/(tabs)/library'); }} />
        <Button label="Keep browsing" variant="ghost" onPress={close} />
      </ResultState>
    );
  }

  return (
    <FormScrollView contentContainerStyle={styles.content}>
      <View style={styles.item}>
        <Art seed={release.id} colors={release.colors} size={72} />
        <View style={styles.flex}>
          <Text style={type.heading} numberOfLines={2}>{title}</Text>
          <Text style={type.small} numberOfLines={2}>{what} by {artist.name}</Text>
        </View>
        <Text style={type.heading}>{formatUGX(price)}</Text>
      </View>

      {needsPhone ? <PayWithPicker state={payWith} /> : null}

      <Receipt title="Where your money goes">
        <AmountRow label={artist.name} value={split.artist} />
        <AmountRow label="Songwriters (incl. UPRS)" value={split.uprs + split.songwritersDirect} />
        <AmountRow label="Deegee" value={split.platform} />
        <ReceiptDivider />
        <AmountRow label="Total" value={price} strong />
        {due.fromCredit > 0 ? <AmountRow label="Paid from your Deegee credit" value={-due.fromCredit} muted /> : null}
        {due.fromCredit > 0 && needsPhone ? <AmountRow label="To pay now" value={due.toPay} strong /> : null}
        {extra > 0 ? (
          <Text style={[type.small, styles.note]}>
            Mobile money can’t take less than {formatUGX(due.toPay)}. The extra {formatUGX(extra)} stays as Deegee credit for your next purchase.
          </Text>
        ) : null}
      </Receipt>

      {checkout.error ? <Text accessibilityRole="alert" style={[type.body, styles.error]}>{checkout.error}</Text> : null}

      <View style={styles.footer}>
        <Button label={needsPhone ? `Pay ${formatUGX(due.toPay)}` : 'Pay with Deegee credit'} icon="lock-closed" onPress={pay} loading={checkout.busy} />
        <View style={styles.secure}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
          <Text style={[type.small, styles.flex]}>
            {needsPhone ? 'You approve the payment with your PIN on your own phone. Buy once, keep forever.' : 'Buy once, keep forever.'}
          </Text>
        </View>
      </View>
    </FormScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  item: { flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md },
  flex: { flex: 1 },
  note: { marginTop: space.sm },
  error: { color: colors.danger },
  footer: { gap: space.md },
  secure: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', paddingHorizontal: space.xs },
});
