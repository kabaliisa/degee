import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '../components/ui';
import { TERMS, formatUGX } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { guessProvider, normalizeUgPhone } from '../lib/phone';
import { useWallet, type Provider } from '../store/wallet';

const PRESETS = [2000, 5000, 10000, 20000];

export default function TopUp() {
  const params = useLocalSearchParams<{ amount?: string }>();
  const topUp = useWallet((s) => s.topUp);
  const [amount, setAmount] = useState(params.amount ?? '5000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<Provider>('MTN MoMo');
  const [stage, setStage] = useState<'form' | 'waiting' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);

  const value = parseInt(amount.replace(/\D/g, '') || '0', 10);
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
    if (value < TERMS.minTopUp) return setError(`Minimum top up is ${formatUGX(TERMS.minTopUp)}.`);
    setStage('waiting');
    try {
      const tx = await topUp(value, provider, e164);
      setStage(tx.status === 'COMPLETED' ? 'done' : 'form');
      if (tx.status !== 'COMPLETED') setError('Payment was not approved. Try again.');
    } catch (e) {
      setStage('form');
      setError((e as Error).message);
    }
  };

  if (stage !== 'form') {
    const waiting = stage === 'waiting';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }}>
        <Ionicons name={waiting ? 'phone-portrait-outline' : 'checkmark-circle'} size={64} color={waiting ? colors.accent : colors.success} />
        <Text style={type.title}>{waiting ? 'Check your phone' : 'Money added'}</Text>
        <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>
          {waiting
            ? `Approve the ${provider} prompt for ${formatUGX(value)} on ${e164} by entering your PIN.`
            : `${formatUGX(value)} was added to your wallet.`}
        </Text>
        {!waiting ? <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space.lg }} /> : null}
        <Text style={[type.small, { marginTop: space.xl }]}>Demo mode: payments are simulated.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={[type.smallBold, { marginBottom: space.sm }]}>Amount</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.lg }}>
          <Text style={[type.title, { color: colors.textMuted, marginRight: 6 }]}>UGX</Text>
          <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad"
            style={{ flex: 1, color: colors.text, fontSize: 28, fontFamily: font.display, paddingVertical: 14 }} accessibilityLabel="Amount in Ugandan shillings" />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          {PRESETS.map((p) => (
            <Pressable key={p} onPress={() => setAmount(String(p))}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: value === p ? colors.accent : colors.border }}>
              <Text style={{ color: value === p ? colors.accent : colors.text, fontFamily: font.semibold }}>{(p / 1000).toString()}k</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={[type.smallBold, { marginBottom: space.sm }]}>Pay with</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {(['MTN MoMo', 'Airtel Money'] as Provider[]).map((p) => {
            const on = provider === p;
            return (
              <Pressable key={p} onPress={() => setProvider(p)} accessibilityState={{ selected: on }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 2, borderColor: on ? colors.accent : 'transparent' }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p === 'MTN MoMo' ? colors.momo : colors.airtel }} />
                <Text style={{ color: colors.text, fontFamily: font.bold }}>{p}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[type.smallBold, { marginBottom: space.sm }]}>Mobile money number</Text>
        <TextInput value={phone} onChangeText={onPhone} placeholder="0772 123456" placeholderTextColor={colors.textFaint} keyboardType="phone-pad"
          style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, color: colors.text, fontSize: 18 }} accessibilityLabel="Mobile money number" />
      </View>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button label={`Add ${formatUGX(value)}`} onPress={submit} disabled={!value} />
      <Text style={[type.small, { textAlign: 'center' }]}>You'll get a prompt on your phone to approve with your PIN.</Text>
    </ScrollView>
  );
}
