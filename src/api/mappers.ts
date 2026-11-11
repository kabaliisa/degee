// Converts between the API's JSON and the app's own types. Pure, so it's unit tested.
import type { Provider } from '../lib/phone';
import type { WalletTx } from './types';

export type ServerProvider = 'MTN_MOMO' | 'AIRTEL_MONEY';

export const toServerProvider = (p: Provider): ServerProvider => (p === 'MTN MoMo' ? 'MTN_MOMO' : 'AIRTEL_MONEY');

export const fromServerProvider = (p: ServerProvider | null | undefined): Provider | undefined =>
  p === 'MTN_MOMO' ? 'MTN MoMo' : p === 'AIRTEL_MONEY' ? 'Airtel Money' : undefined;

/** One row of GET /v1/wallet `activity`. */
export type ActivityItem = {
  id: string;
  type: WalletTx['kind'];
  status: WalletTx['status'];
  amountUgx: number;
  description: string;
  note: string | null;
  provider: ServerProvider | null;
  at: string; // ISO-8601
};

export function toWalletTx(a: ActivityItem): WalletTx {
  return {
    id: a.id,
    at: Date.parse(a.at),
    kind: a.type,
    amount: a.amountUgx,
    label: a.description,
    status: a.status,
    note: a.note ?? undefined,
    provider: fromServerProvider(a.provider),
  };
}
