// Dry run, part 2: the two arms the public API cannot answer.
//
//   isIndexable = (events >= 1)
//              OR (hasEditorialPack AND descriptionLength > 500)
//              OR (mustSee == true)
//
// hasEditorialPack lives in the code packs; mustSee is derived from the
// destination registry. Neither is on the public venue DTO, so the venue API
// sweep could not score them. This reads them where they actually live and
// cross-references against the live sitemap.
import fs from 'node:fs';
import { VENUE_EDITORIAL_PACKS } from '../src/lib/venue-editorial-packs.ts';

const packSlugs = Object.keys(VENUE_EDITORIAL_PACKS);
console.log(`editorial packs in code: ${packSlugs.length}`);

const over500 = packSlugs.filter((s) => {
  const p = VENUE_EDITORIAL_PACKS[s];
  const text = [p?.title, p?.intro, p?.seoDescription, p?.hookFact, ...(p?.highlights || [])]
    .filter(Boolean)
    .join(' ')
    .trim();
  return text.length > 500;
});
console.log(`  with >500 chars of authored copy: ${over500.length}`);
console.log(`  sample: ${packSlugs.slice(0, 6).join(', ')}`);

// Which of those are actually reachable as venue slugs today?
const sitemap = await (await fetch('https://daibilet.ru/sitemaps/venues.xml')).text();
const inSitemap = new Set(
  [...sitemap.matchAll(/<loc>https:\/\/daibilet\.ru\/venues\/([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(m[1])),
);
console.log(`\nvenue URLs in sitemap: ${inSitemap.size}`);

const packInSitemap = packSlugs.filter((s) => inSitemap.has(s));
const packNotInSitemap = packSlugs.filter((s) => !inSitemap.has(s));
console.log(`  packs already indexed:  ${packInSitemap.length}`);
console.log(`  packs NOT in sitemap:   ${packNotInSitemap.length}`);
if (packNotInSitemap.length) {
  console.log('  -> these are the candidate additions:');
  for (const s of packNotInSitemap.slice(0, 30)) console.log(`       ${s}`);
}

// mustSee: how is it represented?
const registry = fs.readFileSync('../src/lib/destination-registry.ts', 'utf8').catch?.(() => null);
console.log('\n=== mustSee representation ===');
const mustSeeHits = fs.existsSync('../src/lib/destination-registry.ts')
  ? [...fs.readFileSync('../src/lib/destination-registry.ts', 'utf8').matchAll(/mustSee/g)].length
  : 0;
console.log(`  occurrences of "mustSee" in destination-registry.ts: ${mustSeeHits}`);
