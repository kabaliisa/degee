import type { Provider } from '../lib/phone';
import { api } from './client';
import { toServerProvider, type ActivityItem } from './mappers';

export type TopUp = { id: string; status: 'PENDING' | 'COMPLETED' | 'FAILED'; amountUgx: number };
export type PurchaseReceipt = { transactionId: string; chargedUgx: number; balanceUgx: number; trackIds: string[] };
export type GiftReceipt = { transactionId: string; amountUgx: number; artistReceivesUgx: number; balanceUgx: number };

export const getWallet = () => api<{ balanceUgx: number; activity: ActivityItem[] }>('GET', '/v1/wallet');

export const getLibrary = () => api<{ trackIds: string[] }>('GET', '/v1/me/library');

/** Sends the PIN prompt. Poll getTopUp until it's no longer PENDING. */
export const startTopUp = (amountUgx: number, provider: Provider, phone: string, idempotencyKey: string) =>
  api<TopUp>('POST', '/v1/wallet/topups', { body: { amountUgx, provider: toServerProvider(provider), phone }, idempotencyKey });

export const getTopUp = (id: string) => api<TopUp>('GET', `/v1/wallet/topups/${encodeURIComponent(id)}`);

export const purchase = (kind: 'TRACK' | 'RELEASE', id: string, idempotencyKey: string) =>
  api<PurchaseReceipt>('POST', '/v1/purchases', { body: { kind, id }, idempotencyKey });

export const sendGift = (artistId: string, amountUgx: number, note: string | undefined, idempotencyKey: string) =>
  api<GiftReceipt>('POST', '/v1/gifts', { body: { artistId, amountUgx, note }, idempotencyKey });
