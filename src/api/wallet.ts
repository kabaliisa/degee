import { api } from './client';
import type { ActivityItem } from './mappers';

/** Deegee credit (usually zero: purchases are paid for directly) and what the user has bought and given. */
export const getWallet = () => api<{ balanceUgx: number; activity: ActivityItem[] }>('GET', '/v1/wallet');

export const getLibrary = () => api<{ trackIds: string[] }>('GET', '/v1/me/library');
