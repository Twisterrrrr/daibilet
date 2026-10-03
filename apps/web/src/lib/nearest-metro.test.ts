import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NEAREST_METRO_MAX_METERS,
  resolveMetroCityKey,
  resolveNearestMetroStationName,
} from './nearest-metro.ts';

test('resolveMetroCityKey maps MSK/SPB only', () => {
  assert.equal(resolveMetroCityKey('Москва', 'moscow'), 'msk');
  assert.equal(resolveMetroCityKey('Санкт-Петербург', 'saint-petersburg'), 'spb');
  assert.equal(resolveMetroCityKey('Казань', 'kazan'), null);
});

test('existing metroStation wins over coords', () => {
  assert.equal(
    resolveNearestMetroStationName({
      city: 'Санкт-Петербург',
      citySlug: 'saint-petersburg',
      latitude: 59.9398,
      longitude: 30.3146,
      metroStation: 'Адмиралтейская',
    }),
    'Адмиралтейская',
  );
});

test('Hermitage coords resolve to Адмиралтейская', () => {
  const name = resolveNearestMetroStationName({
    city: 'Санкт-Петербург',
    citySlug: 'saint-petersburg',
    latitude: 59.9398,
    longitude: 30.3146,
    metroStation: null,
  });
  assert.equal(name, 'Адмиралтейская');
});

test('Garage-ish Moscow coords resolve near Park Kultury / nearby', () => {
  // Gorky Park / Garage vicinity
  const name = resolveNearestMetroStationName({
    city: 'Москва',
    citySlug: 'moscow',
    latitude: 55.7275,
    longitude: 37.6014,
    metroStation: null,
  });
  assert.ok(name);
  assert.equal(typeof name, 'string');
});

test('far coords omit metro (no invent)', () => {
  assert.equal(
    resolveNearestMetroStationName({
      city: 'Санкт-Петербург',
      citySlug: 'saint-petersburg',
      latitude: 60.2,
      longitude: 29.7,
      metroStation: null,
    }),
    null,
  );
  assert.ok(NEAREST_METRO_MAX_METERS >= 1500);
});

test('missing coords omit metro', () => {
  assert.equal(
    resolveNearestMetroStationName({
      city: 'Москва',
      citySlug: 'moscow',
      latitude: null,
      longitude: null,
      metroStation: null,
    }),
    null,
  );
});
