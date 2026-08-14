import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublicCityPage, buildPublicDestinations, clearPublicDataCaches } from '../src/dto.js';
import { createDb } from '../src/db.js';
import {
  buildPublicCityDto,
  buildPublicDestinationsDto,
  clearPublicCityDtoCache,
} from '../src/public-city.dto.js';
import { clearPublicCatalogDtoCache } from '../src/public-catalog.dto.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const db = createDb(projectRoot);

clearPublicDataCaches();
clearPublicCatalogDtoCache();
clearPublicCityDtoCache();

const [legacyDestinations, typedDestinations] = await Promise.all([
  buildPublicDestinations(db),
  buildPublicDestinationsDto(true),
]);
assert.deepEqual(
  typedDestinations.destinations,
  legacyDestinations.destinations,
  'destination catalog',
);
console.log(`${typedDestinations.destinations.length} destinations, parity ok`);

const city = typedDestinations.destinations.find((item) => item.type === 'city');
const region = typedDestinations.destinations.find((item) => item.type === 'region');
assert.ok(city, 'city sample');
assert.ok(region, 'region sample');

for (const destination of [city, region]) {
  const locator = destination.slug || destination.id;
  assert.ok(locator, `${destination.name}: locator`);
  const [legacy, typed] = await Promise.all([
    buildPublicCityPage(db, locator),
    buildPublicCityDto(locator, true),
  ]);
  assert.ok(legacy, `${destination.name}: legacy page`);
  assert.ok(typed, `${destination.name}: typed page`);
  assert.deepEqual(cityCore(typed.city), cityCore(legacy.city), `${destination.name}: city`);
  assert.deepEqual(typed.sessions.map(sessionCore), legacy.sessions.map(sessionCore), `${destination.name}: sessions`);
  assert.deepEqual(typed.venues.map(venueCore), legacy.venues.map(venueCore), `${destination.name}: venues`);
  assert.deepEqual(typed.landings.map(landingCore), legacy.landings.map(landingCore), `${destination.name}: landings`);
  assert.deepEqual(typed.stats, legacy.stats, `${destination.name}: stats`);
  console.log(`${destination.name}: ${typed.sessions.length} events, ${typed.venues.length} venues, parity ok`);
}

process.exit(0);

function cityCore(value: any) {
  return {
    id: value.id,
    slug: value.slug,
    sourceSlug: value.sourceSlug,
    name: value.name,
    title: value.title,
    type: value.type,
    isDestination: value.isDestination,
    events: value.events,
    venues: value.venues,
    categories: value.categories,
  };
}

function sessionCore(value: any) {
  return {
    id: value.id,
    slug: value.slug,
    groupEventIds: value.groupEventIds,
    title: value.title,
    destination: value.destination,
    venueId: value.venueId,
    category: value.category,
    startsAt: value.startsAt,
    priceFrom: value.priceFrom,
  };
}

function venueCore(value: any) {
  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    city: value.city,
    address: value.address,
    type: value.type,
    pageStatus: value.pageStatus,
    shortDescription: value.shortDescription,
    heroImageUrl: value.heroImageUrl,
    events: value.events,
    categories: value.categories,
  };
}

function landingCore(value: any) {
  return {
    slug: value.slug,
    title: value.title,
    subtitle: value.subtitle,
    chips: value.chips,
    events: value.events,
    venues: value.venues,
    priceFrom: value.priceFrom,
    strength: value.strength,
  };
}
