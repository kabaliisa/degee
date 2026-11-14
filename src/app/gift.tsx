import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getArtist } from '../api';
import { Art } from '../components/Art';
import { PayWithPicker, usePayWith } from '../components/checkout/PayWith';
import { AmountRow, Receipt } from '../components/checkout/Receipt';
import { KeptAsCredit, ResultState, StillWaiting, WaitingForPin } from '../components/checkout/ResultState';
import { Button, EmptyState, FormScrollView, tap } from '../components/ui';
import { useCheckout } from '../hooks/useCheckout';
import { TERMS, amountDue, formatUGX, splitGift } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { useWallet } from '../store/wallet';

const PRESETS = [1000, 2000, 5000, 10000];
const MAX_NOTE = 140;

export default function Gift() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const artist = getArtist(artistId);
  const credit = useWallet((s) => s.balance);
  const payWith = usePayWith();
  const checkout = useCheckout();
  const [amount, setAmount] = useState('2000');
  const [note, setNote] = useState('');
  if (!artist) return <EmptyState icon="person-outline" title="Artist not found" body="Go back and try again." />;

  const value = parseInt(amount || '0', 10);
  const tooBig = value > TERMS.maxPayment;
  const split = value >= TERMS.minGift && !tooBig ? splitGift(value) : null;
  const due = amountDue(value, credit);
  const needsPhone = due.toPay > 0;

  const send = () => {
    if (needsPhone && !payWith.payWith) return checkout.setError('Enter a valid MTN or Airtel number, like 0772 123456.');
    void checkout.pay({ kind: 'GIFT', id: artist.id, amountUgx: value, note: note.trim() || undefined }, needsPhone ? payWith.payWith : null);
  };
  const close = () => router.back();

  if (checkout.stage === 'waiting') return <WaitingForPin pay={payWith.payWith} amount={checkout.order?.collectUgx ?? due.toPay} />;
  if (checkout.stage === 'slow') return <StillWaiting what={`your gift goes to ${artist.name}`} onDone={close} />;
  if (checkout.stage === 'credited') {
    return <KeptAsCredit reason={checkout.order?.failureMessage ?? null} credit={checkout.order?.creditUgx ?? 0} onDone={close} />;
  }
  if (checkout.stage === 'done' && split) {
    return (
      <ResultState icon="gift" title="Gift sent" art={<Art seed={artist.id} colors={artist.colors} size={120} round />}
        body={`${formatUGX(split.artist)} is on its way to ${artist.name}.${note.trim() ? ' They’ll see your message too.' : ''}`}>
        <Button label="Done" onPress={close} />
      </ResultState>
    );
  }

  return (
    <FormScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Art seed={artist.id} colors={artist.colors} size={88} round />
        <Text style={type.title}>{artist.name}</Text>
        <Text style={[type.small, styles.centered]}>A gift is a thank-you, separate from buying music.</Text>
      </View>

      <View style={styles.block}>
        <Text style={type.heading}>Amount</Text>
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable key={p} onPress={() => { tap(); setAmount(String(p)); }} accessibilityRole="button" accessibilityLabel={formatUGX(p)}
              accessibilityState={{ selected: value === p }} style={[styles.preset, value === p && styles.presetOn]}>
              <Text style={[styles.presetLabel, value === p && styles.presetLabelOn]}>{p.toLocaleString('en-US')}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.amountField}>
          <Text style={styles.currency}>UGX</Text>
          <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, '').slice(0, 7))} keyboardType="number-pad"
            accessibilityLabel="Other amount in Ugandan shillings" style={styles.amountInput} />
        </View>
        {split ? null : (
          <Text style={[type.small, styles.error]}>
            {tooBig ? `The largest gift is ${formatUGX(TERMS.maxPayment)}.` : `The smallest gift is ${formatUGX(TERMS.minGift)}.`}
          </Text>
        )}
      </View>

      <View style={styles.block}>
        <Text style={type.heading}>Message (optional)</Text>
        <TextInput value={note} onChangeText={setNote} maxLength={MAX_NOTE} multiline placeholder={`Say something to ${artist.name}`}
          placeholderTextColor={colors.textFaint} style={styles.note} accessibilityLabel="Message to the artist" />
        <Text style={[type.tiny, styles.counter]}>{note.length}/{MAX_NOTE}</Text>
      </View>

      {needsPhone ? <PayWithPicker state={payWith} /> : null}

      {split ? (
        <Receipt>
          <AmountRow label={`${artist.name} gets`} value={split.artist} strong />
          <AmountRow label={`Deegee fee (${TERMS.giftPlatformPct}%)`} value={split.platform} muted />
          {due.fromCredit > 0 ? <AmountRow label="Paid from your Deegee credit" value={-due.fromCredit} muted /> : null}
        </Receipt>
      ) : null}

      {checkout.error ? <Text accessibilityRole="alert" style={[type.body, styles.error]}>{checkout.error}</Text> : null}

      <Button label={split ? (needsPhone ? `Send ${formatUGX(due.toPay)}` : 'Send with Deegee credit') : 'Send gift'} icon="gift"
        disabled={!split} loading={checkout.busy} onPress={send} />
    </FormScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  header: { alignItems: 'center', gap: space.sm },
  centered: { textAlign: 'center' },
  block: { gap: space.md },
  presets: { flexDirection: 'row', gap: space.sm },
  preset: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  presetOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  presetLabel: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  presetLabelOn: { color: '#FFFFFF' },
  amountField: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: space.lg },
  currency: { fontFamily: font.semibold, fontSize: 16, color: colors.textMuted, marginRight: 8 },
  amountInput: { flex: 1, minWidth: 0, color: colors.text, fontFamily: font.display, fontSize: 22, paddingVertical: 12 },
  note: { minHeight: 84, textAlignVertical: 'top', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: space.lg, color: colors.text, fontFamily: font.regular, fontSize: 15 },
  counter: { textAlign: 'right', marginTop: -space.sm, color: colors.textFaint },
  error: { color: colors.danger },
});
