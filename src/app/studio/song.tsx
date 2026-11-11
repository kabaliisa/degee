import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PickedFile } from '../../api/client';
import {
  addTrack, deleteTrack, editTrack, getMyRelease, uploadAudio, type Society, type StudioRelease, type WriterInput,
} from '../../api/studio';
import { Choice, ErrorText, Field, SectionTitle, digits } from '../../components/studio/Form';
import { Button, EmptyState } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatDuration } from '../../lib/format';
import { colors, font, radius, space, type } from '../../lib/theme';

type Row = { name: string; share: string; society: 'NONE' | 'UPRS' | 'FOREIGN' };

const SOCIETIES: { value: Row['society']; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'UPRS', label: 'UPRS' },
  { value: 'FOREIGN', label: 'Another country’s' },
];

const toRow = (w: WriterInput): Row => ({ name: w.name, share: String(w.sharePct), society: w.society ?? 'NONE' });
const toWriter = (r: Row): WriterInput => ({ name: r.name.trim(), sharePct: Number(r.share || 0), society: r.society === 'NONE' ? null : (r.society as Society) });

/** Add or edit one song: title, price, who wrote it, and the recording. */
export default function SongEditor() {
  const { releaseId, trackId } = useLocalSearchParams<{ releaseId: string; trackId?: string }>();
  const load = useCallback(() => getMyRelease(releaseId), [releaseId]);
  const { data: release, error } = useLoad(load);
  if (!release) return error ? <EmptyState icon="alert-circle-outline" title="Couldn’t open this song" body={error} /> : null;
  return <SongForm release={release} trackId={trackId} />;
}

function SongForm({ release, trackId }: { release: StudioRelease; trackId?: string }) {
  const track = release.tracks.find((t) => t.id === trackId);
  const isSingleSong = release.type === 'Single' && release.tracks.length <= (track ? 1 : 0);
  const [title, setTitle] = useState(track?.title ?? (isSingleSong ? release.title : ''));
  const [price, setPrice] = useState(String(track?.priceUGX ?? (isSingleSong ? release.priceUGX : 1000)));
  const [rows, setRows] = useState<Row[]>(track ? track.writers.map(toRow) : [{ name: '', share: '100', society: 'NONE' }]);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const total = rows.reduce((sum, r) => sum + Number(r.share || 0), 0);
  const setRow = (i: number, patch: Partial<Row>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const chooseFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, file: a.file });
  };

  const save = async () => {
    setError(null);
    setBusy('save');
    try {
      const input = { title, priceUgx: Number(price || 0), writers: rows.map(toWriter) };
      setProgress('Saving…');
      const saved = track ? await editTrack(release.id, track.id, input) : await addTrack(release.id, input);
      if (file) {
        // A new song is added at the end, so it's the one with the highest number.
        const id = track?.id ?? saved.tracks[saved.tracks.length - 1].id;
        setProgress('Uploading the recording… keep the app open.');
        await uploadAudio(release.id, id, file);
      }
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!track) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy('delete');
    try {
      await deleteTrack(release.id, track.id);
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: track ? 'Edit song' : 'Add song' }} />
      <Field label="Song title" value={title} onChangeText={setTitle} maxLength={120} />
      <Field label="Price for this song" prefix="UGX" value={price} onChangeText={(v) => setPrice(digits(v))} keyboardType="number-pad" />

      <SectionTitle>Recording</SectionTitle>
      <Pressable onPress={chooseFile} accessibilityRole="button" style={({ pressed }) => [styles.file, pressed && styles.pressed]}>
        <Ionicons name={file || track?.hasAudio ? 'musical-note' : 'cloud-upload-outline'} size={22} color={colors.accent} />
        <View style={styles.flex}>
          <Text style={type.bodyBold} numberOfLines={1}>
            {file ? file.name : track?.hasAudio ? `Uploaded · ${formatDuration(track.durationSec)}` : 'Choose the audio file'}
          </Text>
          <Text style={type.small}>{file || track?.hasAudio ? 'Tap to replace' : 'MP3, M4A, WAV or FLAC, the final master'}</Text>
        </View>
      </Pressable>

      <SectionTitle>Who wrote it</SectionTitle>
      <Text style={[type.small, styles.muted]}>
        Everyone who wrote the words or the music, and their share. 10% of each sale goes to them: through UPRS for members, straight to the writer otherwise.
      </Text>
      {rows.map((r, i) => (
        <View key={i} style={styles.writer}>
          <View style={styles.writerTop}>
            <TextInput value={r.name} onChangeText={(v) => setRow(i, { name: v })} placeholder={i === 0 ? 'Your name' : 'Songwriter'}
              placeholderTextColor={colors.textFaint} maxLength={80} accessibilityLabel={`Songwriter ${i + 1} name`} style={[styles.input, styles.flex]} />
            <TextInput value={r.share} onChangeText={(v) => setRow(i, { share: digits(v).slice(0, 3) })} keyboardType="number-pad"
              accessibilityLabel={`Songwriter ${i + 1} share`} style={[styles.input, styles.share]} />
            <Text style={type.body}>%</Text>
            {rows.length > 1 ? (
              <Pressable onPress={() => setRows((list) => list.filter((_, j) => j !== i))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove songwriter">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Choice options={SOCIETIES} value={r.society} onChange={(v) => setRow(i, { society: v })} />
        </View>
      ))}
      <View style={styles.writerFooter}>
        <Text style={[type.small, total !== 100 && styles.danger]}>Shares add up to {total}%{total !== 100 ? ' (must be 100%)' : ''}</Text>
        {rows.length < 10 ? (
          <Button small variant="ghost" icon="add" label="Add songwriter" onPress={() => setRows((list) => [...list, { name: '', share: '0', society: 'NONE' }])} />
        ) : null}
      </View>

      <ErrorText message={error} />
      {progress ? <Text style={[type.small, styles.muted]}>{progress}</Text> : null}
      <Button label={track ? 'Save song' : 'Add song'} onPress={save} loading={busy === 'save'} disabled={!title.trim() || total !== 100} />
      {track ? <Button variant="ghost" label={confirmDelete ? 'Tap again to remove this song' : 'Remove song'} onPress={remove} loading={busy === 'delete'} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 3 },
  flex: { flex: 1 },
  muted: { color: colors.textMuted },
  danger: { color: colors.danger },
  pressed: { opacity: 0.7 },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg },
  writer: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: space.sm },
  writerTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: space.md, color: colors.text, fontFamily: font.medium, fontSize: 15 },
  share: { width: 64, textAlign: 'right' },
  writerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
