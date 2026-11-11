import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mediaUrl } from '../../../api/catalog';
import {
  deleteRelease, editRelease, getMyRelease, releaseTypeOf, submitRelease, uploadCover, type Declaration, type StudioRelease,
} from '../../../api/studio';
import { Art } from '../../../components/Art';
import { AudioPreview } from '../../../components/studio/AudioPreview';
import { ErrorText, Field, SectionTitle, digits } from '../../../components/studio/Form';
import { StatusPill } from '../../../components/studio/StatusPill';
import { Button, EmptyState } from '../../../components/ui';
import { useLoad } from '../../../hooks/useLoad';
import { formatDuration } from '../../../lib/format';
import { formatUGX } from '../../../lib/money';
import { colors, radius, space, type } from '../../../lib/theme';

function rightsSummary(d: Declaration | null) {
  if (!d) return 'Not answered yet';
  const label = d.signedToLabel === 'YES' ? `Signed to ${d.labelName}` : d.signedToLabel === 'NOT_SURE' ? 'Not sure about a label deal' : 'Not signed to a label';
  return `${label}${d.releasedBefore ? ` · released before on ${d.previousDistributor}` : ''}`;
}

const STATUS_NOTES: Partial<Record<StudioRelease['status'], string>> = {
  IN_REVIEW: 'Deegee is reviewing this release, usually within two days. You can’t change it while it’s in review.',
  PUBLISHED: 'This release is live. Fans can find it, listen to previews and buy it.',
};

/** Everything about one release: details, cover, songs, rights, and sending it for review. */
export default function ReleaseEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => getMyRelease(id), [id]);
  const { data: release, error, setData, reload } = useLoad(load);

  if (!release) {
    return error ? <EmptyState icon="alert-circle-outline" title="Couldn’t open this release" body={error}
      action={<Button small label="Try again" onPress={reload} />} /> : null;
  }
  return <Editor release={release} onChange={setData} />;
}

function Editor({ release, onChange }: { release: StudioRelease; onChange: (r: StudioRelease) => void }) {
  const editable = release.status === 'DRAFT' || release.status === 'REJECTED';
  const [title, setTitle] = useState(release.title);
  const [price, setPrice] = useState(String(release.priceUGX));
  const [busy, setBusy] = useState<'cover' | 'save' | 'submit' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = title.trim() !== release.title || Number(price || 0) !== release.priceUGX;

  const run = async (what: NonNullable<typeof busy>, action: () => Promise<StudioRelease | void>) => {
    setError(null);
    setBusy(what);
    try {
      const updated = await action();
      if (updated) onChange(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const pickCover = () => run('cover', async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (picked.canceled) return;
    const a = picked.assets[0];
    return uploadCover(release.id, { uri: a.uri, name: a.fileName ?? 'cover.jpg', mimeType: a.mimeType, file: a.file });
  });

  const saveDetails = () => run('save', () => editRelease(release.id, { title, type: releaseTypeOf(release.type), priceUgx: Number(price || 0) }));
  const submit = () => run('submit', () => submitRelease(release.id));
  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    void run('delete', async () => {
      await deleteRelease(release.id);
      router.back();
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: release.type }} />
      <View style={styles.top}>
        <Pressable onPress={editable ? pickCover : undefined} disabled={!editable} accessibilityRole="button" accessibilityLabel="Change cover">
          <Art seed={release.id} colors={release.colors} size={120} photo={false} uri={release.coverUrl ? mediaUrl(release.coverUrl) : null} />
          {editable ? (
            <View style={styles.coverBadge}>
              <Ionicons name={busy === 'cover' ? 'hourglass-outline' : 'camera'} size={16} color={colors.accentInk} />
            </View>
          ) : null}
        </Pressable>
        <View style={styles.flex}>
          <Text style={type.title} numberOfLines={2}>{release.title}</Text>
          <Text style={type.small}>{release.type} · {formatUGX(release.priceUGX)}</Text>
          <StatusPill status={release.status} />
        </View>
      </View>

      {release.status === 'REJECTED' && release.reviewNote ? (
        <View style={[styles.notice, styles.noticeRed]}>
          <Text style={type.bodyBold}>Deegee asked for changes</Text>
          <Text style={type.body}>{release.reviewNote}</Text>
          <Text style={type.small}>Fix it below and submit again.</Text>
        </View>
      ) : null}
      {STATUS_NOTES[release.status] ? (
        <View style={styles.notice}><Text style={[type.body, styles.muted]}>{STATUS_NOTES[release.status]}</Text></View>
      ) : null}

      {editable ? (
        <>
          <Field label="Title" value={title} onChangeText={setTitle} maxLength={120} />
          <Field label="Price for the whole release" prefix="UGX" value={price} onChangeText={(v) => setPrice(digits(v))} keyboardType="number-pad" />
          {dirty ? <Button small variant="secondary" label="Save details" onPress={saveDetails} loading={busy === 'save'} /> : null}
          {!release.coverUrl ? <Text style={[type.small, styles.faint]}>Tap the artwork to add a cover (square, at least 400 × 400). Without one, fans see a pattern.</Text> : null}
        </>
      ) : null}

      <SectionTitle action={editable ? (
        <Button small variant="outline" icon="add" label="Add song" onPress={() => router.push({ pathname: '/studio/song', params: { releaseId: release.id } })} />
      ) : undefined}>Songs</SectionTitle>
      {release.tracks.length === 0 ? <Text style={[type.body, styles.muted]}>No songs yet.</Text> : null}
      {release.tracks.map((t) => (
        // The play button sits beside the row's button, not inside it (nested buttons aren't allowed on the web).
        <View key={t.id} style={styles.song}>
          {t.audioUrl ? <AudioPreview url={t.audioUrl} label={t.title} /> : <Text style={[type.small, styles.trackNo]}>{t.trackNo}</Text>}
          <Pressable disabled={!editable} accessibilityRole="button" accessibilityLabel={`Edit ${t.title}`}
            onPress={() => router.push({ pathname: '/studio/song', params: { releaseId: release.id, trackId: t.id } })}
            style={({ pressed }) => [styles.songBody, pressed && styles.pressed]}>
            <View style={styles.flex}>
              <Text style={type.bodyBold} numberOfLines={1}>{t.trackNo}. {t.title}</Text>
              <Text style={[type.small, !t.hasAudio && styles.danger]}>
                {t.hasAudio ? `${formatDuration(t.durationSec)} · ${formatUGX(t.priceUGX)}` : `No recording yet · ${formatUGX(t.priceUGX)}`}
              </Text>
            </View>
            {editable ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
          </Pressable>
        </View>
      ))}

      <SectionTitle>Rights</SectionTitle>
      <Pressable disabled={!editable} accessibilityRole="button" onPress={() => router.push({ pathname: '/studio/rights', params: { releaseId: release.id } })}
        style={({ pressed }) => [styles.rights, pressed && styles.pressed]}>
        <Ionicons name="shield-checkmark-outline" size={22} color={release.declaration ? colors.accent : colors.textMuted} />
        <View style={styles.flex}>
          <Text style={type.bodyBold}>Who owns this music</Text>
          <Text style={type.small}>{rightsSummary(release.declaration)}</Text>
        </View>
        {editable ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
      </Pressable>

      {editable ? (
        <>
          {release.problems.length > 0 ? (
            <View style={styles.notice}>
              <Text style={type.bodyBold}>Before you can submit</Text>
              {release.problems.map((p, i) => <Text key={`${i}-${p}`} style={[type.body, styles.muted]}>• {p}</Text>)}
            </View>
          ) : null}
          <ErrorText message={error} />
          <Button label="Submit for review" icon="send" onPress={submit} loading={busy === 'submit'} disabled={release.problems.length > 0 || dirty} />
          <Button variant="ghost" label={confirmDelete ? 'Tap again to delete this release' : 'Delete release'} onPress={remove} loading={busy === 'delete'} />
        </>
      ) : <ErrorText message={error} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 3 },
  top: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  coverBadge: { position: 'absolute', right: 6, bottom: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 4 },
  notice: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  noticeRed: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  muted: { color: colors.textMuted },
  faint: { color: colors.textFaint },
  danger: { color: colors.danger },
  song: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  songBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  trackNo: { width: 32, textAlign: 'center' },
  pressed: { opacity: 0.7 },
  rights: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg },
});
