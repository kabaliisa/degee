import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { SettingsGroup, SettingsRow } from '../components/SettingsRow';
import { Button } from '../components/ui';
import { getTrack } from '../data/catalog';
import { formatUGX } from '../lib/money';
import { colors, font, radius, space, type } from '../lib/theme';
import { useLikes } from '../store/likes';
import { formatPhone, useProfile } from '../store/profile';
import { useWallet } from '../store/wallet';

export default function Profile() {
  const { name, phone, update } = useProfile();
  const balance = useWallet((s) => s.balance);
  const owned = useWallet((s) => s.ownedTracks);
  const txs = useWallet((s) => s.txs);
  const following = useLikes((s) => s.following);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const supported = new Set(owned.map((id) => getTrack(id)?.artistId).filter(Boolean)).size;
  const sentToArtists = txs.filter((t) => t.kind !== 'TOPUP' && t.status === 'COMPLETED').reduce((s, t) => s - t.amount, 0);

  const save = () => {
    const clean = draft.trim();
    if (clean) update({ name: clean.slice(0, 40) });
    setEditing(false);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xxl * 2 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', paddingTop: space.lg, gap: space.sm }}>
        <Avatar size={96} />
        {editing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm, paddingHorizontal: space.lg }}>
            <TextInput value={draft} onChangeText={setDraft} autoFocus maxLength={40} onSubmitEditing={save} returnKeyType="done" accessibilityLabel="Your name"
              style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: space.md, color: colors.text, fontFamily: font.bold, fontSize: 18 }} />
            <Button small label="Save" onPress={save} />
          </View>
        ) : (
          <>
            <Text style={[type.title, { marginTop: space.sm }]}>{name}</Text>
            <Text style={type.small}>{formatPhone(phone)}</Text>
            <Button small variant="outline" label="Edit profile" onPress={() => { setDraft(name); setEditing(true); }} style={{ marginTop: space.sm }} />
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: space.lg, marginTop: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, paddingVertical: space.lg }}>
        {[
          { value: String(owned.length), label: 'Songs owned' },
          { value: String(Math.max(supported, following.length)), label: 'Artists' },
          { value: formatUGX(sentToArtists).replace('UGX ', ''), label: 'UGX to artists' },
        ].map((s, i) => (
          <View key={s.label} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.border }}>
            <Text style={[type.heading, { fontSize: 20 }]}>{s.value}</Text>
            <Text style={type.small}>{s.label}</Text>
          </View>
        ))}
      </View>

      <SettingsGroup>
        <SettingsRow icon="wallet-outline" label="Wallet" detail={formatUGX(balance)} onPress={() => { router.back(); router.push('/(tabs)/wallet'); }} />
        <SettingsRow icon="library-outline" label="Your music" onPress={() => { router.back(); router.push('/(tabs)/library'); }} />
        <SettingsRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} last />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon="help-circle-outline" label="Help and support" onPress={() => {}} />
        <SettingsRow icon="musical-notes-outline" label="Are you an artist? Sell on Deegee" onPress={() => {}} last />
      </SettingsGroup>

      <Pressable onPress={() => {}} style={{ alignSelf: 'center', marginTop: space.xl }}>
        <Text style={[type.smallBold, { color: colors.textFaint }]}>Deegee 0.1 · demo</Text>
      </Pressable>
    </ScrollView>
  );
}
