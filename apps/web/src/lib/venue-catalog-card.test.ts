import assert from 'node:assert/strict';
import test from 'node:test';

import { toVenueCatalogCard } from './venue-catalog-card.ts';

test('toVenueCatalogCard keeps valid latitude/longitude for day-route', () => {
  const card = toVenueCatalogCard({
    id: 'venue_60b602fed94a1fa681b69c1d',
    slug: 'prichal-na-fontanke-53',
    name: 'Причал на Фонтанке 53',
    city: 'Санкт-Петербург',
    type: 'pier',
    events: 3,
    latitude: 59.9285617,
    longitude: 30.3381124,
  });
  assert.equal(card.latitude, 59.9285617);
  assert.equal(card.longitude, 30.3381124);
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
