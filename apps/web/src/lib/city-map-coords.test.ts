import assert from 'node:assert/strict';
import test from 'node:test';

import { lookupCityMapCoords, resolveCityMapCoords } from './city-map-coords.ts';

/** Live destination slugs from `/api/public/destinations` (type=city), 2026-08-06. */
const LIVE_CITY_SLUGS = [
  'moskva',
  'sankt-peterburg',
  'kazan',
  'krasnodar',
  'krasnoyarsk',
  'abakan',
  'ulyanovsk',
  'vladivostok',
  'habarovsk',
  'hanty-mansiysk',
  'samara',
  'chelyabinsk',
  'ufa',
  'barnaul',
  'arhangelsk',
  'astrahan',
  'belgorod',
  'blagoveschensk-amurskaya-oblast',
  'bryansk',
  'velikiy-novgorod',
  'vladimir',
  'volgograd',
  'vologda',
  'voronezh',
  'ekaterinburg',
  'ivanovo',
  'izhevsk',
  'irkutsk',
  'yoshkar-ola',
  'kaliningrad',
  'kaluga',
  'kemerovo',
  'kirov-kirovskaya-oblast',
  'kostroma',
  'kurgan',
  'kursk',
  'lipeck',
  'murmansk',
  'nizhniy-novgorod',
  'novokuznetsk',
  'novosibirsk',
  'omsk',
  'orel',
  'orenburg',
  'penza',
  'perm',
  'pskov',
  'rostov-na-donu',
  'ryazan',
  'saransk',
  'saratov',
  'sevastopol',
  'simferopol',
  'smolensk',
  'sochi',
  'stavropol',
  'surgut',
  'syktyvkar',
  'tambov',
  'tolyatti',
  'tver',
  'tomsk',
  'tula',
  'tyumen',
  'ulan-ude',
  'cheboksary',
  'chita',
  'yuzhno-sahalinsk',
  'yaroslavl',
];

test('city-map-coords covers all live destination city slugs', () => {
  const missing: string[] = [];
  for (const slug of LIVE_CITY_SLUGS) {
    if (!lookupCityMapCoords(slug)) missing.push(slug);
  }
  assert.deepEqual(missing, [], `missing coords for: ${missing.join(', ')}`);
  assert.equal(LIVE_CITY_SLUGS.length, 69);
});

test('resolveCityMapCoords accepts SEO aliases and Russian names', () => {
  assert.ok(resolveCityMapCoords({ slug: 'moscow', name: 'Москва' }));
  assert.ok(resolveCityMapCoords({ slug: 'saint-petersburg', name: 'Санкт-Петербург' }));
  assert.ok(resolveCityMapCoords({ slug: null, name: 'Пермь' }));
  assert.ok(resolveCityMapCoords({ slug: 'nizhny-novgorod', name: 'Нижний Новгород' }));
});
