import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CITY_HUBS,
  findCityHub,
  hasCityHubContentPack,
  isCityHub,
  isCityHubAffiche,
  isStrongCityHub,
  resolveHubSlug,
} from './city-hub-registry.ts';

test('registry holds 31 hubs and every slug is unique', () => {
  assert.equal(CITY_HUBS.length, 31);
  const slugs = CITY_HUBS.map((hub) => hub.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate hub slugs');
});

test('spelling variants resolve to the canonical hub', () => {
  // moscow/moskva and the two Saint Petersburg spellings all appear in the wild.
  assert.equal(resolveHubSlug('moscow'), 'moskva');
  assert.equal(resolveHubSlug('MOSCOW'), 'moskva');
  assert.equal(resolveHubSlug('moskva'), 'moskva');
  assert.equal(resolveHubSlug('saint-petersburg'), 'санкт-петербург');
  assert.equal(resolveHubSlug('sankt-peterburg'), 'санкт-петербург');
  assert.equal(resolveHubSlug('санкт-петербург'), 'санкт-петербург');
  assert.equal(resolveHubSlug('nizhny-novgorod'), 'nizhniy-novgorod');
});

test('a city path resolves on its first segment', () => {
  assert.equal(resolveHubSlug('/places/c/moscow'), 'moskva');
  assert.equal(isCityHub('kazan/something'), true);
});

test('non-hubs are not hubs', () => {
  assert.equal(isCityHub(null), false);
  assert.equal(isCityHub(''), false);
  assert.equal(isCityHub('barnaul-not-real'), false);
  assert.equal(findCityHub('vladivostok'), null);
});

test('affiche and strong are separate concerns', () => {
  // Perm has a content pack and an affiche tab but is not on the strong list.
  assert.equal(isCityHubAffiche('perm'), true);
  assert.equal(isStrongCityHub('perm'), true);

  // Krasnoyarsk has a pack and an affiche tab, but is not strong.
  assert.equal(hasCityHubContentPack('krasnoyarsk'), true);
  assert.equal(isCityHubAffiche('krasnoyarsk'), true);
  assert.equal(isStrongCityHub('krasnoyarsk'), false);

  // Novosibirsk is strong but has no affiche tab.
  assert.equal(isStrongCityHub('novosibirsk'), true);
  assert.equal(isCityHubAffiche('novosibirsk'), false);
});

test('cities with an affiche tab all resolve to a known hub', () => {
  // Guards against the old drift: every slug in TOURIST_AFFICHE_SLUGS must exist
  // in the registry, including the Latin spellings.
  for (const slug of [
    'perm', 'kaliningrad', 'nizhniy-novgorod', 'saint-petersburg',
    'moscow', 'ekaterinburg', 'kazan', 'samara', 'krasnodar', 'krasnoyarsk',
  ]) {
    assert.equal(isCityHubAffiche(slug), true, `${slug} should be an affiche hub`);
  }
});