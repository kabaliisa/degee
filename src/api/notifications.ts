import { api } from './client';

/** Which notifications this user wants. Account and payout changes aren't here: they can't be switched off. */
export type NotificationPrefs = {
  sales: boolean;
  gifts: boolean;
  payouts: boolean;
  releases: boolean;
};

export const getNotificationPrefs = () => api<NotificationPrefs>('GET', '/v1/me/notifications');

/** Send only the switch that moved; the server leaves the rest alone. */
export const setNotificationPrefs = (patch: Partial<NotificationPrefs>) =>
  api<NotificationPrefs>('PUT', '/v1/me/notifications', { body: patch });

export const registerPushToken = (token: string, platform: string) =>
  api<void>('POST', '/v1/me/push-tokens', { body: { token, platform } });

export const forgetPushToken = (token: string) =>
  api<void>('DELETE', '/v1/me/push-tokens', { body: { token } });
