import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CITY_FIRST_LEGACY_ROUTE_SLUGS,
  isCityFirstLegacyRouteSlug,
  resolveCityFirstRedirectPath,
} from './city-first-route-slugs';

test('legacy city root routes cover the current sitemap city hubs only', () => {
  assert.equal(CITY_FIRST_LEGACY_ROUTE_SLUGS.length, 51);
  assert.equal(new Set(CITY_FIRST_LEGACY_ROUTE_SLUGS).size, 51);
  assert.equal(isCityFirstLegacyRouteSlug('moscow'), true);
  assert.equal(isCityFirstLegacyRouteSlug('moskovskaya-oblast'), false);
  assert.equal(isCityFirstLegacyRouteSlug('mystery-city'), false);
});

test('city-first redirects old city URLs and spelling aliases only for ready hubs', () => {
  assert.equal(resolveCityFirstRedirectPath('/cities/perm', true), '/perm');
  assert.equal(resolveCityFirstRedirectPath('/places/c/perm', true), '/perm/places');
  assert.equal(resolveCityFirstRedirectPath('/nizhniy-novgorod', true), '/nizhny-novgorod');
  assert.equal(resolveCityFirstRedirectPath('/velikiy-novgorod/places', true), '/veliky-novgorod/places');
  assert.equal(resolveCityFirstRedirectPath('/moscow', true), null);
  assert.equal(resolveCityFirstRedirectPath('/cities/not-reviewed', true), null);
  assert.equal(resolveCityFirstRedirectPath('/places/c/perm', false), null);
});
