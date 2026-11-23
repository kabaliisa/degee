import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
// Named rather than reached through the namespace: these two are star-re-exported from a submodule,
// which the lint resolver doesn't follow even though TypeScript does.
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';
import { forgetPushToken, registerPushToken } from '../api/notifications';

/** Must match the channelId the server puts on every message, or Android shows nothing. */
const CHANNEL = 'deegee-money';

/** The token this device is registered under, so sign-out can hand it back. */
let current: string | null = null;

/**
 * Where notifications come from, and what the phone does with one that arrives while Deegee is open.
 *
 * <p>Push needs a development or release build: Expo Go on Android hasn't carried remote push since
 * SDK 53, and the web build has no push at all. Everything here fails quietly in those cases, because
 * a missing notification is never a reason for the app not to start.
 */
export function configurePushHandler() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      // A sale is good news, not an alarm, and Deegee is often open while someone is listening.
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Asks for permission and tells the server where to reach this phone. Safe to call more than once:
 * the server moves an existing token to whoever is signed in now.
 *
 * @returns the Expo push token, or null if this phone can't or won't receive notifications
 */
export async function registerThisPhone(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    // Android 13 and up only shows the permission prompt once a channel exists, so this comes first.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Sales and withdrawals',
        importance: AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const granted = existing.granted
      || existing.ios?.status === IosAuthorizationStatus.PROVISIONAL
      || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null; // their phone, their choice

    // Assigned by EAS, not by us. Without it Expo can't mint a token for this project.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('No EAS projectId in app config, so this phone cannot be registered for notifications.');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await registerPushToken(token, Platform.OS);
    current = token;
    return token;
  } catch (e) {
    // A simulator, no network, a revoked certificate. The app carries on without notifications.
    console.warn('Could not register this phone for notifications', e);
    return null;
  }
}

/** On sign-out, so the next person on this phone doesn't get the last one's sales. */
export async function forgetThisPhone() {
  const token = current;
  current = null;
  if (!token) return;
  try {
    await forgetPushToken(token);
  } catch {
    // Signing out matters more than tidying up. The server drops the token when Expo reports it dead,
    // and moves it the moment somebody else registers the same phone.
  }
}

/** Where tapping a notification should take you, if it said. */
export function destinationOf(notification: Notifications.Notification): string | null {
  const to = notification.request.content.data?.to;
  return typeof to === 'string' && to.startsWith('/') ? to : null;
}
