import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getArtist } from '../api';
import { Art } from '../components/Art';
import { AmountRow, Receipt } from '../components/checkout/Receipt';
import { ResultState } from '../components/checkout/ResultState';
import { Button, EmptyState } from '../components/ui';
import { TERMS, formatUGX, splitGift } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { useWallet } from '../store/wallet';

const PRESETS = [1000, 2000, 5000, 10000];
const MAX_NOTE = 140;

export default function Gift() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const artist = getArtist(artistId);
  const balance = useWallet((s) => s.balance);
  const sendGift = useWallet((s) => s.sendGift);
  const [amount, setAmount] = useState('2000');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!artist) return <EmptyState icon="person-outline" title="Artist not found" body="Go back and try again." />;

  const value = parseInt(amount || '0', 10);
  const split = value >= TERMS.minGift ? splitGift(value) : null;
  const shortBy = Math.max(0, value - balance);
  const topUpAmount = Math.max(shortBy, TERMS.minTopUp);

  const send = () => {
    setError(null);
    const res = sendGift(artist.id, value, note);
    if (res.ok) setSent(true);
    else if (res.reason === 'TOO_SMALL') setError(`The smallest gift is ${formatUGX(TERMS.minGift)}.`);
    else if (res.reason === 'INSUFFICIENT_FUNDS') setError(`You need ${formatUGX(res.shortBy ?? 0)} more in your wallet.`);
    else setError('The gift was not sent. Try again.');
  };

  if (sent && split) {
    return (
      <ResultState icon="gift" title="Gift sent"
        body={`${formatUGX(split.artist)} is on its way to ${artist.name}.${note.trim() ? ' They’ll see your message too.' : ''}`}>
        <Button label="Done" onPress={() => router.back()} />
      </ResultState>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Art seed={artist.id} colors={artist.colors} size={88} round />
        <Text style={type.title}>{artist.name}</Text>
        <Text style={[type.small, styles.centered]}>A gift is a thank-you, separate from buying music.</Text>
      </View>

      <View>
        <Text style={[type.smallBold, styles.label]}>Amount</Text>
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable key={p} onPress={() => setAmount(String(p))} accessibilityRole="button" accessibilityState={{ selected: value === p }}
              style={[styles.preset, value === p && styles.presetActive]}>
              <Text style={styles.presetLabel}>{p / 1000}k</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.amountField}>
          <Text style={[type.body, styles.currency]}>UGX</Text>
          <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad"
            accessibilityLabel="Other amount in Ugandan shillings" style={styles.amountInput} />
        </View>
      </View>

      <View>
        <Text style={[type.smallBold, styles.label]}>Message (optional)</Text>
        <TextInput value={note} onChangeText={setNote} maxLength={MAX_NOTE} multiline placeholder={`Say something to ${artist.name}`}
          placeholderTextColor={colors.textFaint} style={styles.note} accessibilityLabel="Message to the artist" />
        <Text style={[type.tiny, styles.counter]}>{note.length}/{MAX_NOTE}</Text>
      </View>

      {split ? (
        <Receipt>
          <AmountRow label={`${artist.name} gets`} value={split.artist} strong />
          <AmountRow label={`Deegee fee (${TERMS.giftPlatformPct}%)`} value={split.platform} muted />
          <AmountRow label="Wallet balance" value={balance} muted />
        </Receipt>
      ) : (
        <Text style={type.small}>The smallest gift is {formatUGX(TERMS.minGift)}.</Text>
      )}

      {error ? <Text style={[type.body, styles.error]}>{error}</Text> : null}

      {split && shortBy > 0 ? (
        <Button label={`Add ${formatUGX(topUpAmount)} to wallet`} icon="add"
          onPress={() => router.push({ pathname: '/topup', params: { amount: String(topUpAmount) } })} />
      ) : (
        <Button label={split ? `Send ${formatUGX(value)} gift` : 'Send gift'} icon="gift" disabled={!split} onPress={send} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.xl },
  header: { alignItems: 'center', gap: space.sm },
  centered: { textAlign: 'center' },
  label: { marginBottom: space.sm },
  presets: { flexDirection: 'row', gap: space.sm },
  preset: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  presetActive: { backgroundColor: colors.accent },
  presetLabel: { fontFamily: font.bold, color: colors.text },
  amountField: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.lg },
  currency: { color: colors.textMuted, marginRight: 6 },
  amountInput: { flex: 1, color: colors.text, fontFamily: font.bold, fontSize: 18, paddingVertical: 12 },
  note: { minHeight: 80, textAlignVertical: 'top', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, color: colors.text, fontFamily: font.regular, fontSize: 15 },
  counter: { textAlign: 'right', marginTop: 4, color: colors.textFaint },
  error: { color: colors.danger },
});
