import type { Artist } from '../api/types';

/**
 * An artist's page lives at deegee.ug/<slug>. It is the address they put in a bio, on a poster or
 * say out loud in an interview, so it is made of their name and nothing else -- no id, no /artist/.
 *
 * The slug is worked out from the name rather than stored, so every artist has one the moment they
 * exist, whether they came from the server or the seed. HANDLES overrides the ones where the plain
 * rule reads badly: an artist who performs as "A Pass" wants /apass, not /a-pass.
 */
const HANDLES: Record<string, string> = {
  a5: 'mukasa', // Mukasa the MC -- the whole stage name is a mouthful in a URL
};

/** The app's own addresses. An artist can never take one, or their page would hide a screen. */
const RESERVED = new Set([
  'activity', 'admin', 'artist', 'buy', 'gift', 'library', 'player', 'profile', 'release',
  'search', 'settings', 'sign-in', 'studio', 'welcome', 'about', 'help', 'terms', 'privacy',
  'api', 'assets', 'static', 'sitemap', 'robots', 'index', 'home', 'deegee',
]);

/** Lowercase, letters and digits kept, everything else a single hyphen. */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function artistSlug(artist: Pick<Artist, 'id' | 'name'>): string {
  const slug = HANDLES[artist.id] ?? slugify(artist.name);
  // A name that collides with one of our own screens falls back to a form that cannot: better a
  // slightly longer address than a page that shadows the library.
  return RESERVED.has(slug) ? `${slug}-music` : slug;
}

/** Where to send the router for an artist. */
export function artistHref(artist: Pick<Artist, 'id' | 'name'>): string {
  return `/${artistSlug(artist)}`;
}

export function isReserved(slug: string): boolean {
  return RESERVED.has(slug.toLowerCase());
}

/** The artist whose page is at this address, if any. */
export function artistBySlug<T extends Pick<Artist, 'id' | 'name'>>(slug: string, artists: T[]): T | undefined {
  const wanted = slug.toLowerCase();
  return artists.find((a) => artistSlug(a) === wanted);
}
