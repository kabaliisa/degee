import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { approve, getReviewQueue, sendBack, type PendingRelease, type ReviewKind } from '../api/admin';
import { mediaUrl } from '../api/catalog';
import { Art } from '../components/Art';
import { AudioPreview } from '../components/studio/AudioPreview';
import { ErrorText, SectionTitle } from '../components/studio/Form';
import { Button, EmptyState } from '../components/ui';
import { useLoad } from '../hooks/useLoad';
import { formatDuration } from '../lib/format';
import { formatUGX } from '../lib/money';
import { formatPhone } from '../lib/phone';
import { colors, font, radius, space, type } from '../lib/theme';

/** Approve or send back one item. Sending back needs a note the artist will read. */
function Decision({ kind, id, onDone, approveLabel = 'Approve' }: { kind: ReviewKind; id: string; onDone: () => void; approveLabel?: string }) {
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'back' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (what: 'approve' | 'back') => {
    setError(null);
    setBusy(what);
    try {
      if (what === 'approve') await approve(kind, id);
      else await sendBack(kind, id, note);
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <View style={styles.decision}>
      {noting ? (
        <TextInput value={note} onChangeText={setNote} autoFocus multiline maxLength={300} placeholder="What should they fix?"
          placeholderTextColor={colors.textFaint} accessibilityLabel="Note to the artist" style={styles.note} />
      ) : null}
      <ErrorText message={error} />
      <View style={styles.buttons}>
        {noting ? (
          <>
            <Button small variant="ghost" label="Cancel" onPress={() => setNoting(false)} />
            <Button small variant="secondary" label="Send back" onPress={() => act('back')} loading={busy === 'back'} disabled={!note.trim()} style={styles.flex} />
          </>
        ) : (
          <>
            <Button small variant="secondary" label="Send back" onPress={() => setNoting(true)} style={styles.flex} />
            <Button small label={approveLabel} onPress={() => act('approve')} loading={busy === 'approve'} style={styles.flex} />
          </>
        )}
      </View>
    </View>
  );
}

function ReleaseCard({ item, onDone }: { item: PendingRelease; onDone: () => void }) {
  const r = item.release;
  const d = r.declaration;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Art seed={r.id} colors={r.colors} size={72} photo={false} uri={r.coverUrl ? mediaUrl(r.coverUrl) : null} />
        <View style={styles.flex}>
          <Text style={type.heading}>{r.title}</Text>
          <Text style={type.small}>{item.artistName} · {r.type} · {formatUGX(r.priceUGX)}</Text>
        </View>
      </View>
      {item.flags.map((f) => <Text key={f} style={[type.small, styles.flag]}>⚑ {f}</Text>)}
      {r.tracks.map((t) => (
        <View key={t.id} style={styles.row}>
          {t.audioUrl ? <AudioPreview url={t.audioUrl} label={t.title} /> : null}
          <View style={styles.flex}>
            <Text style={type.body}>{t.trackNo}. {t.title} · {formatDuration(t.durationSec)} · {formatUGX(t.priceUGX)}</Text>
            <Text style={type.small}>Written by {t.writers.map((w) => `${w.name} ${w.sharePct}%${w.society ? ` (${w.society === 'UPRS' ? 'UPRS' : 'foreign society'})` : ''}`).join(', ')}</Text>
          </View>
        </View>
      ))}
      {d?.labelLetterUrl ? (
        <Button small variant="outline" icon="document-text-outline" label="Open label letter" onPress={() => void Linking.openURL(mediaUrl(d.labelLetterUrl!))} />
      ) : null}
      <Decision kind="releases" id={r.id} onDone={onDone} approveLabel="Publish" />
    </View>
  );
}

/** Deegee staff: new artists, releases and first withdrawals waiting for a decision. */
export default function Admin() {
  const { data, error, reload } = useLoad(getReviewQueue);
  if (!data) return error ? <EmptyState icon="lock-closed-outline" title="Can’t open the review queue" body={error} /> : null;
  const empty = data.artists.length + data.releases.length + data.withdrawals.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {empty ? <EmptyState icon="checkmark-done-outline" title="All caught up" body="Nothing is waiting for review." /> : null}

      {data.artists.length > 0 ? <SectionTitle>{`New artists (${data.artists.length})`}</SectionTitle> : null}
      {data.artists.map((a) => (
        <View key={a.id} style={styles.card}>
          <Text style={type.heading}>{a.name}</Text>
          <Text style={type.small}>{a.city} · {a.genres.join(', ')}</Text>
          {a.bio ? <Text style={type.body}>{a.bio}</Text> : null}
          <Text style={type.small}>
            Signed up with {a.accountPhone ? formatPhone(a.accountPhone) : '—'} · paid on {a.payoutPhone ? formatPhone(a.payoutPhone) : '—'}
          </Text>
          <Decision kind="artists" id={a.id} onDone={reload} />
        </View>
      ))}

      {data.releases.length > 0 ? <SectionTitle>{`Releases (${data.releases.length})`}</SectionTitle> : null}
      {data.releases.map((item) => <ReleaseCard key={item.release.id} item={item} onDone={reload} />)}

      {data.withdrawals.length > 0 ? <SectionTitle>{`First withdrawals (${data.withdrawals.length})`}</SectionTitle> : null}
      {data.withdrawals.map((w) => (
        <View key={w.id} style={styles.card}>
          <Text style={type.heading}>{formatUGX(w.amountUgx)}</Text>
          <Text style={type.small}>{w.artistName} → {formatPhone(w.msisdn)} ({w.provider === 'MTN_MOMO' ? 'MTN MoMo' : 'Airtel Money'})</Text>
          <Text style={[type.small, styles.flag]}>⚑ Check the number is registered in the artist’s own name.</Text>
          <Decision kind="withdrawals" id={w.id} onDone={reload} approveLabel="Send money" />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 3 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1, gap: 2 },
  flag: { color: colors.text },
  decision: { gap: space.sm, marginTop: space.sm },
  buttons: { flexDirection: 'row', gap: space.sm },
  note: { minHeight: 72, textAlignVertical: 'top', backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: space.md, color: colors.text, fontFamily: font.regular, fontSize: 15 },
});
