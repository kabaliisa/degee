import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatUGX } from '../../lib/money';
import { colors, font, radius, space, type } from '../../lib/theme';

/** A rounded panel of amount rows, optionally with a small heading. */
export function Receipt({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.panel}>
      {title ? <Text style={[type.smallBold, styles.title]}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function AmountRow({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[type.body, styles.label, strong && styles.strong, muted && styles.muted]}>{label}</Text>
      <Text style={[type.body, styles.value, strong && styles.strong, muted && styles.muted]}>{formatUGX(value)}</Text>
    </View>
  );
}

export const ReceiptDivider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg },
  title: { marginBottom: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: colors.textMuted, fontFamily: font.regular },
  value: { fontFamily: font.medium },
  strong: { color: colors.text, fontFamily: font.bold },
  muted: { color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.sm },
});
