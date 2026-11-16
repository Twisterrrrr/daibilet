import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CITY_FIRST_LEGACY_ROUTE_SLUGS,
  isCityFirstLegacyRouteSlug,
  resolveCityFirstRedirectPath,
} from './city-first-route-slugs';
import { resolveLegacyCitySpellingRedirect } from './city-spelling-redirects';

test('legacy city root routes cover the current sitemap city hubs only', () => {
  assert.equal(CITY_FIRST_LEGACY_ROUTE_SLUGS.length, 51);
  assert.equal(new Set(CITY_FIRST_LEGACY_ROUTE_SLUGS).size, 51);
  assert.equal(isCityFirstLegacyRouteSlug('moscow'), true);
  assert.equal(isCityFirstLegacyRouteSlug('moskovskaya-oblast'), false);
  assert.equal(isCityFirstLegacyRouteSlug('mystery-city'), false);
});

test('legacy Novgorod spelling aliases redirect directly to city-first canonicals', () => {
  assert.equal(resolveLegacyCitySpellingRedirect('/cities/nizhniy-novgorod', true), '/nizhny-novgorod');
  assert.equal(resolveLegacyCitySpellingRedirect('/cities/velikiy-novgorod', true), '/veliky-novgorod');
  assert.equal(resolveLegacyCitySpellingRedirect('/places/c/nizhniy-novgorod', true), '/nizhny-novgorod/places');
  assert.equal(resolveLegacyCitySpellingRedirect('/places/c/velikiy-novgorod', true), '/veliky-novgorod/places');
  assert.equal(resolveLegacyCitySpellingRedirect('/cities/nizhniy-novgorod', false), '/cities/nizhny-novgorod');
  assert.equal(resolveLegacyCitySpellingRedirect('/cities/unknown', true), null);
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
