import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getTrack } from '../api';
import { Avatar } from '../components/profile/Avatar';
import { SettingsGroup, SettingsRow } from '../components/profile/SettingsRow';
import { Button } from '../components/ui';
import { formatUGX } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { useLikes } from '../store/likes';
import { formatPhone, useProfile } from '../store/profile';
import { sentToArtists, useWallet } from '../store/wallet';

const MAX_NAME = 40;

export default function Profile() {
  const name = useProfile((s) => s.name);
  const phone = useProfile((s) => s.phone);
  const update = useProfile((s) => s.update);
  const balance = useWallet((s) => s.balance);
  const owned = useWallet((s) => s.ownedTracks);
  const txs = useWallet((s) => s.txs);
  const following = useLikes((s) => s.following);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const supported = new Set(owned.map((id) => getTrack(id)?.artistId).filter(Boolean)).size;
  const stats = [
    { value: String(owned.length), label: 'Songs owned' },
    { value: String(Math.max(supported, following.length)), label: 'Artists' },
    { value: sentToArtists(txs).toLocaleString('en-US'), label: 'UGX to artists' },
  ];

  const startEditing = () => { setDraft(name); setEditing(true); };
  const save = () => {
    const clean = draft.trim();
    if (clean) update({ name: clean.slice(0, MAX_NAME) });
    setEditing(false);
  };
  const goToTab = (path: '/(tabs)/wallet' | '/(tabs)/library') => { router.back(); router.push(path); };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Avatar size={96} />
        {editing ? (
          <View style={styles.editRow}>
            <TextInput value={draft} onChangeText={setDraft} autoFocus maxLength={MAX_NAME} onSubmitEditing={save} returnKeyType="done"
              accessibilityLabel="Your name" style={styles.nameInput} />
            <Button small label="Save" onPress={save} />
          </View>
        ) : (
          <>
            <Text style={[type.title, styles.name]}>{name}</Text>
            <Text style={type.small}>{formatPhone(phone)}</Text>
            <Button small variant="outline" label="Edit profile" onPress={startEditing} style={styles.edit} />
          </>
        )}
      </View>

      <View style={styles.stats}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.stat, i > 0 && styles.statDivider]}>
            <Text style={[type.heading, styles.statValue]}>{s.value}</Text>
            <Text style={type.small}>{s.label}</Text>
          </View>
        ))}
      </View>

      <SettingsGroup>
        <SettingsRow icon="wallet-outline" label="Wallet" detail={formatUGX(balance)} onPress={() => goToTab('/(tabs)/wallet')} />
        <SettingsRow icon="library-outline" label="Your music" onPress={() => goToTab('/(tabs)/library')} />
        <SettingsRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} last />
      </SettingsGroup>

      {/* Placeholders until help and artist sign-up exist. */}
      <SettingsGroup>
        <SettingsRow icon="help-circle-outline" label="Help and support" onPress={() => {}} />
        <SettingsRow icon="musical-notes-outline" label="Are you an artist? Sell on Deegee" onPress={() => {}} last />
      </SettingsGroup>

      <Text style={[type.smallBold, styles.version]}>Deegee 0.1 · demo</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl * 2 },
  header: { alignItems: 'center', paddingTop: space.lg, gap: space.sm },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm, paddingHorizontal: space.lg },
  nameInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: space.md, color: colors.text, fontFamily: font.bold, fontSize: 18 },
  name: { marginTop: space.sm },
  edit: { marginTop: space.sm },
  stats: { flexDirection: 'row', marginHorizontal: space.lg, marginTop: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, paddingVertical: space.lg },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValue: { fontSize: 20 },
  version: { alignSelf: 'center', marginTop: space.xl, color: colors.textFaint },
});
