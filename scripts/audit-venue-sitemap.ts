import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { venueCanonicalPath } from '../apps/web/src/lib/routes';
import { venueSitemapEntry } from '../apps/web/src/lib/venue-sitemap-entry';

// Input: a complete DB export with id, slug, name, type (= kind), canonicalPath.
const venues = JSON.parse(readFileSync(process.argv[2]!, 'utf8'));
const expected = Number(process.argv[3] || 3659);
assert.equal(venues.length, expected, 'Unexpected catalog size: no partial audit allowed');
let staleStoredPaths = 0;
for (const venue of venues) {
  const canonical = venueCanonicalPath(venue);
  assert.equal(venueSitemapEntry(venue, 'https://daibilet.ru').url, `https://daibilet.ru${canonical}`, venue.id);
  if (venue.canonicalPath && venue.canonicalPath !== canonical) staleStoredPaths++;
}
console.log(JSON.stringify({ checked: venues.length, sitemapCanonicalMismatch: 0, staleStoredPaths }));
