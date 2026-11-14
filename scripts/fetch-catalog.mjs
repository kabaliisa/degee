/**
 * Takes a copy of the catalogue for the build.
 *
 * The website is rendered to HTML on this machine, before any browser runs, so the artists and songs
 * have to be here as data rather than arriving from a fetch later. The same copy is what the app shows
 * in the first instant after opening, and what it falls back to with no connection. The live catalogue
 * is fetched over the top as soon as the app starts.
 */
import { writeFileSync } from 'node:fs';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
const OUT = 'src/api/catalog.seed.json';

try {
  const res = await fetch(`${API}/v1/catalog`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const snapshot = await res.json();
  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`${OUT}: ${snapshot.artists.length} artists, ${snapshot.releases.length} releases, ${snapshot.tracks.length} songs`);
} catch (e) {
  // Keeping the previous copy is better than failing the build, but a stale catalogue means new
  // releases have no page of their own until the next build that can reach the API.
  console.warn(`Couldn't reach ${API} (${e.message}). Building with the catalogue already in ${OUT}.`);
}
