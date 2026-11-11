import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMyArtist, applyAsArtist, type ArtistProfile } from '../../api/studio';
import type { Genre } from '../../api/types';
import { ErrorText, Field } from '../../components/studio/Form';
import { Button, Chip } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatPhone } from '../../lib/phone';
import { colors, space, type } from '../../lib/theme';
import { useSession } from '../../store/session';

const GENRES: Genre[] = ['Afrobeat', 'Kadongo Kamu', 'Dancehall', 'Gospel', 'Zouk', 'Hip Hop'];

// No artist yet is a normal answer here, not an error.
const loadExisting = () => getMyArtist().catch(() => null);

/** Apply to sell on Deegee, or fix an application that was sent back. */
export default function Apply() {
  const existing = useLoad(loadExisting);
  if (existing.loading) return null;
  return <ApplyForm existing={existing.data ?? null} />;
}

function ApplyForm({ existing }: { existing: ArtistProfile | null }) {
  const myPhone = useSession((s) => s.user?.phone);
  const [name, setName] = useState(existing?.name ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [genres, setGenres] = useState<Genre[]>(existing?.genres ?? []);
  const [payoutPhone, setPayoutPhone] = useState(formatPhone(existing?.payoutPhone ?? myPhone ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (g: Genre) =>
    setGenres((list) => (list.includes(g) ? list.filter((x) => x !== g) : list.length < 3 ? [...list, g] : list));

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      await applyAsArtist({ name, city, bio, genres, payoutPhone });
      router.replace('/studio');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={type.display}>{existing ? 'Update your application' : 'Sell your music on Deegee'}</Text>
      <Text style={[type.body, styles.muted]}>
        Fans buy your songs and pay you straight to mobile money. We check every new artist before their music goes live, usually within two days.
      </Text>
      {existing?.reviewNote ? <Text style={[type.body, styles.note]}>From Deegee: {existing.reviewNote}</Text> : null}

      <Field label="Artist name" value={name} onChangeText={setName} maxLength={60} placeholder="The name fans know you by" />
      <Field label="City or town" value={city} onChangeText={setCity} maxLength={60} placeholder="e.g. Kampala" />
      <Field label="About you" value={bio} onChangeText={setBio} maxLength={500} multiline placeholder="A few lines for your artist page" />

      <Text style={type.smallBold}>Genres (up to 3)</Text>
      <View style={styles.chips}>
        {GENRES.map((g) => <Chip key={g} label={g} active={genres.includes(g)} onPress={() => toggle(g)} />)}
      </View>

      <Field label="Pay me on" value={payoutPhone} onChangeText={setPayoutPhone} keyboardType="phone-pad" placeholder="0772 123456"
        hint="Your MTN MoMo or Airtel Money number. It must be registered in your own name." />

      <ErrorText message={error} />
      <Button label={existing ? 'Send again' : 'Apply'} onPress={send} loading={busy} disabled={!name.trim() || !city.trim() || genres.length === 0} />
      <Text style={[type.small, styles.centered]}>By applying you agree that you own or control the music you upload.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },
  muted: { color: colors.textMuted },
  note: { color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  centered: { textAlign: 'center' },
});
