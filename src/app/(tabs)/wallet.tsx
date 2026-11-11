import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState } from '../../components/ui';
import { TransactionRow } from '../../components/wallet/TransactionRow';
import { formatUGX } from '../../lib/money';
import { colors, layout, radius, space, type } from '../../lib/theme';
import { sentToArtists, useWallet } from '../../store/wallet';

const RINGS = [220, 160, 100];

export default function Wallet() {
  const insets = useSafeAreaInsets();
  const balance = useWallet((s) => s.balance);
  const txs = useWallet((s) => s.txs);
  const sent = sentToArtists(txs);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]}>
      <Text style={[type.display, styles.title]}>Wallet</Text>

      <LinearGradient colors={[colors.surfaceRaised, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Drum-skin rings as a quiet watermark. */}
        {RINGS.map((s) => (
          <View key={s} style={[styles.ring, { right: -s / 3, top: -s / 3, width: s, height: s, borderRadius: s / 2 }]} />
        ))}
        <Text style={[type.smallBold, styles.muted]}>Balance</Text>
        <Text style={[type.hero, styles.balance]}>{formatUGX(balance)}</Text>
        <Text style={[type.small, styles.note]}>
          {sent ? `${formatUGX(sent)} sent to artists so far` : 'Add money once, then buy songs in one tap.'}
        </Text>
        <Button label="Add money" icon="add" onPress={() => router.push('/topup')} style={styles.addMoney} />
        <View style={styles.providers}>
          <Text style={[type.tiny, styles.muted]}>MTN MoMo</Text>
          <Text style={[type.tiny, styles.muted]}>Airtel Money</Text>
        </View>
      </LinearGradient>

      <Text style={[type.heading, styles.activityTitle]}>Activity</Text>
      {txs.length === 0 ? <EmptyState icon="receipt-outline" title="No activity yet" body="Money you add and songs you buy will show here." /> : null}
      {txs.map((t) => <TransactionRow key={t.id} tx={t} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingBottom: layout.tabScreenBottom },
  title: { marginBottom: space.lg },
  card: { borderRadius: radius.lg, padding: space.xl, overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: 14, borderColor: colors.accent, opacity: 0.12 },
  muted: { color: colors.textMuted },
  balance: { marginTop: 2 },
  note: { marginTop: space.xs },
  addMoney: { marginTop: space.xl },
  providers: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  activityTitle: { marginTop: space.xl, marginBottom: space.sm },
});
