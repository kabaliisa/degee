import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ResultState } from '../components/checkout/ResultState';
import { Button } from '../components/ui';
import { TERMS, formatUGX } from '../lib/money';
import { guessProvider, normalizeUgPhone, type Provider } from '../lib/phone';
import { colors, font, radius, space, type } from '../lib/theme';
import { useWallet } from '../store/wallet';

const PRESETS = [2000, 5000, 10000, 20000];
const PROVIDERS: { name: Provider; color: string }[] = [
  { name: 'MTN MoMo', color: colors.momo },
  { name: 'Airtel Money', color: colors.airtel },
];

type Stage = 'form' | 'waiting' | 'done';

export default function TopUp() {
  const params = useLocalSearchParams<{ amount?: string }>();
  const topUp = useWallet((s) => s.topUp);
  const [amount, setAmount] = useState(params.amount ?? '5000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<Provider>('MTN MoMo');
  const [stage, setStage] = useState<Stage>('form');
  const [error, setError] = useState<string | null>(null);

  const value = parseInt(amount || '0', 10);
  const e164 = normalizeUgPhone(phone);

  const onPhone = (v: string) => {
    setPhone(v);
    const n = normalizeUgPhone(v);
    const guess = n && guessProvider(n);
    if (guess) setProvider(guess);
  };

  const submit = async () => {
    setError(null);
    if (!e164) return setError('Enter a valid Ugandan mobile number, e.g. 0772 123456.');
    if (value < TERMS.minTopUp) return setError(`The smallest amount is ${formatUGX(TERMS.minTopUp)}.`);
    setStage('waiting');
    try {
      const tx = await topUp(value, provider, e164);
      setStage(tx.status === 'COMPLETED' ? 'done' : 'form');
      if (tx.status !== 'COMPLETED') setError('The payment was not approved. Try again.');
    } catch (e) {
      setStage('form');
      setError((e as Error).message);
    }
  };

  if (stage === 'waiting') {
    return <ResultState icon="phone-portrait-outline" title="Check your phone" footnote="Demo mode: payments are simulated."
      body={`Approve the ${provider} prompt for ${formatUGX(value)} on ${e164} by entering your PIN.`} />;
  }
  if (stage === 'done') {
    return (
      <ResultState icon="checkmark-circle" iconColor={colors.success} title="Money added" body={`${formatUGX(value)} was added to your wallet.`}
        footnote="Demo mode: payments are simulated.">
        <Button label="Done" onPress={() => router.back()} />
      </ResultState>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={[type.smallBold, styles.label]}>Amount</Text>
        <View style={styles.amountField}>
          <Text style={[type.title, styles.currency]}>UGX</Text>
          <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad"
            style={styles.amountInput} accessibilityLabel="Amount in Ugandan shillings" />
        </View>
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable key={p} onPress={() => setAmount(String(p))} accessibilityRole="button" accessibilityState={{ selected: value === p }}
              style={[styles.preset, value === p && styles.presetActive]}>
              <Text style={[styles.presetLabel, value === p && styles.presetLabelActive]}>{p / 1000}k</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={[type.smallBold, styles.label]}>Pay with</Text>
        <View style={styles.providers}>
          {PROVIDERS.map((p) => (
            <Pressable key={p.name} onPress={() => setProvider(p.name)} accessibilityRole="button" accessibilityState={{ selected: provider === p.name }}
              style={[styles.provider, provider === p.name && styles.providerActive]}>
              <View style={[styles.providerDot, { backgroundColor: p.color }]} />
              <Text style={styles.providerName}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={[type.smallBold, styles.label]}>Mobile money number</Text>
        <TextInput value={phone} onChangeText={onPhone} placeholder="0772 123456" placeholderTextColor={colors.textFaint} keyboardType="phone-pad"
          style={styles.phone} accessibilityLabel="Mobile money number" />
      </View>

      {error ? <Text style={[type.body, styles.error]}>{error}</Text> : null}
      <Button label={`Add ${formatUGX(value)}`} onPress={submit} disabled={!value} />
      <Text style={[type.small, styles.centered]}>You’ll get a prompt on your phone to approve with your PIN.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  label: { marginBottom: space.sm },
  amountField: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.lg },
  currency: { color: colors.textMuted, marginRight: 6 },
  amountInput: { flex: 1, color: colors.text, fontSize: 28, fontFamily: font.display, paddingVertical: 14 },
  presets: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  preset: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  presetActive: { borderColor: colors.accent },
  presetLabel: { color: colors.text, fontFamily: font.semibold },
  presetLabelActive: { color: colors.accent },
  providers: { flexDirection: 'row', gap: space.sm },
  provider: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 2, borderColor: 'transparent' },
  providerActive: { borderColor: colors.accent },
  providerDot: { width: 14, height: 14, borderRadius: 7 },
  providerName: { color: colors.text, fontFamily: font.bold },
  phone: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, color: colors.text, fontSize: 18, fontFamily: font.medium },
  error: { color: colors.danger },
  centered: { textAlign: 'center' },
});
