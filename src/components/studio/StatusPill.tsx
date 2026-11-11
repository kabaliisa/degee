import { StyleSheet, Text, View } from 'react-native';
import type { ArtistStatus, ReleaseStatus, WithdrawalStatus } from '../../api/studio';
import { colors, font, radius } from '../../lib/theme';

type Status = ArtistStatus | ReleaseStatus | WithdrawalStatus;

// Blue means live or done; grey means waiting; red means it needs the artist's attention.
const LOOK: Record<Status, { label: string; tone: 'blue' | 'grey' | 'red' }> = {
  DRAFT: { label: 'Draft', tone: 'grey' },
  IN_REVIEW: { label: 'In review', tone: 'grey' },
  PUBLISHED: { label: 'Live', tone: 'blue' },
  REJECTED: { label: 'Needs changes', tone: 'red' },
  PENDING: { label: 'Waiting for approval', tone: 'grey' },
  ACTIVE: { label: 'Approved', tone: 'blue' },
  REQUESTED: { label: 'Being checked', tone: 'grey' },
  SENT: { label: 'Sending', tone: 'grey' },
  COMPLETED: { label: 'Paid', tone: 'blue' },
  FAILED: { label: 'Failed, money returned', tone: 'red' },
};

export function StatusPill({ status, withdrawal }: { status: Status; withdrawal?: boolean }) {
  const look = withdrawal && status === 'REJECTED' ? { label: 'Declined, money returned', tone: 'red' as const } : LOOK[status];
  const { label, tone } = look;
  return (
    <View style={[styles.pill, tone === 'blue' && styles.blue, tone === 'red' && styles.red]}>
      <Text style={[styles.label, tone !== 'grey' && styles.labelStrong]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  blue: { backgroundColor: colors.accent },
  red: { backgroundColor: colors.danger },
  label: { fontFamily: font.semibold, fontSize: 12, color: colors.textMuted },
  labelStrong: { color: colors.accentInk },
});
