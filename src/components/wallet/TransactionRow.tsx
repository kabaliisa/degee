import { Ionicons } from '@expo/vector-icons';
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
  if (t.kind === 'TOPUP') return 'Added money';
  if (t.kind === 'GIFT') return `Gift to ${t.label}`;
  return t.label;
}

function subtitle(t: WalletTx) {
  if (t.status === 'PENDING') return 'Waiting for your PIN';
  if (t.status === 'FAILED') return 'Not approved';
  return t.kind === 'TOPUP' && t.provider ? `${day(t.at)} · ${t.provider}` : day(t.at);
}

export function TransactionRow({ tx }: { tx: WalletTx }) {
  const isTopUp = tx.kind === 'TOPUP';
  const failed = tx.status === 'FAILED';
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name={ICONS[tx.kind]} size={20} color={isTopUp ? colors.accent : colors.text} />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={type.body}>{title(tx)}</Text>
        <Text numberOfLines={1} style={[type.small, failed && styles.failedText]}>{subtitle(tx)}</Text>
      </View>
      <Text style={[styles.amount, isTopUp && styles.amountIn, failed && styles.amountFailed]}>
        {isTopUp ? '+' : '−'}{Math.abs(tx.amount).toLocaleString('en-US')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  icon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  flex: { flex: 1 },
  failedText: { color: colors.danger },
  amount: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  amountIn: { color: colors.success },
  amountFailed: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
