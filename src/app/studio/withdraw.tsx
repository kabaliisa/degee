import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getEarnings, withdraw, type Earnings, type Withdrawal } from '../../api/studio';
import { ResultState } from '../../components/checkout/ResultState';
import { ErrorText, Field, SectionTitle, digits } from '../../components/studio/Form';
import { StatusPill } from '../../components/studio/StatusPill';
import { Button, EmptyState, FormScrollView } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { newIdempotencyKey } from '../../lib/ids';
import { formatUGX } from '../../lib/money';
import { formatPhone } from '../../lib/phone';
import { colors, space, type } from '../../lib/theme';

const PROVIDER_NAMES: Record<string, string> = { MTN_MOMO: 'MTN MoMo', AIRTEL_MONEY: 'Airtel Money' };

export default function Withdraw() {
  const { data, error } = useLoad(getEarnings);
  if (!data) return error ? <EmptyState icon="alert-circle-outline" title="Couldn’t load your earnings" body={error} /> : null;
  return <WithdrawForm earnings={data} />;
}

function WithdrawForm({ earnings }: { earnings: Earnings }) {
  const [amount, setAmount] = useState(String(earnings.availableUgx));
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Withdrawal | null>(null);
  const value = Number(amount || 0);
  const to = earnings.payoutPhone ? `${formatPhone(earnings.payoutPhone)} (${PROVIDER_NAMES[earnings.payoutProvider ?? ''] ?? 'mobile money'})` : '';

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      setResult(await withdraw(value, idempotencyKey));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (result) {
    const firstTime = result.status === 'REQUESTED';
    return (
      <ResultState icon="checkmark-circle" title={firstTime ? 'Withdrawal requested' : 'On its way'} footnote="Test mode: no real money moves."
        body={firstTime
          ? `We check every artist’s first withdrawal. ${formatUGX(result.amountUgx)} will be sent to ${to}, usually within a day.`
          : `${formatUGX(result.amountUgx)} is being sent to ${to}.`}>
        <Button label="Done" onPress={() => router.back()} />
      </ResultState>
    );
  }

  const tooSmall = value < earnings.minWithdrawalUgx;
  const tooBig = value > earnings.availableUgx;
  return (
    <FormScrollView contentContainerStyle={styles.content}>
      <View>
        <Text style={type.small}>Ready to withdraw</Text>
        <Text style={type.display}>{formatUGX(earnings.availableUgx)}</Text>
      </View>
      <Field label="Amount" prefix="UGX" value={amount} onChangeText={(v) => setAmount(digits(v))} keyboardType="number-pad"
        hint={earnings.availableUgx < earnings.minWithdrawalUgx
          ? `You can withdraw once you have ${formatUGX(earnings.minWithdrawalUgx)} ready.`
          : `From ${formatUGX(earnings.minWithdrawalUgx)} up to ${formatUGX(earnings.availableUgx)}.`} />
      <View>
        <Text style={type.smallBold}>Sent to</Text>
        <Text style={type.body}>{to}</Text>
      </View>
      <ErrorText message={error} />
      <Button label={`Withdraw ${formatUGX(value)}`} icon="arrow-up" onPress={send} loading={busy} disabled={tooSmall || tooBig} />

      {earnings.withdrawals.length > 0 ? (
        <>
          <SectionTitle>Past withdrawals</SectionTitle>
          {earnings.withdrawals.map((w) => (
            <View key={w.id} style={styles.row}>
              <View style={styles.flex}>
                <Text style={type.bodyBold}>{formatUGX(w.amountUgx)}</Text>
                <Text style={type.small}>{new Date(w.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
                {w.reviewNote ? <Text style={[type.small, styles.danger]}>{w.reviewNote}</Text> : null}
              </View>
              <StatusPill status={w.status} withdrawal />
            </View>
          ))}
        </>
      ) : null}
    </FormScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  flex: { flex: 1, gap: 2 },
  danger: { color: colors.danger },
});
