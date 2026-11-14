/**
 * Where Deegee lives on the web. Used wherever a link has to work outside the app — a shared release,
 * the canonical address of a page — so it must be absolute and must match the real domain.
 */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://deegee.ug').replace(/\/$/, '');

export const siteUrl = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
