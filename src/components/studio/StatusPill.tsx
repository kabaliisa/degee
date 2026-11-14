import { StyleSheet, Text, View } from 'react-native';
import type { ArtistStatus, ReleaseStatus, WithdrawalStatus } from '../../api/studio';
import { colors, font, radius } from '../../lib/theme';

type Status = ArtistStatus | ReleaseStatus | WithdrawalStatus;

// Lime means live or done; grey means waiting; red means it needs the artist's attention.
const LOOK: Record<Status, { label: string; tone: 'good' | 'grey' | 'red' }> = {
  DRAFT: { label: 'Draft', tone: 'grey' },
  IN_REVIEW: { label: 'In review', tone: 'grey' },
  PUBLISHED: { label: 'Live', tone: 'good' },
  REJECTED: { label: 'Needs changes', tone: 'red' },
  PENDING: { label: 'Waiting for approval', tone: 'grey' },
  ACTIVE: { label: 'Approved', tone: 'good' },
  REQUESTED: { label: 'Being checked', tone: 'grey' },
  SENT: { label: 'Sending', tone: 'grey' },
  COMPLETED: { label: 'Paid', tone: 'good' },
  FAILED: { label: 'Failed, money returned', tone: 'red' },
};

export function StatusPill({ status, withdrawal }: { status: Status; withdrawal?: boolean }) {
  const look = withdrawal && status === 'REJECTED' ? { label: 'Declined, money returned', tone: 'red' as const } : LOOK[status];
  const { label, tone } = look;
  return (
    <View style={[styles.pill, tone === 'good' && styles.good, tone === 'red' && styles.red]}>
      <Text style={[styles.label, tone === 'good' && styles.labelGood, tone === 'red' && styles.labelRed]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  good: { backgroundColor: colors.lime },
  red: { backgroundColor: colors.danger },
  label: { fontFamily: font.bold, fontSize: 12, color: colors.textMuted },
  labelGood: { color: colors.limeInk },
  labelRed: { color: '#FFFFFF' },
});
