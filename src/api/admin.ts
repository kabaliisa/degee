// Deegee staff only: the review queue and decisions.
import { api } from './client';
import type { StudioRelease } from './studio';

export type PendingArtist = {
  id: string; name: string; city: string; bio: string; genres: string[];
  accountPhone: string | null; payoutPhone: string | null; payoutProvider: string | null; appliedAt: string;
};
export type PendingRelease = { release: StudioRelease; artistName: string; firstRelease: boolean; flags: string[] };
export type PendingWithdrawal = { id: string; artistId: string; artistName: string; amountUgx: number; msisdn: string; provider: string; createdAt: string };

export type ReviewQueue = { artists: PendingArtist[]; releases: PendingRelease[]; withdrawals: PendingWithdrawal[] };
export type ReviewKind = 'artists' | 'releases' | 'withdrawals';

export const getReviewQueue = () => api<ReviewQueue>('GET', '/v1/admin/queue');

/** What the ledger says Deegee is holding. `cashUgx` is money in, `gapUgx` should always be zero. */
export type AdminFloat = {
  walletsUgx: number; artistEarningsUgx: number; payoutsInFlightUgx: number;
  uprsUgx: number; songwritersUgx: number; platformRevenueUgx: number;
  cashUgx: number; gapUgx: number;
};

/** What Deegee owes other people, as opposed to what it has earned. Summed here so it can never
 *  disagree with the lines above it. */
export const owedUgx = (f: AdminFloat) =>
  f.walletsUgx + f.artistEarningsUgx + f.payoutsInFlightUgx + f.uprsUgx + f.songwritersUgx;
/** `soldThroughUgx` is what fans paid artists; `revenueUgx` is Deegee's cut of it. Not the same number. */
export type AdminMoney = { soldThroughUgx: number; revenueUgx: number; toppedUpUgx: number; revenueAllTimeUgx: number };
export type AdminDay = { date: string; ugx: number };
export type AdminPeople = { fans: number; buyers: number; artistsLive: number; earning: number; waiting: number };
export type TopArtist = { artistId: string; name: string; earnedUgx: number; sales: number };

export type AdminInsights = {
  held: AdminFloat; money: AdminMoney; daily: AdminDay[]; people: AdminPeople; topArtists: TopArtist[];
};

export const getAdminInsights = () => api<AdminInsights>('GET', '/v1/admin/insights');

export const approve = (kind: ReviewKind, id: string) => api<void>('POST', `/v1/admin/${kind}/${encodeURIComponent(id)}/approve`);

/** Sends it back with a note the artist will see. */
export const sendBack = (kind: ReviewKind, id: string, note: string) =>
  api<void>('POST', `/v1/admin/${kind}/${encodeURIComponent(id)}/reject`, { body: { note } });
