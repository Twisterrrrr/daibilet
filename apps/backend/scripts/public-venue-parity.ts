import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../../../packages/db/src/client.ts';
import { buildPublicVenuePage, buildPublicVenuesCatalog, clearPublicDataCaches } from '../src/dto.js';
import { createDb } from '../src/db.js';
import { clearPublicCatalogDtoCache } from '../src/public-catalog.dto.js';
import {
  buildPublicVenueDto,
  buildPublicVenuesDto,
  clearPublicVenueDtoCache,
  venueCatalogCore,
} from '../src/public-venue.dto.js';
import type { PublicSessionDto, PublicVenueDto } from '../src/types/public.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const db = createDb(projectRoot);

const catalogCases = [
  'limit=500&family=institution',
  'limit=500&family=location',
];

clearPublicDataCaches();
clearPublicCatalogDtoCache();
clearPublicVenueDtoCache();

for (const queryString of catalogCases) {
  const searchParams = new URLSearchParams(queryString);
  const [legacy, typed] = await Promise.all([
    buildPublicVenuesCatalog(db, searchParams),
    buildPublicVenuesDto(searchParams, true),
  ]);
  assert.equal(typed.total, legacy.total, `${queryString}: total`);
  assert.deepEqual(
    typed.venues.map(venueCatalogCore),
    legacy.venues.map(venueCatalogCore),
    `${queryString}: venues`,
  );
  const withImages = typed.venues.filter((venue) => venue.heroImageUrl).length;
  console.log(`${queryString}: ${typed.total} venues, ${withImages} with images, parity ok`);
}

const venueList = await buildPublicVenuesDto(new URLSearchParams('limit=500&family=institution'), true);
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
  assert.deepEqual(typed.stats, legacy.stats, `${venue.title}: stats`);
  console.log(`${venue.pageStatus}: ${venue.title}, ${typed.sessions.length} events, parity ok`);
}

process.exit(0);

function venueCore(value: PublicVenueDto) {
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

function sessionCore(value: PublicSessionDto) {
  return {
    id: value.id,
    slug: value.slug ?? null,
    ...(value.groupEventIds ? { groupEventIds: value.groupEventIds } : {}),
    title: value.title,
    startsAt: value.startsAt ?? null,
    priceFrom: value.priceFrom ?? null,
  };
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}
