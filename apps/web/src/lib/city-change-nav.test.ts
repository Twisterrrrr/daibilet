import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCityChangeHref, resolveCityChangeNav } from './city-change-nav.ts';

const destinations = [
  { id: '1', name: 'Уфа', slug: 'ufa', type: 'city' as const, events: 10, venues: 2, categories: [] },
  {
    id: '2',
    name: 'Москва',
    slug: 'moscow',
    type: 'city' as const,
    events: 100,
    venues: 20,
    categories: [],
  },
  {
    id: '3',
    name: 'Казань',
    slug: 'kazan',
    type: 'city' as const,
    events: 40,
    venues: 8,
    categories: [],
  },
];

test('cities hub uses SEO-canonical SPB slug', () => {
  const withSpb = [
    ...destinations,
    {
      id: '4',
      name: 'Санкт-Петербург',
      slug: 'sankt-peterburg',
      type: 'city' as const,
      events: 80,
      venues: 12,
      categories: [],
    },
  ];
  assert.equal(
    resolveCityChangeHref({
      pathname: '/cities',
      cityName: 'Санкт-Петербург',
      destinations: withSpb,
    }),
    '/cities/saint-petersburg',
  );
});

test('cities list/hub → city hub, all → list', () => {
  assert.equal(
    resolveCityChangeHref({ pathname: '/cities', cityName: 'Казань', destinations }),
    '/cities/kazan',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/cities/nizhny-novgorod',
      cityName: 'Москва',
      destinations,
    }),
    '/cities/moscow',
  );
  assert.equal(
    resolveCityChangeHref({ pathname: '/cities/moscow', cityName: 'all', destinations }),
    '/cities',
  );
});

test('catalog section indexes keep filters and update city', () => {
  assert.equal(
    resolveCityChangeHref({
      pathname: '/events',
      cityName: 'Уфа',
      destinations,
      searchParams: new URLSearchParams('date=weekend&sort=time'),
    }),
    '/events?date=weekend&sort=time&city=ufa',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/venues',
      cityName: 'all',
      destinations,
      searchParams: new URLSearchParams('city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&q=театр'),
    }),
    '/places?city=all&q=%D1%82%D0%B5%D0%B0%D1%82%D1%80&family=institution',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/places',
      cityName: 'Уфа',
      destinations,
    }),
    '/places?city=ufa',
  );
});

test('PDP deep links return to Places hub with city', () => {
  assert.equal(
    resolveCityChangeHref({
      pathname: '/venues/some-hall',
      cityName: 'Казань',
      destinations,
    }),
    '/places?city=kazan',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/locations/park',
      cityName: 'Уфа',
      destinations,
    }),
    '/places?city=ufa',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/events/show-slug',
      cityName: 'Москва',
      destinations,
    }),
    '/events?city=moscow',
  );
});

test('podborki intent keeps intent and swaps city segment', () => {
  assert.equal(
    resolveCityChangeHref({
      pathname: '/podborki/besplatno',
      cityName: 'Казань',
      destinations,
    }),
    '/podborki/besplatno/kazan',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/podborki/besplatno/moscow',
      cityName: 'Уфа',
      destinations,
    }),
    '/podborki/besplatno/ufa',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/podborki/besplatno/moscow',
      cityName: 'all',
      destinations,
    }),
    '/podborki/besplatno',
  );
});

test('podborki city hub marker CHPU swaps city / all → hub', () => {
  const withPilot = [
    ...destinations,
    {
      id: 'spb',
      name: 'Санкт-Петербург',
      slug: 'sankt-peterburg',
      type: 'city' as const,
      events: 80,
      venues: 15,
      categories: [],
    },
    {
      id: 'kgd',
      name: 'Калининград',
      slug: 'kaliningrad',
      type: 'city' as const,
      events: 20,
      venues: 4,
      categories: [],
    },
  ];
  assert.equal(
    resolveCityChangeHref({
      pathname: '/podborki/c/kaliningrad',
      cityName: 'Санкт-Петербург',
      destinations: withPilot,
    }),
    '/podborki/c/saint-petersburg',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/podborki/c/kaliningrad',
      cityName: 'Казань',
      destinations: withPilot,
    }),
    '/podborki?city=kazan',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/podborki/c/moscow',
      cityName: 'all',
      destinations: withPilot,
    }),
    '/podborki',
  );
  assert.equal(
    resolveCityChangeHref({
      pathname: '/podborki',
      cityName: 'Калининград',
      destinations: withPilot,
    }),
    '/podborki/c/kaliningrad',
  );
});

test('blog header city change persists without ?city=', () => {
  assert.equal(
    resolveCityChangeHref({ pathname: '/blog', cityName: 'Москва', destinations }),
    null,
  );
  assert.equal(
    resolveCityChangeHref({ pathname: '/blog/some-article', cityName: 'Уфа', destinations }),
    null,
  );
  assert.equal(
    resolveCityChangeHref({ pathname: '/blog', cityName: 'all', destinations }),
    null,
  );
  assert.deepEqual(resolveCityChangeNav({ pathname: '/blog', cityName: 'Москва', destinations }), {
    action: 'persist',
  });
});

test('home persists; my-day navigates ?city=; static/unknown fallback (no catalog dump)', () => {
  assert.deepEqual(resolveCityChangeNav({ pathname: '/', cityName: 'Казань', destinations }), {
    action: 'persist',
  });
  assert.deepEqual(resolveCityChangeNav({ pathname: '/my-day', cityName: 'Казань', destinations }), {
    action: 'navigate',
    href: '/my-day?city=kazan',
  });
  assert.deepEqual(
    resolveCityChangeNav({
      pathname: '/my-day',
      cityName: 'all',
      destinations,
      searchParams: new URLSearchParams('city=kazan&items=1:free'),
    }),
    { action: 'navigate', href: '/my-day?items=1%3Afree' },
  );
  assert.deepEqual(resolveCityChangeNav({ pathname: '/about', cityName: 'Казань', destinations }), {
    action: 'fallback',
  });
  assert.equal(resolveCityChangeHref({ pathname: '/about', cityName: 'Казань', destinations }), null);
});
