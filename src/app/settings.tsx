import { getPermissionsAsync, IosAuthorizationStatus } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { getNotificationPrefs, setNotificationPrefs, type NotificationPrefs } from '../api/notifications';
import { getMyArtist } from '../api/studio';
import { SettingsGroup, SettingsRow } from '../components/profile/SettingsRow';
import { forgetThisPhone } from '../lib/push';
import { colors, radius, space, type } from '../lib/theme';
import { formatPhone } from '../lib/phone';
import { displayName, useSession } from '../store/session';
import { formatBytes, useOffline } from '../store/offline';
import { useSettings, type Language, type Quality } from '../store/settings';

const QUALITIES: Quality[] = ['Low', 'Normal', 'High'];
const LANGUAGES: Language[] = ['English', 'Luganda'];
const cycle = <T,>(list: T[], current: T) => list[(list.indexOf(current) + 1) % list.length];

/** Puts a failed switch back where it was, without assuming what the rest of the set looks like. */
const invert = (patch: Partial<NotificationPrefs>) =>
  Object.fromEntries(Object.entries(patch).map(([key, on]) => [key, !on])) as Partial<NotificationPrefs>;

export default function Settings() {
  const p = useSettings();
  const user = useSession((s) => s.user);
  const offline = useOffline();

  // Notification switches only mean something to an artist, so the group appears only if this account
  // has an artist profile. Nothing here blocks the rest of the screen if either call fails.
  const [isArtist, setIsArtist] = useState(false);
  const [notify, setNotify] = useState<NotificationPrefs>({ sales: true, gifts: true, payouts: true, releases: true });
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    getMyArtist().then(() => setIsArtist(true)).catch(() => setIsArtist(false));
    getNotificationPrefs().then(setNotify).catch(() => {});
    if (Platform.OS !== 'web') {
      getPermissionsAsync()
        .then((s) => setBlocked(!s.granted && s.ios?.status !== IosAuthorizationStatus.PROVISIONAL))
        .catch(() => {});
    }
  }, []);

  /**
   * Moves the switch at once and tells the server. The server answers with the whole set, so whichever
   * call lands last is what the screen shows -- flicking two switches quickly can't lose one. On a
   * failure the switch goes back, so nobody is left believing a notification is off when it isn't.
   */
  const change = async (patch: Partial<NotificationPrefs>) => {
    setNotify((before) => ({ ...before, ...patch }));
    try {
      setNotify(await setNotificationPrefs(patch));
    } catch {
      setNotify((shown) => ({ ...shown, ...invert(patch) }));
    }
  };

  const signOut = () => {
    if (router.canDismiss()) router.dismissAll();
    // Hand the phone back before the token goes, or the next person signing in here inherits
    // this account's sales notifications.
    void forgetThisPhone().finally(() => useSession.getState().signOut());
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
          value={p.downloadOnWifiOnly} onToggle={(v) => p.update({ downloadOnWifiOnly: v })} last={!offline.supported} />
        {offline.supported ? (
          <SettingsRow icon="cloud-done-outline" label="Saved on this device"
            detail={offline.saved.length ? `${offline.saved.length} song${offline.saved.length === 1 ? '' : 's'} · ${formatBytes(offline.bytes)}` : 'No songs saved yet'}
            last={!offline.saved.length} />
        ) : null}
        {offline.supported && offline.saved.length ? (
          <SettingsRow icon="trash-outline" label="Remove saved songs" danger onPress={() => void offline.removeAll()} last />
        ) : null}
      </SettingsGroup>

      {isArtist ? (
        <SettingsGroup title="Your music">
          {blocked ? (
            <Pressable onPress={() => void Linking.openSettings()} style={styles.blocked}>
              <Text style={[type.bodyBold, styles.blockedTitle]}>Turn on notifications</Text>
              <Text style={type.small}>Your phone is blocking them. Deegee can’t tell you about a sale until you allow it.</Text>
            </Pressable>
          ) : null}
          <SettingsRow icon="cash-outline" label="Song sold" detail="When a fan buys your music"
            value={notify.sales} onToggle={(v) => void change({ sales: v })} />
          <SettingsRow icon="gift-outline" label="Gifts" detail="When a fan sends you money"
            value={notify.gifts} onToggle={(v) => void change({ gifts: v })} />
          <SettingsRow icon="wallet-outline" label="Withdrawals" detail="When money reaches your phone"
            value={notify.payouts} onToggle={(v) => void change({ payouts: v })} />
          <SettingsRow icon="checkmark-circle-outline" label="Releases" detail="When your music goes live"
            value={notify.releases} onToggle={(v) => void change({ releases: v })} last />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title="Notifications">
        <SettingsRow icon="lock-closed-outline" label="Account and payout changes" detail="Always on" last />
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
  // Gold, because it is the one row here that is asking for something rather than offering a choice.
  blocked: { backgroundColor: colors.accentSoft, borderRadius: radius.md, margin: space.md, padding: space.md, gap: 2 },
  blockedTitle: { color: colors.accentText },
  footnote: { textAlign: 'center', marginTop: space.lg, color: colors.textFaint },
});
