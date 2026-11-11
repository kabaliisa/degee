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

export const approve = (kind: ReviewKind, id: string) => api<void>('POST', `/v1/admin/${kind}/${encodeURIComponent(id)}/approve`);

/** Sends it back with a note the artist will see. */
export const sendBack = (kind: ReviewKind, id: string, note: string) =>
  api<void>('POST', `/v1/admin/${kind}/${encodeURIComponent(id)}/reject`, { body: { note } });
