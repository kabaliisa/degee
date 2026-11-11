import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SettingsGroup, SettingsRow } from '../components/profile/SettingsRow';
import { colors, space, type } from '../lib/theme';
import { formatPhone } from '../lib/phone';
import { displayName, useSession } from '../store/session';
import { useSettings, type Language, type Quality } from '../store/settings';

const QUALITIES: Quality[] = ['Low', 'Normal', 'High'];
const LANGUAGES: Language[] = ['English', 'Luganda'];
const cycle = <T,>(list: T[], current: T) => list[(list.indexOf(current) + 1) % list.length];

export default function Settings() {
  const p = useSettings();
  const user = useSession((s) => s.user);

  const signOut = () => {
    if (router.canDismiss()) router.dismissAll();
    useSession.getState().signOut(); // the root layout then shows the sign-in screen
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SettingsGroup title="Account">
        {/* Name is edited on the Profile screen, one step back. */}
        <SettingsRow icon="person-outline" label="Name" detail={displayName(user)} onPress={() => router.back()} />
        <SettingsRow icon="phone-portrait-outline" label="Mobile money number" detail={user ? formatPhone(user.phone) : ''} last />
      </SettingsGroup>

      <SettingsGroup title="Data and audio">
        <SettingsRow icon="cellular-outline" label="Data saver" detail="Lowest audio quality on mobile data"
          value={p.dataSaver} onToggle={(v) => p.update({ dataSaver: v })} />
        <SettingsRow icon="musical-note-outline" label="Streaming quality" detail={p.dataSaver ? 'Low (data saver)' : p.streamQuality}
          onPress={() => p.update({ streamQuality: cycle(QUALITIES, p.streamQuality) })} />
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
        <SettingsRow icon="language-outline" label="Language" detail={p.language} onPress={() => p.update({ language: cycle(LANGUAGES, p.language) })} />
        {/* Placeholder until the terms page exists. */}
        <SettingsRow icon="document-text-outline" label="Terms and privacy" onPress={() => {}} last />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon="log-out-outline" label="Sign out" danger onPress={signOut} last />
      </SettingsGroup>

      <Text style={[type.small, styles.footnote]}>Luganda translation is coming. Your choice is saved for now.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl * 2 },
  footnote: { textAlign: 'center', marginTop: space.lg, color: colors.textFaint },
});
