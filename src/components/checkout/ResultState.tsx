import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { PayWith } from '../../api/checkout';
import { formatUGX } from '../../lib/money';
import { formatPhone } from '../../lib/phone';
import { colors, space, type, withAlpha } from '../../lib/theme';
import { Button, type IconName } from '../ui';

type Tone = 'coral' | 'lime' | 'grey';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  coral: { bg: withAlpha(colors.accent, 0.12), fg: colors.accent },
  lime: { bg: colors.lime, fg: colors.limeInk },
  grey: { bg: colors.surfaceRaised, fg: colors.textMuted },
};

/** Full-screen confirmation or waiting state used by checkout, gifts and withdrawals. */
export function ResultState({ icon, tone = 'coral', title, body, children, footnote, art }: {
  icon: IconName; tone?: Tone; title: string; body: string; children?: ReactNode; footnote?: string;
  /** Shown in place of the icon, e.g. the cover of what was just bought. */
  art?: ReactNode;
}) {
  const look = TONES[tone];
  return (
    <View style={styles.wrap}>
      {art ?? (
        <View style={[styles.badge, { backgroundColor: look.bg }]}>
          <Ionicons name={icon} size={40} color={look.fg} />
        </View>
      )}
      <Text style={[type.display, styles.centered]}>{title}</Text>
      <Text style={[type.body, styles.body]}>{body}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
      {footnote ? <Text style={[type.small, styles.footnote]}>{footnote}</Text> : null}
    </View>
  );
}

const TEST_MODE = 'Test mode: no real money moves.';

/** The PIN prompt is on their phone. */
export function WaitingForPin({ pay, amount }: { pay: PayWith | null; amount: number }) {
  return (
    <ResultState icon="phone-portrait-outline" title="Check your phone" footnote={TEST_MODE}
      body={pay
        ? `Approve the ${pay.provider} prompt for ${formatUGX(amount)} on ${formatPhone(pay.phone)} by entering your PIN. Deegee never sees your PIN.`
        : 'Approve the prompt on your phone by entering your PIN.'}>
      <ActivityIndicator color={colors.accent} />
    </ResultState>
  );
}

/** Two minutes passed with no answer. Approving later still completes it. */
export function StillWaiting({ what, onDone }: { what: string; onDone: () => void }) {
  return (
    <ResultState icon="time-outline" tone="grey" title="Still waiting" footnote={TEST_MODE}
      body={`We haven’t heard back from your mobile money provider yet. If you approve the prompt, ${what}. If you don’t, nothing is charged.`}>
      <Button label="Done" onPress={onDone} />
    </ResultState>
  );
}

/** The payment arrived but the order couldn't be completed, so the money is kept for them. */
export function KeptAsCredit({ reason, credit, onDone }: { reason: string | null; credit: number; onDone: () => void }) {
  return (
    <ResultState icon="shield-checkmark-outline" tone="lime" title="Your money is safe"
      body={`${reason ?? 'We couldn’t finish this.'} Your payment is saved as ${formatUGX(credit)} of Deegee credit, and it comes off the next thing you buy.`}>
      <Button label="Done" onPress={onDone} />
    </ResultState>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  badge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  centered: { textAlign: 'center' },
  body: { color: colors.textMuted, textAlign: 'center', maxWidth: 340 },
  actions: { alignSelf: 'stretch', marginTop: space.lg, gap: space.sm },
  footnote: { marginTop: space.xl, color: colors.textFaint },
});
