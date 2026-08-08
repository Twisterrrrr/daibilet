import assert from 'node:assert/strict';
import test from 'node:test';

import { toVenueCatalogCard } from './venue-catalog-card.ts';

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
  assert.equal(card.heroImageUrl, '/k.jpg');
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
  assert.equal(
    card.heroImageUrl,
    '/images/venues/saint-petersburg/dvortsovaya-ploschad.jpg',
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
