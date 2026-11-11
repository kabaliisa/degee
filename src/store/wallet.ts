import { create } from 'zustand';
import { ApiError } from '../api/client';
import { toWalletTx } from '../api/mappers';
import type { WalletTx } from '../api/types';
import * as walletApi from '../api/wallet';
import type { Provider } from '../lib/phone';

export type { Provider, WalletTx };

export type PurchaseResult =
  | { ok: true; artistReceives?: number }
  | { ok: false; reason: 'INSUFFICIENT_FUNDS' | 'ALREADY_OWNED' | 'TOO_SMALL' | 'NETWORK' | 'ERROR'; message: string; shortBy?: number };

export type TopUpOutcome = 'COMPLETED' | 'FAILED' | 'PENDING';

type WalletState = {
  balance: number;
  ownedTracks: string[];
  txs: WalletTx[];
  loaded: boolean;
  /** Reloads balance, activity and library from the server. */
  refresh: () => Promise<void>;
  /** Sends the PIN prompt and waits for the answer (up to about two minutes). */
  topUp: (amount: number, provider: Provider, phone: string, idempotencyKey: string) => Promise<TopUpOutcome>;
  buy: (kind: 'TRACK' | 'RELEASE', id: string, idempotencyKey: string) => Promise<PurchaseResult>;
  sendGift: (artistId: string, amount: number, note: string, idempotencyKey: string) => Promise<PurchaseResult>;
  owns: (trackId: string) => boolean;
  reset: () => void;
};

const POLL_MS = 1500;
const POLL_FOR_MS = 120_000; // providers expire PIN prompts after a couple of minutes

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function failure(e: unknown): Extract<PurchaseResult, { ok: false }> {
  if (!(e instanceof ApiError)) return { ok: false, reason: 'ERROR', message: 'Something went wrong. Try again.' };
  const shortBy = typeof e.details.shortBy === 'number' ? e.details.shortBy : undefined;
  switch (e.code) {
    case 'INSUFFICIENT_FUNDS': return { ok: false, reason: 'INSUFFICIENT_FUNDS', message: e.message, shortBy };
    case 'ALREADY_OWNED': return { ok: false, reason: 'ALREADY_OWNED', message: 'You already own this.' };
    case 'GIFT_TOO_SMALL': return { ok: false, reason: 'TOO_SMALL', message: e.message };
    case 'NETWORK': return { ok: false, reason: 'NETWORK', message: e.message };
    default: return { ok: false, reason: 'ERROR', message: e.message };
  }
}

const empty = { balance: 0, ownedTracks: [] as string[], txs: [] as WalletTx[], loaded: false };

export const useWallet = create<WalletState>()((set, get) => ({
  ...empty,

  refresh: async () => {
    const [wallet, library] = await Promise.all([walletApi.getWallet(), walletApi.getLibrary()]);
    set({ balance: wallet.balanceUgx, txs: wallet.activity.map(toWalletTx), ownedTracks: library.trackIds, loaded: true });
  },

  topUp: async (amount, provider, phone, idempotencyKey) => {
    let topUp = await walletApi.startTopUp(amount, provider, phone, idempotencyKey);
    await get().refresh(); // shows "Waiting for your PIN" in activity straight away
    const deadline = Date.now() + POLL_FOR_MS;
    while (topUp.status === 'PENDING' && Date.now() < deadline) {
      await wait(POLL_MS);
      topUp = await walletApi.getTopUp(topUp.id);
    }
    await get().refresh();
    return topUp.status;
  },

  buy: async (kind, id, idempotencyKey) => {
    try {
      const receipt = await walletApi.purchase(kind, id, idempotencyKey);
      set((s) => ({ balance: receipt.balanceUgx, ownedTracks: [...new Set([...s.ownedTracks, ...receipt.trackIds])] }));
      void get().refresh().catch(() => {}); // activity list; the purchase itself already succeeded
      return { ok: true };
    } catch (e) {
      const f = failure(e);
      if (f.reason === 'ALREADY_OWNED' || f.reason === 'INSUFFICIENT_FUNDS') void get().refresh().catch(() => {});
      return f;
    }
  },

  sendGift: async (artistId, amount, note, idempotencyKey) => {
    try {
      const receipt = await walletApi.sendGift(artistId, amount, note.trim() || undefined, idempotencyKey);
      set({ balance: receipt.balanceUgx });
      void get().refresh().catch(() => {});
      return { ok: true, artistReceives: receipt.artistReceivesUgx };
    } catch (e) {
      return failure(e);
    }
  },

  owns: (trackId) => get().ownedTracks.includes(trackId),
  reset: () => set(empty),
}));

/** Total spent on music and gifts: money that went to artists, songwriters and Deegee. */
export const sentToArtists = (txs: WalletTx[]) =>
  txs.filter((t) => t.kind !== 'TOPUP' && t.status === 'COMPLETED').reduce((sum, t) => sum - t.amount, 0);
