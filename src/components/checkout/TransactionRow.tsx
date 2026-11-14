import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space, type } from '../../lib/theme';
import type { WalletTx } from '../../store/wallet';
import type { IconName } from '../ui';

function day(ts: number) {
  const d = new Date(ts);
  if (d.toDateString() === new Date().toDateString()) return 'Today';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const ICONS: Record<WalletTx['kind'], IconName> = { TOPUP: 'phone-portrait-outline', PURCHASE: 'musical-note', GIFT: 'gift-outline' };

function title(t: WalletTx) {
  if (t.kind === 'TOPUP') return 'Mobile money payment';
  if (t.kind === 'GIFT') return `Gift to ${t.label}`;
  return t.label;
}

function subtitle(t: WalletTx) {
  if (t.status === 'PENDING') return 'Waiting for your PIN';
  if (t.status === 'FAILED') return 'Not approved, nothing charged';
  return t.kind === 'TOPUP' && t.provider ? `${day(t.at)} · ${t.provider}` : day(t.at);
}

/** One line of purchase history. Mobile money payments show as money in; purchases and gifts as money out. */
export function TransactionRow({ tx, last }: { tx: WalletTx; last?: boolean }) {
  const paidIn = tx.kind === 'TOPUP';
  const failed = tx.status === 'FAILED';
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.icon}>
        <Ionicons name={ICONS[tx.kind]} size={20} color={colors.text} />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={type.bodyBold}>{title(tx)}</Text>
        <Text numberOfLines={1} style={[type.small, failed && styles.failedText]}>{subtitle(tx)}</Text>
      </View>
      <Text style={[styles.amount, paidIn && styles.amountIn, failed && styles.amountFailed]}>
        {paidIn ? '+' : '−'}{Math.abs(tx.amount).toLocaleString('en-US')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  flex: { flex: 1 },
  failedText: { color: colors.danger },
  amount: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  amountIn: { color: colors.success },
  amountFailed: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
