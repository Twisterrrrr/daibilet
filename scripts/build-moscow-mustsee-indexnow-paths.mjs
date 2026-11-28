/**
 * Build IndexNow path list for Moscow must-see (200-only).
 * Expand sections share parent locationSlug - no separate URLs.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ed = JSON.parse(readFileSync('scripts/data/must-see-editorial-moscow.json', 'utf8'));
const roles = new Set(['insert', 'hub_only']);
const slugs = [
  ...new Set(
    ed.filter((e) => roles.has(e.role) && e.slug).map((e) => String(e.slug)),
  ),
].sort();

const paths = [`/cities/moskva`, ...slugs.map((s) => `/locations/${s}`)];

const out = {
  generatedAt: new Date().toISOString(),
  venueSlugs: slugs.length,
  paths: paths.length,
  note: 'expand×40 have no own URL; covered via parent /locations + hub',
  paths,
};

writeFileSync('docs/drafts/_msk-mustsee-indexnow-paths.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify({ venueSlugs: slugs.length, paths: paths.length, head: paths.slice(0, 5) }, null, 2));
