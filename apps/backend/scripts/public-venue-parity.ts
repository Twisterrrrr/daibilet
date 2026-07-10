import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '@daibilet/db';
import { buildPublicVenuePage, clearPublicDataCaches } from '../src/dto.js';
import { createDb } from '../src/db.js';
import { clearPublicCatalogDtoCache, getPublicCatalogSessions } from '../src/public-catalog.dto.js';
import {
  buildPublicVenueDto,
  buildPublicVenuesDto,
  clearPublicVenueDtoCache,
} from '../src/public-venue.dto.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const db = createDb(projectRoot);

clearPublicDataCaches();
clearPublicCatalogDtoCache();
clearPublicVenueDtoCache();

const catalog = await getPublicCatalogSessions(true);
const expectedCounts = new Map<string, number>();
for (const session of catalog) {
  if (!session.venueId) continue;
  expectedCounts.set(session.venueId, (expectedCounts.get(session.venueId) || 0) + 1);
}

const venueList = await buildPublicVenuesDto(true);
assert.equal(venueList.total, venueList.venues.length, 'venue list total');
assert.equal(new Set(venueList.venues.map((venue) => venue.id)).size, venueList.total, 'venue list unique ids');
for (const venue of venueList.venues) {
  assert.equal(venue.events, expectedCounts.get(venue.id), `${venue.name}: grouped event count`);
  assert.ok(venue.events > 0, `${venue.name}: visible venue has events`);
}
console.log(`${venueList.total} public venues, grouped counts ok`);

const venueIds = venueList.venues.map((venue) => venue.id);
const samples = await prisma.venue.findMany({
  where: { id: { in: venueIds }, pageStatus: { in: ['CANDIDATE', 'NONE'] } },
  orderBy: [{ pageStatus: 'asc' }, { title: 'asc' }],
});
const selected = ['CANDIDATE', 'NONE']
  .map((status) => samples.find((venue) => venue.pageStatus === status))
  .filter(isDefined);
assert.equal(selected.length, 2, 'candidate and location-only venue samples');

for (const venue of selected) {
  const [legacy, typed] = await Promise.all([
    buildPublicVenuePage(db, venue.slug),
    buildPublicVenueDto(venue.slug, true),
  ]);
  assert.ok(legacy, `${venue.title}: legacy page`);
  assert.ok(typed, `${venue.title}: typed page`);
  assert.deepEqual(venueCore(typed.venue), venueCore(legacy.venue), `${venue.title}: venue`);
  assert.equal(typed.venue.seoH1, legacy.venue.seoH1 || legacy.venue.title, `${venue.title}: seo h1`);
  assert.equal(typed.venue.canonicalPath, legacy.venue.canonicalPath || `/venues/${legacy.venue.slug}`, `${venue.title}: canonical`);
  assert.ok(typed.venue.seoTitle, `${venue.title}: seo title`);
  assert.ok(typed.venue.seoDescription, `${venue.title}: seo description`);
  assert.deepEqual(typed.sessions.map(sessionCore), legacy.sessions.map(sessionCore), `${venue.title}: sessions`);
  assert.equal(new Set(typed.relatedVenues.map((item) => item.id)).size, typed.relatedVenues.length, `${venue.title}: related unique`);
  for (const related of typed.relatedVenues) {
    assert.equal(related.events, expectedCounts.get(related.id), `${related.name}: related grouped count`);
  }
  assert.deepEqual(typed.stats, legacy.stats, `${venue.title}: stats`);
  console.log(`${venue.pageStatus}: ${venue.title}, ${typed.sessions.length} events, parity ok`);
}

process.exit(0);

function venueCore(value: any) {
  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    title: value.title,
    city: value.city,
    address: value.address,
    latitude: value.latitude,
    longitude: value.longitude,
    type: value.type,
    pageStatus: value.pageStatus,
    description: value.description,
    shortDescription: value.shortDescription,
    heroImageUrl: value.heroImageUrl,
    isIndexable: value.isIndexable,
    events: value.events,
    categories: value.categories,
  };
}

function sessionCore(value: any) {
  return {
    id: value.id,
    slug: value.slug,
    groupEventIds: value.groupEventIds,
    title: value.title,
    startsAt: value.startsAt,
    priceFrom: value.priceFrom,
  };
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}
