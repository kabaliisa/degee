import type { Track } from '../api/types';

/** 214 → "3:34" */
export const formatDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export const totalDuration = (list: Track[]) => list.reduce((s, t) => s + t.durationSec, 0);

/** Length of the free preview for songs you don't own. */
export const PREVIEW_SEC = 30;

/** Up to two initials for an avatar, e.g. "Solomon Kabaliisa" → "SK". */
export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
