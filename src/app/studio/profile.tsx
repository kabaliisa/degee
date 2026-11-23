import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { editMyProfile, getMyArtist, type ArtistProfile } from '../../api/studio';
import type { Genre } from '../../api/types';
import { ErrorText, Field } from '../../components/studio/Form';
import { Button, Chip, EmptyState, FormScrollView } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatPhone, normalizeUgPhone } from '../../lib/phone';
import { handleProblem } from '../../lib/slug';
import { colors, radius, space, type } from '../../lib/theme';

const GENRES: Genre[] = ['Afrobeat', 'Kadongo Kamu', 'Dancehall', 'Gospel', 'Zouk', 'Hip Hop'];

export default function Profile() {
  const { data, error } = useLoad(getMyArtist);
  if (!data) {
    return error ? <EmptyState icon="alert-circle-outline" title="Couldn’t load your profile" body={error} /> : null;
  }
  if (data.status !== 'ACTIVE') {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Still being reviewed"
        body="While your application is with us, changes go through the application itself."
        action={<Button label="Open your application" onPress={() => router.replace('/studio/apply')} />}
      />
    );
  }
  return <ProfileForm artist={data} />;
}

function ProfileForm({ artist }: { artist: ArtistProfile }) {
  const [name, setName] = useState(artist.name);
  const [city, setCity] = useState(artist.city);
  const [bio, setBio] = useState(artist.bio);
  const [genres, setGenres] = useState<Genre[]>(artist.genres);
  const [handle, setHandle] = useState(artist.slug);
  const [editingHandle, setEditingHandle] = useState(false);
  const [payoutPhone, setPayoutPhone] = useState(formatPhone(artist.payoutPhone ?? ''));
  const [heldUntil, setHeldUntil] = useState(artist.payoutHeldUntil);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleMoved = handle.trim().toLowerCase() !== artist.slug;
  const handleError = handleMoved ? handleProblem(handle) : null;
  // Both sides through the same normaliser, or they never match: the field shows "0772 255545"
  // and the server stores "+256772255545". Getting this wrong means every save looks like a payout
  // change, and an artist fixing a typo in their bio has withdrawals paused for a day.
  const payoutMoved = normalizeUgPhone(payoutPhone) !== artist.payoutPhone;

  const toggle = (g: Genre) =>
    setGenres((list) => (list.includes(g) ? list.filter((x) => x !== g) : list.length < 3 ? [...list, g] : list));

  const save = async () => {
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      // Only send what is actually moving. The server reads a handle or a phone number arriving as
      // an intent to change it, and a change to either costs the artist something.
      const updated = await editMyProfile({
        name: name.trim(),
        city: city.trim(),
        bio: bio.trim(),
        genres,
        ...(handleMoved ? { slug: handle.trim().toLowerCase() } : {}),
        ...(payoutMoved ? { payoutPhone } : {}),
      });
      setHeldUntil(updated.payoutHeldUntil);
      setHandle(updated.slug);
      setEditingHandle(false);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const unchanged =
    name.trim() === artist.name && city.trim() === artist.city && bio.trim() === artist.bio
    && genres.join() === artist.genres.join() && !handleMoved && !payoutMoved;

  return (
    <FormScrollView contentContainerStyle={styles.content}>
      <Field label="Artist name" value={name} onChangeText={setName} maxLength={60}
        hint="Shown on your profile, your releases and every receipt." />

      <View>
        <Text style={type.smallBold}>Your address</Text>
        {editingHandle ? (
          <>
            <Field label="" value={handle} onChangeText={(v) => setHandle(v.toLowerCase())} maxLength={40}
              prefix="deegee.ug/" />
            <Warning
              tone={handleError ? 'bad' : 'warn'}
              text={handleError ?? 'Changing this breaks every link already shared. Your name can change without touching it.'}
            />
          </>
        ) : (
          <Pressable style={styles.handleStatic} onPress={() => setEditingHandle(true)}>
            <Text style={styles.handleText} numberOfLines={1}>
              <Text style={styles.handlePrefix}>deegee.ug/</Text>{handle}
            </Text>
            <Text style={styles.changeLink}>Change</Text>
          </Pressable>
        )}
      </View>

      <Field label="City or town" value={city} onChangeText={setCity} maxLength={60} />
      <Field label="About you" value={bio} onChangeText={setBio} maxLength={500} multiline
        hint={`${bio.length} / 500`} />

      <View>
        <Text style={type.smallBold}>Genres (up to 3)</Text>
        <View style={styles.chips}>
          {GENRES.map((g) => <Chip key={g} label={g} active={genres.includes(g)} onPress={() => toggle(g)} />)}
        </View>
      </View>

      <View style={styles.payout}>
        <Field label="Where you get paid" value={payoutPhone} onChangeText={setPayoutPhone}
          keyboardType="phone-pad" placeholder="0772 123456" />
        {heldUntil ? (
          <Warning tone="warn" icon="time-outline" text={`Withdrawals are paused until ${whenReadable(heldUntil)}. Your earnings keep adding up in the meantime.`} />
        ) : (
          <Warning
            tone={payoutMoved ? 'warn' : 'quiet'}
            icon="time-outline"
            text="Change this and withdrawals pause for 24 hours. Your earnings keep adding up — you just can’t move them out for a day."
          />
        )}
      </View>

      <ErrorText message={error} />
      {saved ? <Text style={styles.saved}>Saved. Your page is updated.</Text> : null}

      <Button label="Save changes" onPress={save} loading={busy}
        disabled={unchanged || !!handleError || !name.trim() || !city.trim() || genres.length === 0} />
      <Text style={styles.footnote}>Your releases stay up and your verified check stays on.</Text>
    </FormScrollView>
  );
}

function Warning({ tone, text, icon }: { tone: 'warn' | 'bad' | 'quiet'; text: string; icon?: 'time-outline' }) {
  // Gold rather than red: moving a handle or a payout number is a thing an artist is allowed to
  // do, and colouring it like an error says they have done something wrong.
  const color = tone === 'bad' ? colors.danger : tone === 'warn' ? colors.ownedInk : colors.textFaint;
  return (
    <View style={styles.warning}>
      <Ionicons name={icon ?? 'alert-circle-outline'} size={15} color={color} style={styles.warningIcon} />
      <Text style={[styles.warningText, { color }]}>{text}</Text>
    </View>
  );
}

/** "24 Nov at 18:00" in Kampala, which is where the artist is. */
function whenReadable(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala',
  }).replace(',', ' at');
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2, width: '100%', maxWidth: 680, alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },

  handlePrefix: { ...type.body, color: colors.textFaint },
  handleStatic: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, marginTop: space.sm,
  },
  handleText: { ...type.body, color: colors.text, flexShrink: 1 },
  changeLink: { ...type.smallBold, color: colors.accentText },

  payout: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.lg, gap: space.sm },

  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: space.xs },
  warningIcon: { marginTop: 1 },
  warningText: { ...type.small, flex: 1 },

  saved: { ...type.small, color: colors.success, textAlign: 'center' },
  footnote: { ...type.small, color: colors.textFaint, textAlign: 'center' },
});
