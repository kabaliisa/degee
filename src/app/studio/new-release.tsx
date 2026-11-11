import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { createRelease, type ReleaseType } from '../../api/studio';
import { Choice, ErrorText, Field, digits } from '../../components/studio/Form';
import { Button, FormScrollView } from '../../components/ui';
import { colors, space, type } from '../../lib/theme';

const TYPES: { value: ReleaseType; label: string }[] = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'EP', label: 'EP' },
  { value: 'ALBUM', label: 'Album' },
];
const HINTS: Record<ReleaseType, string> = {
  SINGLE: '1 to 3 songs.',
  EP: '2 to 8 songs.',
  ALBUM: '5 songs or more.',
};
const DEFAULT_PRICE: Record<ReleaseType, string> = { SINGLE: '2000', EP: '8000', ALBUM: '15000' };

export default function NewRelease() {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ReleaseType>('SINGLE');
  const [price, setPrice] = useState(DEFAULT_PRICE.SINGLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickType = (t: ReleaseType) => {
    if (price === DEFAULT_PRICE[kind]) setPrice(DEFAULT_PRICE[t]); // follow the suggestion unless they changed it
    setKind(t);
  };

  const create = async () => {
    setError(null);
    setBusy(true);
    try {
      const release = await createRelease({ title, type: kind, priceUgx: Number(price || 0) });
      router.replace({ pathname: '/studio/release/[id]', params: { id: release.id } });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <FormScrollView contentContainerStyle={styles.content}>
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={120} placeholder="Release title" />
      <Choice label="What is it?" options={TYPES} value={kind} onChange={pickType} hint={HINTS[kind]} />
      <Field label="Price for the whole release" prefix="UGX" value={price} onChangeText={(v) => setPrice(digits(v))} keyboardType="number-pad"
        hint="Fans can also buy songs one at a time; you set those prices next." />
      <ErrorText message={error} />
      <Button label="Create release" onPress={create} loading={busy} disabled={!title.trim()} />
      <Text style={[type.small, styles.faint]}>Nothing is public until Deegee approves it.</Text>
    </FormScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  faint: { color: colors.textFaint, textAlign: 'center' },
});
