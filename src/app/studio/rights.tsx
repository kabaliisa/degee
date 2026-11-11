import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PickedFile } from '../../api/client';
import { declareRights, getMyRelease, uploadLabelLetter, type LabelDeal, type StudioRelease } from '../../api/studio';
import { CheckRow, Choice, ErrorText, Field } from '../../components/studio/Form';
import { Button, EmptyState } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { colors, radius, space, type } from '../../lib/theme';

type YesNo = 'YES' | 'NO';
const YES_NO: { value: YesNo; label: string }[] = [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }];
const LABEL: { value: LabelDeal; label: string }[] = [
  { value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }, { value: 'NOT_SURE', label: 'Not sure' },
];

/**
 * The rights questions from the upload rules. They protect artists signed to labels and decide who
 * gets paid. If an answer is false, the person who confirmed it is responsible.
 */
export default function Rights() {
  const { releaseId } = useLocalSearchParams<{ releaseId: string }>();
  const load = useCallback(() => getMyRelease(releaseId), [releaseId]);
  const { data, error } = useLoad(load);
  if (!data) return error ? <EmptyState icon="alert-circle-outline" title="Couldn’t open this release" body={error} /> : null;
  return <RightsForm release={data} />;
}

function RightsForm({ release }: { release: StudioRelease }) {
  const d = release.declaration;
  const [label, setLabel] = useState<LabelDeal | null>(d?.signedToLabel ?? null);
  const [labelName, setLabelName] = useState(d?.labelName ?? '');
  const [before, setBefore] = useState<YesNo | null>(d ? (d.releasedBefore ? 'YES' : 'NO') : null);
  const [distributor, setDistributor] = useState(d?.previousDistributor ?? '');
  const [cover, setCover] = useState<YesNo | null>(d ? (d.coverOrSamples ? 'YES' : 'NO') : null);
  const [confirmed, setConfirmed] = useState(false);
  const [letter, setLetter] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseLetter = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    setLetter({ uri: a.uri, name: a.name, mimeType: a.mimeType, file: a.file });
  };

  const save = async () => {
    if (!label || !before || !cover) return setError('Answer all three questions.');
    setError(null);
    setBusy(true);
    try {
      await declareRights(release.id, {
        signedToLabel: label, labelName, releasedBefore: before === 'YES', previousDistributor: distributor,
        coverOrSamples: cover === 'YES', confirmOwnership: confirmed,
      });
      if (label === 'YES' && letter) await uploadLabelLetter(release.id, letter);
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[type.body, styles.muted]}>
        Three questions about “{release.title}”. They make sure music only goes up with the permission of whoever owns it.
      </Text>

      <View style={styles.question}>
        <Text style={type.bodyBold}>Are you signed to a record label or an exclusive distribution deal?</Text>
        <Choice options={LABEL} value={label} onChange={setLabel} />
        {label === 'YES' || label === 'NOT_SURE' ? (
          <Field label="Label or company name" value={labelName} onChangeText={setLabelName} maxLength={120} />
        ) : null}
        {label === 'YES' ? (
          <>
            <Text style={[type.small, styles.muted]}>
              Your label controls these recordings, so we need a letter from them, signed, saying you may sell this release on Deegee.
            </Text>
            <Pressable onPress={chooseLetter} accessibilityRole="button" style={({ pressed }) => [styles.file, pressed && styles.pressed]}>
              <Ionicons name={letter || d?.hasLabelLetter ? 'document-text' : 'cloud-upload-outline'} size={20} color={colors.accent} />
              <Text style={[type.body, styles.flex]} numberOfLines={1}>
                {letter ? letter.name : d?.hasLabelLetter ? 'Letter uploaded · tap to replace' : 'Upload the permission letter (PDF or photo)'}
              </Text>
            </Pressable>
          </>
        ) : null}
        {label === 'NOT_SURE' ? (
          <Text style={[type.small, styles.muted]}>That’s fine. Someone from Deegee will ask you about it before the release goes live.</Text>
        ) : null}
      </View>

      <View style={styles.question}>
        <Text style={type.bodyBold}>Has this music been released anywhere before?</Text>
        <Choice options={YES_NO} value={before} onChange={setBefore} />
        {before === 'YES' ? (
          <Field label="Where?" value={distributor} onChangeText={setDistributor} maxLength={120}
            placeholder="e.g. Audiomack, Boomplay, a distributor or label" />
        ) : null}
      </View>

      <View style={styles.question}>
        <Text style={type.bodyBold}>Is any song a cover, or does it use samples from someone else’s recording?</Text>
        <Choice options={YES_NO} value={cover} onChange={setCover} />
        {cover === 'YES' ? (
          <Text style={[type.small, styles.danger]}>
            Covers and samples need the original owner’s permission, and Deegee can’t sell them yet. Remove those songs to continue.
          </Text>
        ) : null}
      </View>

      <CheckRow checked={confirmed} onChange={setConfirmed}>
        I own or control the rights to these recordings, and I accept responsibility if any of this isn’t true.
      </CheckRow>

      <ErrorText message={error} />
      <Button label="Save answers" onPress={save} loading={busy} disabled={!confirmed} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl * 3 },
  muted: { color: colors.textMuted },
  danger: { color: colors.danger },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  question: { gap: space.md },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg },
});
