/**
 * Builds the website and lists everything the service worker should keep.
 *
 * Expo names its bundles with a content hash, so the list can only be written after the export. With it,
 * an installed Deegee holds its whole self on the device: open it on a dead connection and every screen
 * is there, not just the ones visited before the signal went.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const KEEP = /\.(js|css|ttf|otf|woff2?|png|jpg|jpeg|svg|ico|json)$/i;
const SKIP = /^(precache\.json|sw\.js|metadata\.json)$/;
/**
 * Code and fonts are held from the start: without them there is no app at all offline. Photographs are
 * left to cache as they are seen, because a first visit on mobile data shouldn't quietly pull megabytes
 * of pictures before the person has decided they even want this.
 */
const ALWAYS = /\.(js|css|ttf|otf|woff2?)$/i;
const SMALL_ENOUGH = 50 * 1024;

execFileSync('npx', ['expo', 'export', '--platform', 'web'], { stdio: 'inherit' });

const files = [];
const later = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (KEEP.test(entry)) {
      const path = relative(DIST, full).split(sep).join('/');
      if (SKIP.test(path)) continue;
      if (ALWAYS.test(entry) || statSync(full).size <= SMALL_ENOUGH) files.push('/' + path);
      else later.push('/' + path);
    }
  }
})(DIST);

writeFileSync(join(DIST, 'precache.json'), JSON.stringify({ files }, null, 2));
const mb = (list) => (list.reduce((n, f) => n + statSync(join(DIST, f.slice(1))).size, 0) / 1024 / 1024).toFixed(1);
console.log(`\nprecache.json: ${files.length} files, ${mb(files)} MB held from the start`);
console.log(`${later.length} photos (${mb(later)} MB) cache as they are seen`);
