import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState } from '../../components/ui';
import { formatUGX } from '../../lib/money';
import { colors, font, radius, space, type } from '../../lib/theme';
import { useWallet } from '../../store/wallet';

function day(ts: number) {
  const d = new Date(ts), today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function Wallet() {
  const insets = useSafeAreaInsets();
  const balance = useWallet((s) => s.balance);
  const txs = useWallet((s) => s.txs);
  const spent = txs.filter((t) => t.kind === 'PURCHASE').reduce((s, t) => s - t.amount, 0);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: 170 }}>
      <Text style={[type.display, { marginBottom: space.lg }]}>Wallet</Text>

      <LinearGradient colors={['#3B2350', '#24152F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.lg, padding: space.xl, overflow: 'hidden' }}>
        {/* Drum-skin rings as a quiet watermark. */}
        {[220, 160, 100].map((s) => (
          <View key={s} style={{ position: 'absolute', right: -s / 3, top: -s / 3, width: s, height: s, borderRadius: s / 2, borderWidth: 14, borderColor: colors.accent, opacity: 0.08 }} />
        ))}
        <Text style={[type.smallBold, { color: colors.textMuted }]}>Balance</Text>
        <Text style={[type.hero, { marginTop: 2 }]}>{formatUGX(balance)}</Text>
        <Text style={[type.small, { marginTop: space.xs }]}>{spent ? `${formatUGX(spent)} sent to artists so far` : 'Add money once, then buy songs in one tap.'}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xl }}>
          <Button label="Add money" icon="add" onPress={() => router.push('/topup')} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.md }}>
          <Text style={[type.tiny, { color: colors.textMuted }]}>MTN MoMo</Text>
          <Text style={[type.tiny, { color: colors.textMuted }]}>Airtel Money</Text>
        </View>
      </LinearGradient>

      <Text style={[type.heading, { marginTop: space.xl, marginBottom: space.sm }]}>Activity</Text>
      {txs.length === 0 ? <EmptyState icon="receipt-outline" title="No activity yet" body="Money you add and songs you buy will show here." /> : null}
      {txs.map((t) => {
        const isTopUp = t.kind === 'TOPUP';
        const pending = t.status === 'PENDING', failed = t.status === 'FAILED';
        return (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised }}>
              <Ionicons name={isTopUp ? 'phone-portrait-outline' : 'musical-note'} size={20} color={isTopUp ? colors.accent : colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={type.body}>{isTopUp ? 'Added money' : t.label}</Text>
              <Text numberOfLines={1} style={[type.small, failed && { color: colors.danger }]}>
                {pending ? 'Waiting for your PIN' : failed ? 'Not approved' : `${day(t.at)}${isTopUp ? ` · ${t.label.split(' · ')[0]}` : ''}`}
              </Text>
            </View>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: failed ? colors.textFaint : isTopUp ? colors.success : colors.text, textDecorationLine: failed ? 'line-through' : 'none' }}>
              {isTopUp ? '+' : '−'}{Math.abs(t.amount).toLocaleString('en-US')}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
