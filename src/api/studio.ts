// Artist mode: the artist's profile, releases, uploads, rights answers, earnings and withdrawals.
import type { Genre } from './types';
import type { PickedFile } from './client';
import { api, upload } from './client';

export type ArtistStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';
export type ReleaseStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED';
export type ReleaseType = 'SINGLE' | 'EP' | 'ALBUM';
export type LabelDeal = 'YES' | 'NO' | 'NOT_SURE';
export type Society = 'UPRS' | 'FOREIGN' | null;

export type ArtistProfile = {
  id: string; name: string; city: string; bio: string; genres: Genre[]; colors: [string, string];
  status: ArtistStatus; reviewNote: string | null; verified: boolean; payoutPhone: string | null; payoutProvider: string | null;
};

export type WriterInput = { name: string; sharePct: number; society: Society };

export type StudioTrack = {
  id: string; trackNo: number; title: string; priceUGX: number; durationSec: number;
  hasAudio: boolean; audioUrl: string | null; writers: WriterInput[];
};

export type Declaration = {
  signedToLabel: LabelDeal; labelName: string | null; releasedBefore: boolean; previousDistributor: string | null;
  coverOrSamples: boolean; hasLabelLetter: boolean; labelLetterUrl: string | null; acceptedAt: string;
};

export type StudioRelease = {
  id: string; artistId: string; title: string; type: 'Single' | 'EP' | 'Album'; priceUGX: number; colors: [string, string];
  coverUrl: string | null; status: ReleaseStatus; reviewNote: string | null; submittedAt: string | null; publishedAt: string | null;
  tracks: StudioTrack[]; declaration: Declaration | null;
  problems: string[]; // what's still missing before it can be submitted
};

export type EarningsLine = { id: string; type: string; amountUgx: number; description: string; at: string };
export type WithdrawalStatus = 'REQUESTED' | 'SENT' | 'COMPLETED' | 'FAILED' | 'REJECTED';
export type Withdrawal = { id: string; amountUgx: number; msisdn: string; provider: string; status: WithdrawalStatus; reviewNote: string | null; createdAt: string };

export type Earnings = {
  balanceUgx: number; availableUgx: number; heldUgx: number; nextUnlockAt: string | null; holdDays: number;
  minWithdrawalUgx: number; payoutPhone: string | null; payoutProvider: string | null;
  activity: EarningsLine[]; withdrawals: Withdrawal[];
};

export type Application = { name: string; city: string; bio: string; genres: Genre[]; payoutPhone: string };
export type ReleaseInput = { title: string; type: ReleaseType; priceUgx: number };
export type TrackInput = { title: string; priceUgx: number; writers: WriterInput[] };
export type DeclarationInput = {
  signedToLabel: LabelDeal; labelName?: string; releasedBefore: boolean; previousDistributor?: string;
  coverOrSamples: boolean; confirmOwnership: boolean;
};

/** Release type label ("EP") → API value ("EP"). */
export const releaseTypeOf = (label: StudioRelease['type']): ReleaseType => label.toUpperCase() as ReleaseType;

const r = (id: string) => `/v1/artist/releases/${encodeURIComponent(id)}`;

export const getMyArtist = () => api<ArtistProfile>('GET', '/v1/artist/me');
export const applyAsArtist = (a: Application) => api<ArtistProfile>('POST', '/v1/artist/application', { body: a });

export const listMyReleases = () => api<StudioRelease[]>('GET', '/v1/artist/releases');
export const getMyRelease = (id: string) => api<StudioRelease>('GET', r(id));
export const createRelease = (input: ReleaseInput) => api<StudioRelease>('POST', '/v1/artist/releases', { body: input });
export const editRelease = (id: string, input: ReleaseInput) => api<StudioRelease>('PATCH', r(id), { body: input });
export const deleteRelease = (id: string) => api<void>('DELETE', r(id));
export const uploadCover = (id: string, file: PickedFile) => upload<StudioRelease>(`${r(id)}/cover`, file);

export const addTrack = (id: string, input: TrackInput) => api<StudioRelease>('POST', `${r(id)}/tracks`, { body: input });
export const editTrack = (id: string, trackId: string, input: TrackInput) =>
  api<StudioRelease>('PATCH', `${r(id)}/tracks/${encodeURIComponent(trackId)}`, { body: input });
export const deleteTrack = (id: string, trackId: string) => api<StudioRelease>('DELETE', `${r(id)}/tracks/${encodeURIComponent(trackId)}`);
export const uploadAudio = (id: string, trackId: string, file: PickedFile) =>
  upload<StudioRelease>(`${r(id)}/tracks/${encodeURIComponent(trackId)}/audio`, file);

export const declareRights = (id: string, input: DeclarationInput) => api<StudioRelease>('PUT', `${r(id)}/declaration`, { body: input });
export const uploadLabelLetter = (id: string, file: PickedFile) => upload<StudioRelease>(`${r(id)}/label-letter`, file);
export const submitRelease = (id: string) => api<StudioRelease>('POST', `${r(id)}/submit`);

export const getEarnings = () => api<Earnings>('GET', '/v1/artist/earnings');
export const withdraw = (amountUgx: number, idempotencyKey: string) =>
  api<Withdrawal>('POST', '/v1/artist/withdrawals', { body: { amountUgx }, idempotencyKey });

/** A link to play a song's real recording (for buyers, its artist and admins). */
export const getPlayLink = (trackId: string) => api<{ url: string; expiresAt: string }>('GET', `/v1/tracks/${encodeURIComponent(trackId)}/play`);
