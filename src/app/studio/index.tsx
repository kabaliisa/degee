import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { mediaUrl } from '../../api/catalog';
import { getEarnings, getMyArtist, listMyReleases, type ArtistProfile, type Earnings, type StudioRelease } from '../../api/studio';
import { Art } from '../../components/Art';
import { SectionTitle } from '../../components/studio/Form';
import { StatusPill } from '../../components/studio/StatusPill';
import { Button, EmptyState } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatUGX } from '../../lib/money';
import { colors, font, onDark, radius, space, type, withAlpha } from '../../lib/theme';

type Studio = { artist: ArtistProfile | null; releases: StudioRelease[]; earnings: Earnings | null };

async function loadStudio(): Promise<Studio> {
  try {
    const artist = await getMyArtist();
    const [releases, earnings] = await Promise.all([listMyReleases(), getEarnings()]);
    return { artist, releases, earnings };
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NOT_AN_ARTIST') return { artist: null, releases: [], earnings: null };
    throw e;
  }
}

const unlockDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Artist mode home: approval status, money, and releases. */
export default function StudioHome() {
  const { data, error, loading, reload } = useLoad(loadStudio);

  if (loading) return null;
  if (!data) {
    return <EmptyState icon="cloud-offline-outline" title="Couldn’t open your studio" body={error ?? 'Try again.'}
      action={<Button label="Try again" onPress={reload} small />} />;
  }
  if (!data.artist) {
    return (
      <View style={styles.intro}>
        <View style={styles.introBadge}><Ionicons name="mic" size={36} color={colors.accent} /></View>
        <Text style={[type.display, styles.centered]}>Sell your music on Deegee</Text>
        <Text style={[type.body, styles.mutedCentered]}>Set your own prices. Fans pay with mobile money and you withdraw to your phone.</Text>
        <Button label="Apply as an artist" onPress={() => router.push('/studio/apply')} style={styles.stretch} />
      </View>
    );
  }

  const { artist, releases, earnings } = data;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Art seed={artist.id} colors={artist.colors} size={64} round photo={false} />
        <View style={styles.flex}>
          <Text style={type.title}>{artist.name}</Text>
          <StatusPill status={artist.status} />
        </View>
      </View>

      {artist.status !== 'ACTIVE' ? (
        <View style={styles.notice}>
          <Text style={type.bodyBold}>{artist.status === 'PENDING' ? 'We’re checking your profile' : 'Your application needs changes'}</Text>
          <Text style={[type.body, styles.muted]}>
            {artist.status === 'PENDING'
              ? 'You can prepare releases now. You’ll be able to send them for review once you’re approved.'
              : artist.reviewNote ?? 'Update your details and send it again.'}
          </Text>
          {artist.status === 'REJECTED' ? <Button small label="Update application" onPress={() => router.push('/studio/apply')} /> : null}
        </View>
      ) : null}

      {earnings && artist.status === 'ACTIVE' ? (
        <View style={styles.money}>
          <Text style={styles.moneyLabel}>Ready to withdraw</Text>
          <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>{formatUGX(earnings.availableUgx)}</Text>
          {earnings.heldUgx > 0 ? (
            <Text style={styles.moneyLabel}>
              + {formatUGX(earnings.heldUgx)} on hold{earnings.nextUnlockAt ? `, first part free on ${unlockDay(earnings.nextUnlockAt)}` : ''}
            </Text>
          ) : null}
          <View style={styles.moneyActions}>
            <Button label="Withdraw" icon="arrow-up" onPress={() => router.push('/studio/withdraw')}
              disabled={earnings.availableUgx < earnings.minWithdrawalUgx} style={styles.flexBtn} />
            <Button variant="onDark" label="New release" icon="add" onPress={() => router.push('/studio/new-release')} style={styles.flexBtn} />
          </View>
          {earnings.availableUgx < earnings.minWithdrawalUgx ? (
            <Text style={styles.moneyLabel}>You can withdraw from {formatUGX(earnings.minWithdrawalUgx)}.</Text>
          ) : null}
        </View>
      ) : null}

      <SectionTitle action={artist.status === 'ACTIVE' ? undefined
        : <Button small variant="outline" icon="add" label="New release" onPress={() => router.push('/studio/new-release')} />}>
        Your releases
      </SectionTitle>
      {releases.length === 0 ? (
        <EmptyState icon="disc-outline" title="No releases yet" body="Start with a single: one song, a cover and a price." />
      ) : (
        releases.map((r) => (
          <Pressable key={r.id} accessibilityLabel={`${r.title}, ${r.type}`} onPress={() => router.push({ pathname: '/studio/release/[id]', params: { id: r.id } })}
            accessibilityRole="button" style={({ pressed }) => [styles.release, pressed && styles.pressed]}>
            <Art seed={r.id} colors={r.colors} size={56} photo={false} uri={r.coverUrl ? mediaUrl(r.coverUrl) : null} />
            <View style={styles.flex}>
              <Text style={type.bodyBold} numberOfLines={1}>{r.title}</Text>
              <Text style={type.small}>{r.type} · {r.tracks.length} {r.tracks.length === 1 ? 'song' : 'songs'} · {formatUGX(r.priceUGX)}</Text>
            </View>
            <StatusPill status={r.status} />
          </Pressable>
        ))
      )}

      {earnings && earnings.activity.length > 0 ? (
        <>
          <SectionTitle>Money in and out</SectionTitle>
          <View style={styles.ledger}>
          {earnings.activity.slice(0, 10).map((line, i) => (
            <View key={line.id} style={[styles.line, i > 0 && styles.lineDivider]}>
              <Text style={[type.body, styles.flex]} numberOfLines={1}>{line.description}</Text>
              <Text style={[styles.amount, line.amountUgx > 0 && styles.amountIn]}>
                {line.amountUgx > 0 ? '+' : '−'}{Math.abs(line.amountUgx).toLocaleString('en-US')}
              </Text>
            </View>
          ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 3 },
  introBadge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.accent, 0.12) },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  centered: { textAlign: 'center' },
  mutedCentered: { textAlign: 'center', color: colors.textMuted },
  stretch: { alignSelf: 'stretch', marginTop: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1, gap: 4 },
  notice: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  muted: { color: colors.textMuted },
  money: { backgroundColor: colors.ink, borderRadius: radius.xl, padding: space.xl, gap: 4 },
  moneyLabel: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: onDark.textMuted },
  balance: { fontFamily: font.display, fontSize: 38, lineHeight: 44, letterSpacing: -1, color: onDark.text },
  moneyActions: { flexDirection: 'row', gap: space.sm, marginTop: space.md, marginBottom: space.xs },
  flexBtn: { flex: 1 },
  release: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  ledger: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg },
  lineDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  pressed: { opacity: 0.7 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  amount: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  amountIn: { color: colors.success },
});
