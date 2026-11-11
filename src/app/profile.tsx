import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getTrack } from '../api';
import { updateMe } from '../api/account';
import { Avatar } from '../components/profile/Avatar';
import { SettingsGroup, SettingsRow } from '../components/profile/SettingsRow';
import { Button } from '../components/ui';
import { formatUGX } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { useLikes } from '../store/likes';
import { formatPhone } from '../lib/phone';
import { displayName, isAdmin, useSession } from '../store/session';
import { sentToArtists, useWallet } from '../store/wallet';

const MAX_NAME = 40;

export default function Profile() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const balance = useWallet((s) => s.balance);
  const owned = useWallet((s) => s.ownedTracks);
  const txs = useWallet((s) => s.txs);
  const following = useLikes((s) => s.following);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = new Set(owned.map((id) => getTrack(id)?.artistId).filter(Boolean)).size;
  const stats = [
    { value: String(owned.length), label: 'Songs owned' },
    { value: String(Math.max(supported, following.length)), label: 'Artists' },
    { value: sentToArtists(txs).toLocaleString('en-US'), label: 'UGX to artists' },
  ];

  const startEditing = () => { setDraft(user?.name ?? ''); setError(null); setEditing(true); };
  const save = async () => {
    const clean = draft.trim().slice(0, MAX_NAME);
    if (!clean || clean === user?.name) return setEditing(false);
    setSaving(true);
    try {
      setUser(await updateMe({ name: clean }));
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const goToTab = (path: '/(tabs)/wallet' | '/(tabs)/library') => { router.back(); router.push(path); };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Avatar size={96} />
        {editing ? (
          <>
            <View style={styles.editRow}>
              <TextInput value={draft} onChangeText={setDraft} autoFocus maxLength={MAX_NAME} onSubmitEditing={save} returnKeyType="done"
                placeholder="Your name" placeholderTextColor={colors.textFaint} accessibilityLabel="Your name" style={styles.nameInput} />
              <Button small label="Save" onPress={save} loading={saving} />
            </View>
            {error ? <Text style={[type.small, styles.error]}>{error}</Text> : null}
          </>
        ) : (
          <>
            <Text style={[type.title, styles.name]}>{displayName(user)}</Text>
            {user?.name ? <Text style={type.small}>{formatPhone(user.phone)}</Text> : null}
            <Button small variant="outline" label={user?.name ? 'Edit profile' : 'Add your name'} onPress={startEditing} style={styles.edit} />
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

      <SettingsGroup>
        <SettingsRow icon="musical-notes-outline" label="Artist studio" detail="Sell your music on Deegee" onPress={() => router.push('/studio')} last={!isAdmin(user)} />
        {isAdmin(user) ? <SettingsRow icon="shield-checkmark-outline" label="Review queue" onPress={() => router.push('/admin')} last /> : null}
      </SettingsGroup>

      {/* Placeholder until help exists. */}
      <SettingsGroup>
        <SettingsRow icon="help-circle-outline" label="Help and support" onPress={() => {}} last />
      </SettingsGroup>

      <Text style={[type.smallBold, styles.version]}>Deegee 0.1 · test payments</Text>
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
  error: { color: colors.danger },
  version: { alignSelf: 'center', marginTop: space.xl, color: colors.textFaint },
});
