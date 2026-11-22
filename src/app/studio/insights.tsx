import { StyleSheet, Text, View } from 'react-native';
import { getInsights, type Insights, type InsightsDay } from '../../api/studio';
import { EmptyState, FormScrollView } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatUGX } from '../../lib/money';
import { colors, font, radius, space, type, withAlpha } from '../../lib/theme';

export default function InsightsScreen() {
  const { data, error } = useLoad(getInsights);
  if (!data) {
    return error ? <EmptyState icon="alert-circle-outline" title="Couldn’t load your numbers" body={error} /> : null;
  }
  return <Numbers insights={data} />;
}

function Numbers({ insights }: { insights: Insights }) {
  const { earnedAllTimeUgx, earnedLast30Ugx, daily, supporters, topSupporters, topSongs } = insights;
  const nothingYet = earnedAllTimeUgx === 0 && supporters === 0;
  return (
    <FormScrollView contentContainerStyle={styles.content}>
      <View style={styles.totals}>
        <Total label="Earned, all time" value={formatUGX(earnedAllTimeUgx)} big />
        <View style={styles.pair}>
          <Total label="Last 30 days" value={formatUGX(earnedLast30Ugx)} />
          <Total label="Supporters" value={String(supporters)} />
        </View>
      </View>

      {nothingYet ? (
        <Text style={styles.empty}>
          Nothing has sold yet. When someone buys a song or sends you a gift, it shows here the moment
          the money lands.
        </Text>
      ) : null}

      <Section title="Last 30 days" />
      <Bars days={daily} />

      {topSupporters.length ? (
        <>
          <Section title="Your biggest supporters" />
          {topSupporters.map((s, i) => (
            <View key={`${s.name}-${i}`} style={styles.row}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {s.songs > 0 ? `${s.songs} ${s.songs === 1 ? 'song' : 'songs'}` : 'No songs yet'}
                  {s.giftedUgx > 0 ? ` · ${formatUGX(s.giftedUgx)} in gifts` : ''}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {topSongs.length ? (
        <>
          <Section title="What people are buying" />
          {topSongs.map((song, i) => (
            <View key={song.trackId} style={styles.row}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.rowSub}>
                  {song.buyers} {song.buyers === 1 ? 'person owns it' : 'people own it'}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.footnote}>
        Only you and Deegee can see these numbers. Fans see how many people own a release, never what
        anyone earns.
      </Text>
    </FormScrollView>
  );
}

function Total({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={[styles.total, big && styles.totalBig]}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={[styles.totalValue, big && styles.totalValueBig]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

/**
 * Thirty days as thirty bars. Deliberately not a line chart: a month of mobile money sales is a
 * handful of spikes with nothing between them, and a line drawn through that invents a slope where
 * there were simply no sales.
 */
function Bars({ days }: { days: InsightsDay[] }) {
  const peak = Math.max(1, ...days.map((d) => d.ugx));
  const best = days.find((d) => d.ugx === peak && peak > 0);
  return (
    <View>
      <View style={styles.chart}>
        {days.map((d) => (
          <View key={d.date} style={styles.slot}>
            <View style={[styles.bar, { height: `${Math.max(d.ugx > 0 ? 6 : 2, (d.ugx / peak) * 100)}%` }, d.ugx === 0 && styles.barEmpty]} />
          </View>
        ))}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{dayLabel(days[0]?.date)}</Text>
        <Text style={styles.axisText}>
          {best ? `Best day ${formatUGX(peak)}` : 'No sales yet'}
        </Text>
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
  totals: { gap: space.sm },
  pair: { flexDirection: 'row', gap: space.sm },
  total: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: 2 },
  totalBig: { backgroundColor: colors.surfaceRaised },
  totalLabel: { ...type.small, color: colors.textMuted },
  totalValue: { fontFamily: font.display, fontSize: 20, lineHeight: 27, color: colors.text },
  totalValueBig: { fontSize: 31, lineHeight: 38, color: colors.accentText },
  empty: { ...type.body, color: colors.textMuted, marginTop: space.md },
  section: { ...type.heading, color: colors.text, marginTop: space.xl, marginBottom: space.sm },

  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 2, backgroundColor: colors.accent, minHeight: 2 },
  barEmpty: { backgroundColor: withAlpha(colors.text, 0.08) },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  axisText: { ...type.tiny, color: colors.textFaint },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  rank: { ...type.smallBold, color: colors.textFaint, width: 16 },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: { ...type.bodyBold, color: colors.text },
  rowSub: { ...type.small, color: colors.textMuted },
  footnote: { ...type.small, color: colors.textFaint, marginTop: space.xl },
});
