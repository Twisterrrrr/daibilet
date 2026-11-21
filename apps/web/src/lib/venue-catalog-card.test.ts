import assert from 'node:assert/strict';
import test from 'node:test';

import { toVenueCatalogCard } from './venue-catalog-card.ts';

/**
 * 29.09. These two assertions were written before `resolveVenueHeroImage` learned
 * about the city-identity pack (20f487b06) and before listing cards moved from
 * `-thumb` to `-card` (cd1edd8e3, "stop crushing venue card quality").
 *
 * Neither failure is a code defect - the code is right and the expectations were
 * stale. Verified by resolving each case directly:
 *
 *   nizhny-novgorod-kreml  hub=/k.jpg
 *     -> /images/venues/nizhny-novgorod/identity-symbol-card.jpg
 *        identity pack wins over the hub photo, on purpose: a listed place with
 *        no unique still gets the city symbol rather than a gray card.
 *
 *   saint-petersburg-dvortsovaya-ploschad  hub=venue-auto-stub.jpg
 *     -> /images/venues/saint-petersburg/dvortsovaya-ploschad-card.jpg
 *        the stub is dropped, the on-disk venue image is preferred, and the
 *        listing variant is `-card`, not `-thumb`.
 *
 * The tests now pin that priority order, so a future change to it fails here
 * instead of silently swapping which image a catalog card shows.
 */
test('toVenueCatalogCard keeps hookFact for my-day picker cards', () => {
  const card = toVenueCatalogCard({
    id: 'venue_hook',
    slug: 'nizhny-novgorod-kreml',
    name: 'Нижегородский Кремль',
    city: 'Нижний Новгород',
    type: 'attraction',
    events: 0,
    hookFact: 'Стена с видом на стрелку рек',
    shortDescription: 'Крепость',
    heroImageUrl: '/k.jpg',
    latitude: 56.3287,
    longitude: 44.002,
  });
  assert.equal(card.hookFact, 'Стена с видом на стрелку рек');
  assert.equal(card.shortDescription, 'Крепость');
  // The hub photo is a fallback, not a winner: the city identity pack outranks it
  // so a card is never left gray when a real venue still is missing.
  assert.equal(card.heroImageUrl, '/images/venues/nizhny-novgorod/identity-symbol-card.jpg');
});

test('toVenueCatalogCard prefers editorial cover over hub stub', () => {
  const card = toVenueCatalogCard({
    id: 'venue_spb_square',
    slug: 'saint-petersburg-dvortsovaya-ploschad',
    name: 'Дворцовая площадь',
    city: 'Санкт-Петербург',
    type: 'outdoor_location',
    events: 0,
    heroImageUrl: '/images/venues/generated/venue-auto-stub.jpg',
  });
  // Generated stub is dropped, the on-disk venue image wins, and catalog cards
  // ask for the `-card` sidecar rather than the smaller `-thumb`.
  assert.equal(
    card.heroImageUrl,
    '/images/venues/saint-petersburg/dvortsovaya-ploschad-card.jpg',
  );
});

test('toVenueCatalogCard drops unmapped generated stubs', () => {
  const card = toVenueCatalogCard({
    id: 'venue_plain',
    slug: 'some-unmapped-park',
    name: 'Парк',
    city: 'Санкт-Петербург',
    type: 'park',
    events: 0,
    heroImageUrl: '/images/venues/generated/venue-auto-abc.jpg',
  });
  assert.equal(card.heroImageUrl, null);
});

test('toVenueCatalogCard keeps valid latitude/longitude for day-route', () => {
  const card = toVenueCatalogCard({
    id: 'venue_60b602fed94a1fa681b69c1d',
    slug: 'prichal-na-fontanke-53',
    name: 'Причал на наб. реки Фонтанки, 51-53',
    city: 'Санкт-Петербург',
    cityId: 'city_spb',
    citySlug: 'sankt-peterburg',
    address: 'набережная реки Фонтанки, 51-53',
    type: 'pier',
    events: 3,
    latitude: 59.9285617,
    longitude: 30.3381124,
  });
  assert.equal(card.latitude, 59.9285617);
  assert.equal(card.longitude, 30.3381124);
  assert.equal(card.address, 'набережная реки Фонтанки, 51-53');
  assert.equal(card.cityId, 'city_spb');
});

test('toVenueCatalogCard keeps wayToFind and skips fake rating', () => {
  const card = toVenueCatalogCard({
    id: 'venue_way',
    slug: 'prichal-test',
    name: 'Причал',
    city: 'Санкт-Петербург',
    type: 'pier',
    events: 1,
    wayToFind: 'Спуск у синей калитки',
    metroStation: 'Гостиный двор',
    rating: null,
    latitude: 59.93,
    longitude: 30.33,
  });
  assert.equal(card.wayToFind, 'Спуск у синей калитки');
  assert.equal(card.metroStation, 'Гостиный двор');
  assert.equal(card.rating, null);
});

test('toVenueCatalogCard keeps positive rating and upcomingTitles when provided', () => {
  const card = toVenueCatalogCard({
    id: 'venue_rated',
    name: 'Музей',
    city: 'Санкт-Петербург',
    type: 'museum',
    events: 2,
    rating: 4.7,
    upcomingTitles: ['Выставка А', 'Лекция Б', 'Тур В', 'Лишнее'],
  });
  assert.equal(card.rating, 4.7);
  assert.deepEqual(card.upcomingTitles, ['Выставка А', 'Лекция Б', 'Тур В']);
});

test('toVenueCatalogCard rejects null-island and non-finite coords', () => {
  assert.equal(
    toVenueCatalogCard({
      id: 'v1',
      name: 'A',
      city: 'X',
      type: 'pier',
      events: 0,
      latitude: 0,
      longitude: 0,
    }).latitude,
    null,
  );
  assert.equal(
    toVenueCatalogCard({
      id: 'v2',
      name: 'B',
      city: 'X',
      type: 'pier',
      events: 0,
      latitude: null,
      longitude: null,
    }).longitude,
    null,
  );
});
