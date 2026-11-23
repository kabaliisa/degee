import type { Artist } from '../api/types';

/**
 * An artist's page lives at deegee.ug/<handle>. It is the address they put in a bio, on a poster or
 * say out loud in an interview, so it is made of their name and nothing else -- no id, no /artist/.
 *
 * The handle is stored on the artist, not worked out from the name. It used to be derived here, and
 * that meant renaming an artist silently moved their page out from under every link anyone had
 * shared. Now a name is free to change and the address only moves when the artist moves it.
 *
 * What is left in this file is the rule for judging a handle somebody is typing, so the studio form
 * can say no before the request goes. The server checks the same thing and has the last word.
 */

/** The app's own addresses. An artist can never take one, or their page would hide a screen. */
const RESERVED = new Set([
  'activity', 'admin', 'artist', 'buy', 'gift', 'library', 'player', 'profile', 'release',
  'search', 'settings', 'sign-in', 'studio', 'welcome', 'about', 'help', 'terms', 'privacy',
  'api', 'assets', 'static', 'sitemap', 'robots', 'index', 'home', 'deegee',
]);

export const HANDLE_MIN = 2;
export const HANDLE_MAX = 40;

/** Lowercase, letters and digits kept, everything else a single hyphen. */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function artistSlug(artist: Pick<Artist, 'slug'>): string {
  return artist.slug;
}

/** Where to send the router for an artist. */
export function artistHref(artist: Pick<Artist, 'slug'>): string {
  return `/${artist.slug}`;
}

export function isReserved(slug: string): boolean {
  return RESERVED.has(slug.toLowerCase());
}

/**
 * Why a handle cannot be used, or null if it can. Shape only: whether somebody already has it is
 * the server's answer, not ours.
 */
export function handleProblem(handle: string): string | null {
  const value = handle.trim().toLowerCase();
  if (value.length < HANDLE_MIN) return `At least ${HANDLE_MIN} characters.`;
  if (value.length > HANDLE_MAX) return `At most ${HANDLE_MAX} characters.`;
  if (value !== slugify(value)) return 'Lowercase letters, numbers and hyphens only.';
  if (isReserved(value)) return 'That one is a Deegee page.';
  return null;
}

/** The artist whose page is at this address, if any. */
export function artistBySlug<T extends Pick<Artist, 'slug'>>(slug: string, artists: T[]): T | undefined {
  const wanted = slug.toLowerCase();
  return artists.find((a) => a.slug === wanted);
}
