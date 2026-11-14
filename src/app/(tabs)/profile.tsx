import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getTrack } from '../../api';
import { updateMe } from '../../api/account';
import { InstallCard } from '../../components/InstallCard';
import { Avatar } from '../../components/profile/Avatar';
import { SettingsGroup, SettingsRow } from '../../components/profile/SettingsRow';
import { Button, ScreenHeader, StatusBarStrip } from '../../components/ui';
import { formatUGX } from '../../lib/money';
import { formatPhone } from '../../lib/phone';
import { colors, font, layout, onDark, radius, space, type } from '../../lib/theme';
import { useLikes } from '../../store/likes';
import { displayName, isAdmin, useSession } from '../../store/session';
import { sentToArtists, useWallet } from '../../store/wallet';

const MAX_NAME = 40;

export default function Profile() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const credit = useWallet((s) => s.balance);
  const owned = useWallet((s) => s.ownedTracks);
  const txs = useWallet((s) => s.txs);
  const following = useLikes((s) => s.following);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = new Set(owned.map((id) => getTrack(id)?.artistId).filter(Boolean)).size;
  const artistCount = Math.max(supported, following.length);
  const stats = [
    { value: String(owned.length), label: owned.length === 1 ? 'song owned' : 'songs owned' },
    { value: String(artistCount), label: artistCount === 1 ? 'artist' : 'artists' },
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

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader>
          <View style={styles.who}>
            <Avatar size={72} />
            {editing ? (
              <View style={styles.flex}>
                <TextInput value={draft} onChangeText={setDraft} autoFocus maxLength={MAX_NAME} onSubmitEditing={save} returnKeyType="done"
                  placeholder="Your name" placeholderTextColor={colors.textFaint} accessibilityLabel="Your name" style={styles.nameInput} />
                {error ? <Text accessibilityRole="alert" style={[type.small, styles.error]}>{error}</Text> : null}
              </View>
            ) : (
              <View style={styles.flex}>
                <Text accessibilityRole="header" numberOfLines={2} style={styles.name}>{displayName(user)}</Text>
                {user ? <Text style={styles.phone}>{formatPhone(user.phone)}</Text> : null}
              </View>
            )}
          </View>
          <View style={styles.editRow}>
            {editing ? (
              <>
                <Button small label="Save" onPress={save} loading={saving} />
                <Button small variant="onDark" label="Cancel" onPress={() => setEditing(false)} />
              </>
            ) : (
              <Button small variant="onDark" label="Edit name" onPress={startEditing} />
            )}
          </View>
          <View style={styles.stats}>
            {stats.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </ScreenHeader>

        <InstallCard />

        <SettingsGroup>
          <SettingsRow icon="receipt-outline" label="Purchases and gifts" detail={credit > 0 ? `${formatUGX(credit)} credit` : undefined}
            onPress={() => router.push('/activity')} />
          <SettingsRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} last />
        </SettingsGroup>

        <SettingsGroup title="For artists">
          <SettingsRow icon="mic-outline" label="Artist studio" detail="Sell your music" onPress={() => router.push('/studio')} last={!isAdmin(user)} />
          {isAdmin(user) ? <SettingsRow icon="shield-checkmark-outline" label="Review queue" onPress={() => router.push('/admin')} last /> : null}
        </SettingsGroup>

        <Text style={[type.small, styles.version]}>Deegee 0.1, test payments</Text>
      </ScrollView>
      <StatusBarStrip />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: layout.tabScreenBottom },
  flex: { flex: 1, minWidth: 0 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.md },
  name: { fontFamily: font.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.6, color: onDark.text },
  phone: { fontFamily: font.medium, fontSize: 14, color: onDark.textMuted, marginTop: 2 },
  nameInput: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: space.md, color: colors.text, fontFamily: font.bold, fontSize: 18 },
  editRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  stat: { flex: 1, backgroundColor: onDark.surface, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.md },
  statValue: { fontFamily: font.display, fontSize: 20, color: onDark.text },
  statLabel: { fontFamily: font.medium, fontSize: 12, color: onDark.textMuted, marginTop: 2 },
  error: { color: onDark.accentText, marginTop: space.xs },
  version: { alignSelf: 'center', marginTop: space.xl, color: colors.textFaint },
});
