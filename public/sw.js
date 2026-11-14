/* Deegee service worker.
 *
 * Two jobs: open instantly on a slow connection, and open at all with no connection. It caches the app
 * shell and the hashed JavaScript, and nothing else — the API and the audio are handled by the app, which
 * knows who is signed in and what they have bought. Songs saved for offline live in SONG_CACHE, written by
 * src/lib/offlineAudio.web.ts; this file only takes care not to delete them.
 */
const VERSION = 'v1';
const SHELL_CACHE = `deegee-shell-${VERSION}`;
const SONG_CACHE = 'deegee-songs';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

/**
 * Everything the site is made of, written by scripts/build-web.mjs because the names carry a build hash.
 * Holding all of it means every screen works offline, not only the ones visited before the signal went.
 */
async function precacheList() {
  try {
    const res = await fetch('/precache.json', { cache: 'no-cache' });
    return res.ok ? (await res.json()).files ?? [] : [];
  } catch {
    return []; // a dev build has no list; runtime caching still covers what gets used
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SHELL);
      // One at a time and forgiving: one missing file shouldn't leave the app with no cache at all.
      const files = await precacheList();
      await Promise.all(files.map((f) => cache.add(f).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n.startsWith('deegee-shell-') && n !== SHELL_CACHE).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

/** The API and the media it serves are never cached here: they are private, signed, or both. */
function isAppData(url) {
  return url.pathname.startsWith('/v1/') || url.pathname.startsWith('/media/') || url.pathname.startsWith('/offline-song/');
}

/** Anything under a hashed path can be cached forever, because a new build gets a new name. */
function isImmutable(url) {
  return url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isAppData(url)) return;

  // Every route is served by the same shell, so a page opened offline still works.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          // A host with no rewrite rule answers /release/123 with a 404; the app owns its own routes,
          // so serve the shell and let it decide what that path means.
          if (!res.ok) return (await caches.match('/', { ignoreSearch: true })) ?? res;
          caches.open(SHELL_CACHE).then((c) => c.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/', { ignoreSearch: true }).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  if (isImmutable(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Icons, the manifest, fonts: show what we have, fetch a fresher copy for next time.
  event.respondWith(
    caches.match(request).then((hit) => {
      const fresh = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit ?? Response.error());
      return hit ?? fresh;
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
  if (event.data === 'song-cache-name') event.ports[0]?.postMessage(SONG_CACHE);
});
