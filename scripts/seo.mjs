/**
 * Makes the exported site findable.
 *
 * Expo writes one HTML file per page but puts no title, description or preview card in them, and
 * `generateMetadata` only runs for server-rendered output, not a static export. So the head tags are
 * written here, from the same catalogue copy the pages were rendered from. Along with them go the
 * structured data that lets a search engine show a price and an artist, a sitemap, and a robots file
 * that keeps someone's own account pages out of the index.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://deegee.ug').replace(/\/$/, '');
/**
 * Covers are served by the API, and a preview card needs an address that works from outside. If the API
 * sits behind the same domain (/v1 proxied to it) this is right as it stands; otherwise set the API URL.
 */
const MEDIA = (process.env.EXPO_PUBLIC_API_URL ?? SITE).replace(/\/$/, '');
const seed = JSON.parse(readFileSync('src/api/catalog.seed.json', 'utf8'));

const ugx = (n) => `UGX ${n.toLocaleString('en-US')}`;
const songsOf = (releaseId) => seed.tracks.filter((t) => t.releaseId === releaseId);
const artistOf = (id) => seed.artists.find((a) => a.id === id);
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Pages that belong to one person's account. Useful to them, meaningless in a search result. */
const PRIVATE = [
  'profile', 'settings', 'activity', 'buy', 'gift', 'sign-in', 'welcome', 'player',
  'admin', 'library', 'studio', '_sitemap', '+not-found',
];

const cover = (path) => (path ? MEDIA + path : `${SITE}/icon-512.png`);

/** Every page worth indexing, with what it should say about itself. */
function pages() {
  const list = [
    {
      file: 'index.html',
      path: '/',
      title: 'Deegee · buy music straight from Ugandan artists',
      description:
        'Hear new music from Uganda and buy it with MTN MoMo or Airtel Money. Every song is yours to keep, and most of what you pay goes straight to the artist.',
      image: `${SITE}/icon-512.png`,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      file: 'search.html',
      path: '/search',
      title: 'Explore Ugandan music · Deegee',
      description:
        'Afrobeat, Kadongo Kamu, Dancehall, Gospel, Zouk and Hip Hop from Uganda. Hear a preview of anything, then buy it with mobile money.',
      image: `${SITE}/icon-512.png`,
      changefreq: 'weekly',
      priority: '0.8',
    },
  ];

  for (const r of seed.releases) {
    const artist = artistOf(r.artistId);
    const songs = songsOf(r.id);
    const name = artist?.name ?? 'a Ugandan artist';
    list.push({
      file: join('release', `${r.id}.html`),
      path: `/release/${r.id}`,
      title: `${r.title} by ${name} · Deegee`,
      description: `${r.title} by ${name}. Buy the ${r.type.toLowerCase()} (${songs.length} song${songs.length === 1 ? '' : 's'}) for ${ugx(r.priceUGX)} with MTN MoMo or Airtel Money, and keep it for good.`,
      image: cover(r.coverUrl),
      type: 'music.album',
      changefreq: 'weekly',
      priority: '0.9',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'MusicAlbum',
        name: r.title,
        url: `${SITE}/release/${r.id}`,
        image: cover(r.coverUrl),
        datePublished: String(r.year),
        albumReleaseType: r.type === 'Album' ? 'AlbumRelease' : r.type === 'EP' ? 'EPRelease' : 'SingleRelease',
        numTracks: songs.length,
        byArtist: { '@type': 'MusicGroup', name, url: `${SITE}/artist/${r.artistId}` },
        track: songs.map((t, i) => ({
          '@type': 'MusicRecording',
          position: i + 1,
          name: t.title,
          duration: `PT${Math.floor(t.durationSec / 60)}M${t.durationSec % 60}S`,
        })),
        offers: {
          '@type': 'Offer',
          price: r.priceUGX,
          priceCurrency: 'UGX',
          availability: 'https://schema.org/InStock',
          url: `${SITE}/release/${r.id}`,
        },
      },
    });
  }

  for (const a of seed.artists) {
    const releases = seed.releases.filter((r) => r.artistId === a.id);
    list.push({
      file: join('artist', `${a.id}.html`),
      path: `/artist/${a.id}`,
      title: `${a.name} · music from ${a.city} · Deegee`,
      description: `${a.name} makes ${a.genres.join(' and ')} in ${a.city}. Hear previews and buy ${releases.length === 1 ? 'their release' : `any of their ${releases.length} releases`} with mobile money, paying the artist directly.`,
      image: cover(releases.find((r) => r.coverUrl)?.coverUrl),
      type: 'profile',
      changefreq: 'weekly',
      priority: '0.7',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'MusicGroup',
        name: a.name,
        url: `${SITE}/artist/${a.id}`,
        description: a.bio,
        genre: a.genres,
        foundingLocation: { '@type': 'Place', name: `${a.city}, Uganda` },
        album: releases.map((r) => ({ '@type': 'MusicAlbum', name: r.title, url: `${SITE}/release/${r.id}` })),
      },
    });
  }
  return list;
}

function head(page) {
  const tags = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}"/>`,
    `<link rel="canonical" href="${SITE}${page.path}"/>`,
    `<meta property="og:site_name" content="Deegee"/>`,
    `<meta property="og:type" content="${page.type ?? 'website'}"/>`,
    `<meta property="og:url" content="${SITE}${page.path}"/>`,
    `<meta property="og:title" content="${esc(page.title)}"/>`,
    `<meta property="og:description" content="${esc(page.description)}"/>`,
    `<meta property="og:image" content="${page.image}"/>`,
    `<meta property="og:locale" content="en_UG"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${esc(page.title)}"/>`,
    `<meta name="twitter:description" content="${esc(page.description)}"/>`,
    `<meta name="twitter:image" content="${page.image}"/>`,
  ];
  if (page.jsonLd) {
    // </script> inside the data would end the tag early.
    const json = JSON.stringify(page.jsonLd).replace(/</g, '\\u003c');
    tags.push(`<script type="application/ld+json">${json}</script>`);
  }
  return tags.join('');
}

let written = 0;
for (const page of pages()) {
  const file = join(DIST, page.file);
  if (!existsSync(file)) {
    console.warn(`  skipped ${page.file} (not exported)`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  writeFileSync(file, html.replace('</head>', `${head(page)}</head>`));
  written++;
}

const urls = pages()
  .map((p) => `  <url><loc>${SITE}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`)
  .join('\n');
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

writeFileSync(
  join(DIST, 'robots.txt'),
  ['User-agent: *', ...PRIVATE.map((p) => `Disallow: /${p}`), '', `Sitemap: ${SITE}/sitemap.xml`, ''].join('\n'),
);

console.log(`seo: ${written} pages given a title, description and preview card; sitemap.xml and robots.txt written for ${SITE}`);
