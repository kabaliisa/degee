import type { User } from '../store/session';
import { api } from './client';

export type CodeSent = { phone: string; expiresInSec: number };
export type Session = { accessToken: string; refreshToken: string; expiresInSec: number; user: User; isNewUser: boolean };

/** Texts a 6-digit sign-in code (in development it's printed in the API server's log). */
export const requestCode = (phone: string) => api<CodeSent>('POST', '/v1/auth/otp', { body: { phone }, auth: false });

export const verifyCode = (phone: string, code: string) =>
  api<Session>('POST', '/v1/auth/verify', { body: { phone, code }, auth: false });

export const getMe = () => api<User>('GET', '/v1/me');

export const updateMe = (patch: { name: string }) => api<User>('PATCH', '/v1/me', { body: patch });
