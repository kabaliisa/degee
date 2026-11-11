// Home headline: tells the listener what's new instead of a generic greeting.
export type WhatsNewRelease = { id: string; artistId: string; year: number; trackIds: string[] };
export type WhatsNew = { headline: string; detail: string; releaseIds: string[] };

const NEW_FROM_YEAR = 2026; // mock catalogue has years only; the API will send release dates

function names(list: string[]) {
  if (list.length <= 1) return list.join('');
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list[0]}, ${list[1]} and more`;
}

/**
 * Priority: new music from artists you follow → new music overall → caught up.
 * Releases you already fully own don't count as new.
 */
export function whatsNew(
  releases: WhatsNewRelease[],
  following: string[],
  owned: string[],
  artistName: (id: string) => string,
): WhatsNew {
  const fresh = releases.filter((r) => r.year >= NEW_FROM_YEAR && !r.trackIds.every((t) => owned.includes(t)));
  const followed = fresh.filter((r) => following.includes(r.artistId));
  const pick = followed.length ? followed : fresh;
  if (pick.length === 0) {
    return { headline: "You're all caught up", detail: 'Find new artists to support below', releaseIds: [] };
  }
  const n = pick.length;
  const artistsInPick = [...new Set(pick.map((r) => r.artistId))].map(artistName);
  return {
    headline: followed.length
      ? `${n} new from your artists`
      : `${n} new ${n === 1 ? 'release' : 'releases'} this week`,
    detail: `From ${names(artistsInPick)}`,
    releaseIds: pick.map((r) => r.id),
  };
}
