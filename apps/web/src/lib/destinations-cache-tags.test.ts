import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * `/api/public/destinations` is fetched into two independent `unstable_cache`
 * entries: `getHomeDestinations` (home stats block) and `getCachedDestinations`
 * (SiteLayout -> SiteFooter trust line). Both render on the same HTML page.
 *
 * They used to carry disjoint tags - `home-page` vs `destinations` - so a
 * destinations revalidate evicted one and left the other, and the page showed
 * two different totals for the same fact (2 974 in the footer vs 2 940 in the
 * home block, 2026-09-29). Readdir of one cache alone cannot be observed from
 * the outside, so this guards the tags statically.
 */
const WEB_ROOT = path.resolve(__dirname, '../..');

test('destinations cache: both readers share the destinations tag', () => {
  const home = fs.readFileSync(path.join(WEB_ROOT, 'src/server/cached-home-data.ts'), 'utf8');
  const surfaces = fs.readFileSync(path.join(WEB_ROOT, 'src/server/cached-public-surfaces.ts'), 'utf8');

  // The shared home options must NOT gain the tag, or every destinations
  // revalidation would also evict the home catalog/landings/articles caches.
  const shared = home.slice(
    home.indexOf('const homeCacheOptions'),
    home.indexOf('const homeDestinationsCacheOptions'),
  );
  assert.equal(
    shared.includes('DESTINATIONS_CACHE_TAG'),
    false,
    'homeCacheOptions carries DESTINATIONS_CACHE_TAG, over-invalidating the other home caches',
  );

  // ...and the dedicated options must carry it.
  const dedicated = home.slice(home.indexOf('const homeDestinationsCacheOptions'));
  assert.match(dedicated, /DESTINATIONS_CACHE_TAG/);
  assert.match(
    home,
    /\['home-destinations-v4-http'\],\s*\n\s*homeDestinationsCacheOptions/,
    'getHomeDestinations must use homeDestinationsCacheOptions',
  );

  assert.match(surfaces, /public-destinations-v3-http[\s\S]{0,200}?DESTINATIONS_CACHE_TAG/);
});

test('destinations cache: both readers hit the same endpoint', () => {
  const home = fs.readFileSync(path.join(WEB_ROOT, 'src/server/cached-home-data.ts'), 'utf8');
  const surfaces = fs.readFileSync(path.join(WEB_ROOT, 'src/server/cached-public-surfaces.ts'), 'utf8');
  assert.match(home, /'\/api\/public\/destinations'/);
  assert.match(surfaces, /'\/api\/public\/destinations'/);
});
