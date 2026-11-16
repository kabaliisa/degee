/**
 * Builds the website and lists everything the service worker should keep.
 *
 * Expo names its bundles with a content hash, so the list can only be written after the export. With it,
 * an installed Deegee holds its whole self on the device: open it on a dead connection and every screen
 * is there, not just the ones visited before the signal went.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const KEEP = /\.(js|css|ttf|otf|woff2?|png|jpg|jpeg|svg|ico|json|html)$/i;
const SKIP = /^(precache\.json|sw\.js|metadata\.json|sitemap\.xml|robots\.txt)$/;
/**
 * Code and fonts are held from the start: without them there is no app at all offline. Photographs are
 * left to cache as they are seen, because a first visit on mobile data shouldn't quietly pull megabytes
 * of pictures before the person has decided they even want this.
 */
const ALWAYS = /\.(js|css|ttf|otf|woff2?|html)$/i;
const SMALL_ENOUGH = 50 * 1024;

execFileSync('node', ['scripts/fetch-catalog.mjs'], { stdio: 'inherit' });
execFileSync('npx', ['expo', 'export', '--platform', 'web'], { stdio: 'inherit' });

// Expo writes font and icon assets to assets/node_modules/..., and Cloudflare Pages refuses to upload
// anything under a directory called node_modules. The files vanish silently at deploy: the request
// then falls through to the single-page fallback, which answers the font with 200 and a page of HTML,
// and every typeface on the site fails to parse. Nothing in the build or the deploy reports a problem.
//
// So the segment is renamed here, before anything is published, and every reference to it rewritten.
const FROM = 'assets/node_modules';
const TO = 'assets/vendor';
const vendorSrc = join(DIST, 'assets', 'node_modules');
if (existsSync(vendorSrc)) {
  cpSync(vendorSrc, join(DIST, 'assets', 'vendor'), { recursive: true });
  rmSync(vendorSrc, { recursive: true, force: true });
  let rewritten = 0;
  (function rewrite(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) rewrite(full);
      else if (/\.(js|css|html|json|map)$/i.test(entry)) {
        const before = readFileSync(full, 'utf8');
        if (!before.includes(FROM)) continue;
        writeFileSync(full, before.split(FROM).join(TO));
        rewritten++;
      }
    }
  })(DIST);
  console.log(`assets/node_modules -> assets/vendor (${rewritten} files rewritten)`);
}

// Fail here rather than ship a site whose fonts quietly do not load. Anything still sitting under a
// node_modules path will not survive the upload, and nothing downstream will say so.
(function assertNoVendorDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules') {
      throw new Error(`${relative(DIST, full)} would be dropped by Cloudflare Pages. Move it before publishing.`);
    }
    if (statSync(full).isDirectory()) assertNoVendorDir(full);
  }
})(DIST);

execFileSync('node', ['scripts/seo.mjs'], { stdio: 'inherit' });

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

/**
 * Stamp the build into the service worker. Expo hashes its filenames, so this changes whenever anything
 * does, which is what makes a browser notice there is a new worker, install it, and throw away the files
 * it was holding. Left fixed, everyone keeps the build they first visited.
 */
const build = createHash('sha256').update(files.concat(later).join('\n')).digest('hex').slice(0, 12);
const sw = join(DIST, 'sw.js');
writeFileSync(sw, readFileSync(sw, 'utf8').replace("const VERSION = 'dev';", `const VERSION = '${build}';`));
const mb = (list) => (list.reduce((n, f) => n + statSync(join(DIST, f.slice(1))).size, 0) / 1024 / 1024).toFixed(1);
console.log(`\nbuild ${build}`);
console.log(`precache.json: ${files.length} files, ${mb(files)} MB held from the start`);
console.log(`${later.length} photos (${mb(later)} MB) cache as they are seen`);
