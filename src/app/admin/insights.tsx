import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAdminInsights, owedUgx, type AdminDay, type AdminFloat, type AdminInsights } from '../../api/admin';
import { EmptyState, FormScrollView } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatUGX } from '../../lib/money';
import { colors, font, radius, space, type, withAlpha } from '../../lib/theme';

export default function AdminInsightsScreen() {
  const { data, error } = useLoad(getAdminInsights);
  if (!data) {
    return error ? <EmptyState icon="alert-circle-outline" title="Couldn’t load the numbers" body={error} /> : null;
  }
  return <Numbers insights={data} />;
}

function Numbers({ insights }: { insights: AdminInsights }) {
  const { held, money, daily, people, topArtists } = insights;
  return (
    <FormScrollView contentContainerStyle={styles.content}>
      <Held held={held} />

      <Card label="Deegee’s cut, 30 days" value={formatUGX(money.revenueUgx)} big />
      <View style={styles.cards}>
        <Card label="Sold through, 30 days" value={formatUGX(money.soldThroughUgx)} />
        <Card label="Topped up, 30 days" value={formatUGX(money.toppedUpUgx)} />
      </View>

      <Section title="Sold through, day by day" />
      <Bars days={daily} />

      <View style={styles.cards}>
        <Card label="Fans" value={String(people.fans)} note={`${people.buyers} bought something`} />
        <Card label="Artists live" value={String(people.artistsLive)} note={`${people.earning} have earned`} />
      </View>
      <Pressable style={styles.queue} onPress={() => router.push('/admin')}>
        <Text style={styles.queueLabel}>
          {people.waiting === 0
            ? 'Nothing waiting for review'
            : `${people.waiting} ${people.waiting === 1 ? 'thing' : 'things'} waiting for review`}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Pressable>

      {topArtists.length ? (
        <>
          <Section title="Artists earning most, 30 days" />
          {topArtists.map((a, i) => (
            <View key={a.artistId} style={styles.row}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Text style={styles.rowTitle} numberOfLines={1}>{a.name}</Text>
              <Text style={styles.rowValue}>
                {formatUGX(a.earnedUgx)} · {a.sales} {a.sales === 1 ? 'sale' : 'sales'}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.footnote}>
        Admins only. Artists see their own numbers in the studio, never another artist’s.
      </Text>
    </FormScrollView>
  );
}

/**
 * The float goes first, ahead of revenue. The figure that can sink Deegee is not what it earned but
 * whether the mobile money balance matches what the ledger says is owed: topped-up wallets and
 * unwithdrawn earnings are other people's shillings. A gap here is a bug or a missing payment, and
 * it should be the first thing an admin sees rather than something an artist discovers when a
 * withdrawal bounces.
 */
function Held({ held }: { held: AdminFloat }) {
  const balanced = held.gapUgx === 0;
  const owed = owedUgx(held);
  return (
    <View style={styles.held}>
      <Text style={styles.heldTitle}>Money you are holding</Text>
      <Line label="In fan wallets" ugx={held.walletsUgx} />
      <Line label="Artist earnings, not withdrawn" ugx={held.artistEarningsUgx} />
      <Line label="Withdrawals in flight" ugx={held.payoutsInFlightUgx} />
      <Line label="Owed to UPRS" ugx={held.uprsUgx} />
      <Line label="Owed to songwriters" ugx={held.songwritersUgx} />
      <Line label="Not yours" ugx={owed} strong />
      <Line label="Deegee’s own revenue" ugx={held.platformRevenueUgx} />
      <View style={styles.check}>
        <Ionicons
          name={balanced ? 'checkmark-circle' : 'alert-circle'}
          size={16}
          color={balanced ? colors.success : colors.danger}
        />
        <Text style={[styles.checkText, !balanced && styles.checkBad]}>
          {balanced
            ? `Ledger balances. Mobile money should hold ${formatUGX(held.cashUgx)}.`
            : `Off by ${formatUGX(Math.abs(held.gapUgx))}. Ledger says ${formatUGX(owed + held.platformRevenueUgx)}, cash in is ${formatUGX(held.cashUgx)}.`}
        </Text>
      </View>
    </View>
  );
}

function Line({ label, ugx, strong }: { label: string; ugx: number; strong?: boolean }) {
  return (
    <View style={[styles.line, strong && styles.lineStrong]}>
      <Text style={[styles.lineLabel, strong && styles.lineBold]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineBold]}>{formatUGX(ugx)}</Text>
    </View>
  );
}

function Card({ label, value, note, big }: { label: string; value: string; note?: string; big?: boolean }) {
  return (
    <View style={[styles.card, big && styles.cardBig]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, big && styles.cardValueBig]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {note ? <Text style={styles.cardNote}>{note}</Text> : null}
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

/** Bars, not a line, for the same reason as an artist's own chart: the quiet days are the shape. */
function Bars({ days }: { days: AdminDay[] }) {
  const peak = Math.max(1, ...days.map((d) => d.ugx));
  const any = days.some((d) => d.ugx > 0);
  return (
    <View>
      <View style={styles.chart}>
        {days.map((d) => (
          <View key={d.date} style={styles.slot}>
            <View
              style={[
                styles.bar,
                { height: `${Math.max(d.ugx > 0 ? 6 : 2, (d.ugx / peak) * 100)}%` },
                d.ugx === 0 && styles.barEmpty,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{dayLabel(days[0]?.date)}</Text>
        <Text style={styles.axisText}>{any ? `Best day ${formatUGX(peak)}` : 'Nothing yet'}</Text>
        <Text style={styles.axisText}>Today</Text>
      </View>
    </View>
  );
}

function dayLabel(iso?: string): string {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1];
  return `${Number(d)} ${month ?? ''}`.trim();
}

const styles = StyleSheet.create({
  // Capped: a row of figures whose label and value sit a screen apart is no longer a pair.
  content: { padding: space.lg, paddingBottom: space.xxl, width: '100%', maxWidth: 880, alignSelf: 'center' },
  held: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg },
  heldTitle: { ...type.small, color: colors.textMuted, marginBottom: space.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 3 },
  lineStrong: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: space.xs, paddingTop: space.sm },
  lineLabel: { ...type.small, color: colors.textMuted, flexShrink: 1 },
  lineValue: { ...type.small, color: colors.text, fontVariant: ['tabular-nums'] },
  lineBold: { ...type.smallBold, color: colors.text },
  check: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: space.sm, paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  checkText: { ...type.small, color: colors.textMuted, flex: 1 },
  checkBad: { color: colors.danger },

  cards: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  card: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: 2, marginTop: space.sm },
  cardBig: { backgroundColor: colors.surfaceRaised, padding: space.lg, marginTop: space.md },
  cardLabel: { ...type.tiny, color: colors.textMuted },
  cardValue: { fontFamily: font.display, fontSize: 20, lineHeight: 27, color: colors.text },
  cardValueBig: { fontSize: 31, lineHeight: 38, color: colors.accentText },
  cardNote: { ...type.tiny, color: colors.textFaint },
  queue: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, marginTop: space.sm,
  },
  queueLabel: { ...type.small, color: colors.text, flexShrink: 1 },

  section: { ...type.heading, color: colors.text, marginTop: space.xl, marginBottom: space.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 2, backgroundColor: colors.accent, minHeight: 2 },
  barEmpty: { backgroundColor: withAlpha(colors.text, 0.08) },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  axisText: { ...type.tiny, color: colors.textFaint },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  rank: { ...type.smallBold, color: colors.textFaint, width: 16 },
  rowTitle: { ...type.bodyBold, color: colors.text, flex: 1, minWidth: 0 },
  rowValue: { ...type.small, color: colors.textMuted, fontVariant: ['tabular-nums'], flexShrink: 0 },
  footnote: { ...type.small, color: colors.textFaint, marginTop: space.xl },
});
