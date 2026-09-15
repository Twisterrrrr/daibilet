import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDayRouteShortPath,
  parseDayRouteReadableSlug,
  slugifyDayRouteShareTitle,
  suggestDayRouteShareTitle,
} from './day-route-share-url';

test('slugifyDayRouteShareTitle transliterates cyrillic', () => {
  assert.equal(slugifyDayRouteShareTitle('Сердце Питера'), 'serdce-pitera');
});

test('build + parse round-trip keeps trailing code', () => {
  const path = buildDayRouteShortPath('x7k2m9a', {
    citySlug: 'spb',
    titleSlug: 'serdtse-pitere',
  });
  assert.equal(path, '/m/spb-serdtse-pitere-x7k2m9a');
  const slug = path.slice('/m/'.length);
  const parsed = parseDayRouteReadableSlug(slug);
  assert.equal(parsed?.code, 'x7k2m9a');
  assert.equal(parsed?.citySlug, 'spb');
  assert.equal(parsed?.titleSlug, 'serdtse-pitere');
});

test('suggestDayRouteShareTitle fallback', () => {
  assert.equal(suggestDayRouteShareTitle({ cityTitle: 'Казань' }), 'Маршрут на день - Казань');
});
