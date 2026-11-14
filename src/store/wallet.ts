import { create } from 'zustand';
import { getOrder, startCheckout, type CheckoutItem, type Order, type PayWith } from '../api/checkout';
import { toWalletTx } from '../api/mappers';
import type { WalletTx } from '../api/types';
import * as walletApi from '../api/wallet';
import type { Provider } from '../lib/phone';

export type { Provider, WalletTx };

type WalletState = {
  /** Deegee credit. Normally zero: it only holds money from a payment that couldn't be completed, and is used first at checkout. */
  balance: number;
  ownedTracks: string[];
  txs: WalletTx[];
  loaded: boolean;
  /** Reloads credit, purchase history and the library from the server. */
  refresh: () => Promise<void>;
  /** Starts paying for something. Throws an ApiError if it can't be bought. A WAITING order needs awaitOrder. */
  startCheckout: (item: CheckoutItem, pay: PayWith | null, idempotencyKey: string) => Promise<Order>;
  /** Waits for the answer to the PIN prompt (up to about two minutes). Still WAITING afterwards means no answer yet. */
  awaitOrder: (order: Order) => Promise<Order>;
  owns: (trackId: string) => boolean;
  reset: () => void;
};

const POLL_MS = 1500;
const POLL_FOR_MS = 120_000; // providers expire PIN prompts after a couple of minutes

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const empty = { balance: 0, ownedTracks: [] as string[], txs: [] as WalletTx[], loaded: false };

export const useWallet = create<WalletState>()((set, get) => {
  /** Applies a finished order straight away, so the song plays in full before the next refresh lands. */
  const apply = (order: Order) => {
    if (order.status === 'WAITING') return;
    set((s) => ({ balance: order.creditUgx, ownedTracks: [...new Set([...s.ownedTracks, ...order.trackIds])] }));
    void get().refresh().catch(() => {}); // history; the order itself is already settled
  };

  return {
    ...empty,

    refresh: async () => {
      const [wallet, library] = await Promise.all([walletApi.getWallet(), walletApi.getLibrary()]);
      set({ balance: wallet.balanceUgx, txs: wallet.activity.map(toWalletTx), ownedTracks: library.trackIds, loaded: true });
    },

    startCheckout: async (item, pay, idempotencyKey) => {
      const order = await startCheckout(item, pay, idempotencyKey);
      apply(order);
      return order;
    },

    awaitOrder: async (order) => {
      const deadline = Date.now() + POLL_FOR_MS;
      let latest = order;
      while (latest.status === 'WAITING' && Date.now() < deadline) {
        await wait(POLL_MS);
        try {
          latest = await getOrder(order.id);
        } catch {
          // A dropped connection while waiting isn't an answer; keep asking until the deadline.
        }
      }
      apply(latest);
      return latest;
    },

    owns: (trackId) => get().ownedTracks.includes(trackId),
    reset: () => set(empty),
  };
});

/** Total spent on music and gifts: money that went to artists, songwriters and Deegee. */
export const sentToArtists = (txs: WalletTx[]) =>
  txs.filter((t) => t.kind !== 'TOPUP' && t.status === 'COMPLETED').reduce((sum, t) => sum - t.amount, 0);
