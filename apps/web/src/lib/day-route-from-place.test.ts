import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCityDayRoutePreset,
  cityDayRoutePresetAvailable,
  dayRouteItemFromEvent,
  dayRouteItemFromMustSee,
} from './day-route-from-place.ts';

const city = { id: 'city_spb', name: 'Санкт-Петербург', slug: 'sankt-peterburg' };

const venues = [
  {
    id: 'venue_ermitazh',
    slug: 'ermitazh',
    name: 'Эрмитаж',
    latitude: 59.9398,
    longitude: 30.3146,
    heroImageUrl: '/h.jpg',
  },
  {
    id: 'venue_krepost',
    slug: 'saint-petersburg-petropavlovskaya-krepost',
    name: 'Петропавловская крепость',
    latitude: 59.95,
    longitude: 30.316,
  },
  {
    id: 'venue_dvorts',
    slug: 'saint-petersburg-dvortsovaya-ploschad',
    name: 'Дворцовая площадь',
    latitude: 59.938,
    longitude: 30.315,
  },
  {
    id: 'venue_isaak',
    slug: 'saint-petersburg-isaakievskiy-sobor',
    name: 'Исаакиевский собор',
    latitude: 59.934,
    longitude: 30.306,
  },
];

test('dayRouteItemFromMustSee resolves venueSlug + coords', () => {
  const item = dayRouteItemFromMustSee(
    { name: 'Эрмитаж', desc: 'Музей', venueSlug: 'ermitazh' },
    venues,
    city,
  );
  assert.ok(item);
  assert.equal(item!.id, 'venue_ermitazh');
  assert.equal(item!.slug, 'ermitazh');
  assert.equal(item!.latitude, 59.9398);
  assert.equal(item!.cityId, 'city_spb');
});

test('dayRouteItemFromMustSee resolves locationSlug without hub venue match', () => {
  const item = dayRouteItemFromMustSee(
    {
      name: 'Спас на Крови',
      desc: 'Храм',
      locationSlug: 'saint-petersburg-spas-na-krovi',
    },
    venues,
    city,
  );
  assert.ok(item);
  assert.equal(item!.id, 'saint-petersburg-spas-na-krovi');
  assert.equal(item!.slug, 'saint-petersburg-spas-na-krovi');
  assert.equal(item!.latitude ?? null, null);
});

test('dayRouteItemFromMustSee returns null without slug or match', () => {
  assert.equal(
    dayRouteItemFromMustSee({ name: 'Неизвестное место', desc: 'x' }, venues, city),
    null,
  );
});

test('buildCityDayRoutePreset takes first resolvable must-see up to 4', () => {
  const places = [
    { name: 'Эрмитаж', desc: '', venueSlug: 'ermitazh' },
    { name: 'Крепость', desc: '', locationSlug: 'saint-petersburg-petropavlovskaya-krepost' },
    { name: 'Площадь', desc: '', locationSlug: 'saint-petersburg-dvortsovaya-ploschad' },
    { name: 'Исаакий', desc: '', locationSlug: 'saint-petersburg-isaakievskiy-sobor' },
    { name: 'Спас', desc: '', locationSlug: 'saint-petersburg-spas-na-krovi' },
  ];
  const preset = buildCityDayRoutePreset(places, venues, city);
  assert.equal(preset.length, 4);
  assert.equal(preset[0]!.slug, 'ermitazh');
  assert.ok(cityDayRoutePresetAvailable(places, venues, city));
  assert.equal(
    cityDayRoutePresetAvailable(places.slice(0, 2), venues, city),
    false,
  );
});

test('dayRouteItemFromEvent adds venue + session label', () => {
  const item = dayRouteItemFromEvent({
    id: 'evt_1',
    slug: 'obzornaya',
    title: 'Обзорная',
    city: 'Санкт-Петербург',
    cityId: 'city_spb',
    citySlug: 'sankt-peterburg',
    venueId: 'venue_ermitazh',
    venueSlug: 'ermitazh',
    venue: 'Эрмитаж',
    venueKind: 'museum',
    venueLatitude: 59.9398,
    venueLongitude: 30.3146,
    startsAt: '2026-08-02T11:00:00+03:00',
    dateLabel: 'вс, 2 авг',
    timeLabel: '11:00',
  });
  assert.ok(item);
  assert.equal(item!.id, 'venue_ermitazh');
  assert.equal(item!.eventId, 'evt_1');
  assert.equal(item!.sessionLabel, 'вс, 2 авг, 11:00');
  assert.equal(item!.latitude, 59.9398);
});

test('dayRouteItemFromEvent requires venue id or slug', () => {
  assert.equal(
    dayRouteItemFromEvent({
      id: 'evt_2',
      title: 'Без площадки',
      venue: '',
    }),
    null,
  );
});
