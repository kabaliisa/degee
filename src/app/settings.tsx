import { router } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { SettingsGroup, SettingsRow } from '../components/SettingsRow';
import { colors, space, type } from '../lib/theme';
import { formatPhone, useProfile, type Language, type Quality } from '../store/profile';

const QUALITIES: Quality[] = ['Low', 'Normal', 'High'];
const LANGUAGES: Language[] = ['English', 'Luganda'];
const next = <T,>(list: T[], current: T) => list[(list.indexOf(current) + 1) % list.length];

export default function Settings() {
  const p = useProfile();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xxl * 2 }}>
      <SettingsGroup title="Account">
        <SettingsRow icon="person-outline" label="Name" detail={p.name} onPress={() => router.back()} />
        <SettingsRow icon="phone-portrait-outline" label="Mobile money number" detail={formatPhone(p.phone)} last />
      </SettingsGroup>

      <SettingsGroup title="Data and audio">
        <SettingsRow icon="cellular-outline" label="Data saver" detail="Lowest audio quality on mobile data"
          value={p.dataSaver} onToggle={(v) => p.update({ dataSaver: v })} />
        <SettingsRow icon="musical-note-outline" label="Streaming quality" detail={p.dataSaver ? 'Low (data saver)' : p.streamQuality}
          onPress={() => p.update({ streamQuality: next(QUALITIES, p.streamQuality) })} />
        <SettingsRow icon="wifi-outline" label="Download on Wi-Fi only" detail="Save data when downloading songs you own"
          value={p.downloadOnWifiOnly} onToggle={(v) => p.update({ downloadOnWifiOnly: v })} last />
      </SettingsGroup>

      <SettingsGroup title="Notifications">
        <SettingsRow icon="sparkles-outline" label="New releases" detail="From artists you follow"
          value={p.notifyNewReleases} onToggle={(v) => p.update({ notifyNewReleases: v })} />
        <SettingsRow icon="pricetag-outline" label="Exclusives and offers" detail="Early drops and deals"
          value={p.notifyGiftsAndOffers} onToggle={(v) => p.update({ notifyGiftsAndOffers: v })} last />
      </SettingsGroup>

      <SettingsGroup title="App">
        <SettingsRow icon="language-outline" label="Language" detail={p.language} onPress={() => p.update({ language: next(LANGUAGES, p.language) })} />
        <SettingsRow icon="document-text-outline" label="Terms and privacy" onPress={() => {}} last />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon="log-out-outline" label="Sign out" danger onPress={() => { p.signOut(); router.dismissAll(); }} last />
      </SettingsGroup>

      <Text style={[type.small, { textAlign: 'center', marginTop: space.lg, color: colors.textFaint }]}>
        Luganda translation is coming. Your choice is saved for now.
      </Text>
    </ScrollView>
  );
}
