import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TransactionRow } from '../components/checkout/TransactionRow';
import { Button, EmptyState } from '../components/ui';
import { formatUGX } from '../lib/money';
import { colors, radius, space, type } from '../lib/theme';
import { sentToArtists, useWallet } from '../store/wallet';

/** Everything this account has paid for, newest first, and any Deegee credit it is holding. */
export default function Activity() {
  const credit = useWallet((s) => s.balance);
  const all = useWallet((s) => s.txs);
  const spent = sentToArtists(all);
  // A payment that went through shows as the thing it paid for; only unfinished or declined payments get their own line.
  const txs = all.filter((t) => t.kind !== 'TOPUP' || t.status !== 'COMPLETED');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {credit > 0 ? (
        <View style={styles.credit}>
          <Ionicons name="shield-checkmark" size={22} color={colors.limeInk} />
          <View style={styles.flex}>
            <Text style={type.bodyBold}>{formatUGX(credit)} Deegee credit</Text>
            <Text style={[type.small, styles.creditText]}>It comes off the next thing you buy or gift.</Text>
          </View>
        </View>
      ) : null}

      {txs.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Nothing bought yet" body="Songs you buy and gifts you send are listed here."
          action={<Button label="Find music" onPress={() => { router.dismissAll(); router.push('/(tabs)/search'); }} style={styles.action} />} />
      ) : (
        <>
          <Text style={type.small}>{formatUGX(spent)} spent on music and gifts</Text>
          <View style={styles.list}>
            {txs.map((t, i) => <TransactionRow key={t.id} tx={t} last={i === txs.length - 1} />)}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  flex: { flex: 1 },
  credit: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.lime, borderRadius: radius.lg, padding: space.lg },
  creditText: { color: colors.limeInk },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg },
  action: { marginTop: space.md },
});
