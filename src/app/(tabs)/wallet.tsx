import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState } from '../../components/ui';
import { formatUGX } from '../../lib/money';
import { colors, radius, space, type } from '../../lib/theme';
import { useWallet } from '../../store/wallet';

export default function Wallet() {
  const balance = useWallet((s) => s.balance);
  const txs = useWallet((s) => s.txs);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <Text style={[type.title, { marginBottom: space.lg }]}>Wallet</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, borderWidth: 1, borderColor: colors.border }}>
          <Text style={type.label}>Balance</Text>
          <Text style={[type.display, { fontSize: 38, marginVertical: space.sm }]}>{formatUGX(balance)}</Text>
          <Text style={type.small}>Top up with MTN MoMo or Airtel Money, then buy songs in one tap.</Text>
          <Button label="Top up" icon="add" onPress={() => router.push('/topup')} style={{ marginTop: space.lg }} />
        </View>

        <Text style={[type.heading, { marginTop: space.xl, marginBottom: space.sm }]}>History</Text>
        {txs.length === 0 ? <EmptyState icon="receipt-outline" title="No activity yet" body="Top-ups and purchases will show here." /> : null}
        {txs.map((t) => {
          const positive = t.amount > 0;
          return (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised }}>
                <Ionicons name={t.kind === 'TOPUP' ? 'arrow-down' : 'musical-note'} size={16} color={positive ? colors.success : colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[type.body, { fontWeight: '600' }]}>{t.kind === 'TOPUP' ? 'Top up' : t.label}</Text>
                <Text numberOfLines={1} style={type.small}>
                  {t.kind === 'TOPUP' ? `${t.label} · ` : ''}{new Date(t.at).toLocaleString()}
                  {t.status === 'PENDING' ? ' · waiting for PIN' : t.status === 'FAILED' ? ' · failed' : ''}
                </Text>
              </View>
              <Text style={{ fontWeight: '700', color: t.status === 'FAILED' ? colors.danger : positive ? colors.success : colors.text }}>
                {positive ? '+' : '−'}{formatUGX(Math.abs(t.amount)).replace('UGX ', '')}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
