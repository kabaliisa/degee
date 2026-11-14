import type { Provider } from '../lib/phone';
import { api } from './client';
import { toServerProvider } from './mappers';

/** What is being paid for: a song, a whole release, or a gift to an artist. */
export type CheckoutItem =
  | { kind: 'TRACK' | 'RELEASE'; id: string }
  | { kind: 'GIFT'; id: string; amountUgx: number; note?: string };

/** Where the PIN prompt goes. */
export type PayWith = { provider: Provider; phone: string };

/**
 * WAITING: approve the prompt on your phone. COMPLETED: paid and delivered. DECLINED: not approved, nothing
 * charged. CREDITED: paid, but it couldn't be completed (see failureCode), so the money is kept as credit.
 */
export type OrderStatus = 'WAITING' | 'COMPLETED' | 'DECLINED' | 'CREDITED';

export type Order = {
  id: string;
  status: OrderStatus;
  kind: CheckoutItem['kind'];
  itemId: string;
  amountUgx: number; // the price, or the gift
  collectUgx: number; // asked for on the phone; 0 when credit covered it
  trackIds: string[]; // songs now owned
  failureCode: string | null;
  failureMessage: string | null;
  creditUgx: number; // Deegee credit left afterwards
};

/** Starts a checkout. While the order is WAITING, poll getOrder. */
export const startCheckout = (item: CheckoutItem, pay: PayWith | null, idempotencyKey: string) =>
  api<Order>('POST', '/v1/checkout', {
    body: { ...item, ...(pay ? { provider: toServerProvider(pay.provider), phone: pay.phone } : {}) },
    idempotencyKey,
  });

export const getOrder = (id: string) => api<Order>('GET', `/v1/checkout/${encodeURIComponent(id)}`);
