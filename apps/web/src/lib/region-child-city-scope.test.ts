import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRegionChildCityChrome,
  canonicalizeRegionChildCitySearch,
  filterSessionsForRegionChildCity,
  parseRegionChildCityQuery,
  regionChildCityHref,
  resolveRegionChildCityScope,
  sessionMatchesRegionCityFilter,
} from './region-child-city-scope.ts';

const LO = {
  regionName: 'Ленинградская область',
  regionSlug: 'leningradskaya-oblast',
  centerSlug: 'saint-petersburg',
  childCities: [{ slug: 'vyborg', name: 'Выборг' }],
};

test('query parse accepts ?city= and broken ?city-hyphen', () => {
  assert.equal(parseRegionChildCityQuery('city=vyborg'), 'vyborg');
  assert.equal(parseRegionChildCityQuery('?city=vyborg'), 'vyborg');
  assert.equal(parseRegionChildCityQuery('city-vyborg'), 'vyborg');
  assert.equal(parseRegionChildCityQuery('?city-vyborg'), 'vyborg');
  assert.equal(parseRegionChildCityQuery('city=Выборг'), 'vyborg');
  assert.equal(parseRegionChildCityQuery('q=castle'), null);
  assert.equal(regionChildCityHref('leningradskaya-oblast', 'vyborg'), '/cities/leningradskaya-oblast?city=vyborg');
  assert.ok(!regionChildCityHref('leningradskaya-oblast', 'vyborg').includes('?city-'));
});

test('canonicalize rewrites hyphen query to ?city=', () => {
  const next = canonicalizeRegionChildCitySearch('city-vyborg');
  assert.equal(next?.get('city'), 'vyborg');
  assert.equal(next?.has('city-vyborg'), false);
  assert.equal(canonicalizeRegionChildCitySearch('city=vyborg'), null);
});

test('H1 is city-only; Formula A stays on locatorLabel', () => {
  const chrome = buildRegionChildCityChrome({
    ...LO,
    search: 'city=vyborg',
    now: new Date('2026-08-17T12:00:00+03:00'),
  });
  assert.ok(chrome);
  assert.equal(chrome.child.name, 'Выборг');
  assert.equal(chrome.h1, 'Выборг');
  assert.equal(chrome.regionLine, 'Ленинградская область');
  assert.equal(chrome.locatorLabel, 'Выборг, Ленинградская область • Ближайшие события');
  assert.match(chrome.lead, /в Выборге и ближайших населенных пунктах Ленинградской области/);
  assert.ok(!chrome.lead.includes('—'));
  assert.ok(!chrome.lead.includes('–'));
  assert.equal(chrome.title, 'Афиша Выборга: главные события и мероприятия 2026 | Дайбилет');
});

test('broken hyphen query still scopes H1 to Выборг', () => {
  const chrome = buildRegionChildCityChrome({ ...LO, search: 'city-vyborg' });
  assert.equal(chrome?.h1, 'Выборг');
  assert.equal(chrome?.locatorLabel, 'Выборг, Ленинградская область • Ближайшие события');
});

test('cityToRegion fallback when child is missing from payload', () => {
  const chrome = buildRegionChildCityChrome({
    regionName: 'Ленинградская область',
    regionSlug: 'leningradskaya-oblast',
    childCities: [],
    search: 'city=vyborg',
  });
  assert.equal(chrome?.child.name, 'Выборг');
  assert.equal(chrome?.h1, 'Выборг');
});

test('region or unknown query does not rewrite H1', () => {
  assert.equal(
    resolveRegionChildCityScope({ ...LO, search: 'city=leningradskaya-oblast' }),
    null,
  );
  assert.equal(resolveRegionChildCityScope({ ...LO, search: 'city=saint-petersburg' }), null);
  assert.equal(resolveRegionChildCityScope({ ...LO, search: 'city=nowhere' }), null);
  assert.equal(buildRegionChildCityChrome({ ...LO, search: '' }), null);
});

test('affiche filter matches child by name or slug', () => {
  assert.equal(
    sessionMatchesRegionCityFilter({ city: 'Выборг', citySlug: 'vyborg' }, ['Выборг'], ['vyborg']),
    true,
  );
  assert.equal(
    sessionMatchesRegionCityFilter({ city: 'Гатчина', citySlug: 'gatchina' }, ['Выборг'], ['vyborg']),
    false,
  );
  assert.equal(
    sessionMatchesRegionCityFilter({ city: 'Выборгский район', citySlug: 'vyborg' }, ['Выборг'], ['vyborg']),
    true,
  );
});

test('?city=vyborg on LO hub does not throw on sparse sessions', () => {
  const chrome = buildRegionChildCityChrome({
    ...LO,
    search: new URLSearchParams('city=vyborg'),
  });
  assert.ok(chrome);
  assert.doesNotThrow(() => {
    filterSessionsForRegionChildCity(
      [
        undefined,
        null,
        { city: null, citySlug: null },
        { city: 'Выборг', citySlug: 'vyborg' },
        { city: 'Гатчина' },
      ],
      chrome.child,
      LO.childCities,
    );
  });
  const filtered = filterSessionsForRegionChildCity(
    [
      undefined,
      { city: null },
      { city: 'Выборг', citySlug: 'vyborg' },
      { city: 'Гатчина', citySlug: 'gatchina' },
    ],
    chrome.child,
    LO.childCities,
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.city, 'Выборг');
});
