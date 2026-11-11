import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getArtist, getRelease, getTrack, tracksForRelease } from '../data/catalog';
import { TERMS, splitGift, splitSale } from '../lib/money';

import type { Provider } from '../lib/phone';
export type { Provider };

export type WalletTx = {
  id: string;
  at: number;
  kind: 'TOPUP' | 'PURCHASE' | 'GIFT';
  amount: number; // + for top-up, − for purchase or gift
  note?: string;
  label: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
};

export type PurchaseResult = { ok: true } | { ok: false; reason: 'INSUFFICIENT_FUNDS' | 'ALREADY_OWNED' | 'NOT_FOUND' | 'TOO_SMALL'; shortBy?: number };

type WalletState = {
  balance: number;
  ownedTracks: string[];
  txs: WalletTx[];
  topUp: (amount: number, provider: Provider, phone: string) => Promise<WalletTx>;
  buyTrack: (trackId: string) => PurchaseResult;
  buyRelease: (releaseId: string) => PurchaseResult;
  sendGift: (artistId: string, amount: number, note?: string) => PurchaseResult;
  owns: (trackId: string) => boolean;
  reset: () => void;
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Mock of the mobile money flow: in the real app the API creates a payment intent,
// the user approves a PIN prompt on their phone, and a provider webhook confirms it.
const mockMobileMoneyApproval = (ms = 1800) => new Promise<boolean>((res) => setTimeout(() => res(true), ms));

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: 5000, // demo starting balance
      ownedTracks: [],
      txs: [],

      topUp: async (amount, provider, phone) => {
        if (!Number.isInteger(amount) || amount < TERMS.minTopUp || amount > TERMS.maxTopUp) {
          throw new Error(`Top up between UGX ${TERMS.minTopUp} and UGX ${TERMS.maxTopUp.toLocaleString('en-US')}`);
        }
        const tx: WalletTx = { id: newId(), at: Date.now(), kind: 'TOPUP', amount, label: `${provider} · ${phone}`, status: 'PENDING' };
        set((s) => ({ txs: [tx, ...s.txs] }));
        const approved = await mockMobileMoneyApproval();
        const status = approved ? 'COMPLETED' : 'FAILED';
        set((s) => ({
          balance: approved ? s.balance + amount : s.balance,
          txs: s.txs.map((t) => (t.id === tx.id ? { ...t, status } : t)),
        }));
        return { ...tx, status };
      },

      buyTrack: (trackId) => {
        const track = getTrack(trackId);
        if (!track) return { ok: false, reason: 'NOT_FOUND' };
        if (get().ownedTracks.includes(trackId)) return { ok: false, reason: 'ALREADY_OWNED' };
        const { balance } = get();
        if (balance < track.priceUGX) return { ok: false, reason: 'INSUFFICIENT_FUNDS', shortBy: track.priceUGX - balance };
        splitSale(track.priceUGX, track.writers); // validates; the server records the real ledger entries
        set((s) => ({
          balance: s.balance - track.priceUGX,
          ownedTracks: [...s.ownedTracks, trackId],
          txs: [{ id: newId(), at: Date.now(), kind: 'PURCHASE', amount: -track.priceUGX, label: track.title, status: 'COMPLETED' }, ...s.txs],
        }));
        return { ok: true };
      },

      buyRelease: (releaseId) => {
        const release = getRelease(releaseId);
        if (!release) return { ok: false, reason: 'NOT_FOUND' };
        const ids = tracksForRelease(releaseId).map((t) => t.id);
        const missing = ids.filter((id) => !get().ownedTracks.includes(id));
        if (missing.length === 0) return { ok: false, reason: 'ALREADY_OWNED' };
        const { balance } = get();
        if (balance < release.priceUGX) return { ok: false, reason: 'INSUFFICIENT_FUNDS', shortBy: release.priceUGX - balance };
        set((s) => ({
          balance: s.balance - release.priceUGX,
          ownedTracks: [...s.ownedTracks, ...missing],
          txs: [{ id: newId(), at: Date.now(), kind: 'PURCHASE', amount: -release.priceUGX, label: `${release.title} (${release.type})`, status: 'COMPLETED' }, ...s.txs],
        }));
        return { ok: true };
      },

      sendGift: (artistId, amount, note) => {
        const artist = getArtist(artistId);
        if (!artist) return { ok: false, reason: 'NOT_FOUND' };
        if (!Number.isInteger(amount) || amount < TERMS.minGift) return { ok: false, reason: 'TOO_SMALL' };
        const { balance } = get();
        if (balance < amount) return { ok: false, reason: 'INSUFFICIENT_FUNDS', shortBy: amount - balance };
        splitGift(amount); // validates; the server records the real ledger entries
        const clean = note?.trim().slice(0, 140) || undefined;
        set((s) => ({
          balance: s.balance - amount,
          txs: [{ id: newId(), at: Date.now(), kind: 'GIFT', amount: -amount, label: artist.name, note: clean, status: 'COMPLETED' }, ...s.txs],
        }));
        return { ok: true };
      },

      owns: (trackId) => get().ownedTracks.includes(trackId),
      reset: () => set({ balance: 5000, ownedTracks: [], txs: [] }),
    }),
    {
      name: 'deegee-wallet',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ balance: s.balance, ownedTracks: s.ownedTracks, txs: s.txs.filter((t) => t.status !== 'PENDING') }),
    },
  ),
);
