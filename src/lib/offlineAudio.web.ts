/**
 * Saving songs in the browser, so a bought song plays with no connection and no data.
 *
 * Play links from the API are signed and expire, so a saved song can't be keyed by its URL. Each one is
 * stored under a stable path of its own, /offline-song/<trackId>, in a cache the service worker knows to
 * leave alone. Playing reads the bytes back and hands the player a blob: URL, which works whether or not
 * a service worker is running.
 */
const CACHE = 'deegee-songs';
const key = (trackId: string) => `/offline-song/${encodeURIComponent(trackId)}`;

export const canSaveSongs = typeof caches !== 'undefined';

/** Blob URLs stay valid until revoked, so each song keeps one and we hand the same one back. */
const urls = new Map<string, string>();

async function open() {
  return caches.open(CACHE);
}

export async function saveSong(trackId: string, url: string): Promise<void> {
  if (!canSaveSongs) return;
  // Fetched by the app rather than cache.add() so an expired or refused link fails here, not silently.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn’t download that song (${res.status})`);
  const blob = await res.blob();
  const cache = await open();
  await cache.put(
    key(trackId),
    new Response(blob, { headers: { 'content-type': blob.type || 'audio/mpeg', 'content-length': String(blob.size) } }),
  );
}

export async function savedSongUrl(trackId: string): Promise<string | null> {
  if (!canSaveSongs) return null;
  const existing = urls.get(trackId);
  if (existing) return existing;
  const hit = await (await open()).match(key(trackId));
  if (!hit) return null;
  const url = URL.createObjectURL(await hit.blob());
  urls.set(trackId, url);
  return url;
}

export async function removeSong(trackId: string): Promise<void> {
  if (!canSaveSongs) return;
  await (await open()).delete(key(trackId));
  const url = urls.get(trackId);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(trackId);
  }
}

export async function removeAllSongs(): Promise<void> {
  if (!canSaveSongs) return;
  await caches.delete(CACHE);
  urls.forEach((url) => URL.revokeObjectURL(url));
  urls.clear();
}

export async function listSavedSongs(): Promise<string[]> {
  if (!canSaveSongs) return [];
  const keys = await (await open()).keys();
  return keys.map((r) => decodeURIComponent(new URL(r.url).pathname.replace('/offline-song/', '')));
}

export async function savedSongsBytes(): Promise<number> {
  if (!canSaveSongs) return 0;
  const cache = await open();
  const keys = await cache.keys();
  const sizes = await Promise.all(
    keys.map(async (r) => Number((await cache.match(r))?.headers.get('content-length') ?? 0)),
  );
  return sizes.reduce((a, b) => a + b, 0);
}
