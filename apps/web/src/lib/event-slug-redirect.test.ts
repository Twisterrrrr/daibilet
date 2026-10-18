import assert from 'node:assert/strict';
import test from 'node:test';

import { cyrillicCityRedirectPath, cyrillicEventRedirectPath } from './event-slug-redirect.ts';

test('cyrillicEventRedirectPath transliterates TEP Cyrillic event URLs', () => {
  const cyrillic =
    '/events/зимнии-фестиваль-pianissimo-сольныи-концерт-алихан-кундухов-в-большом-петергофском-дворце-6a96ea0935bfdcc3b65c41c6';
  assert.equal(
    cyrillicEventRedirectPath(cyrillic),
    '/events/zimnii-festival-pianissimo-solnyi-koncert-alihan-kunduhov-v-bolshom-petergofskom-dvorce-6a96ea0935bfdcc3b65c41c6',
  );
});

test('cyrillicEventRedirectPath accepts percent-encoded pathnames', () => {
  const encoded =
    '/events/%D0%B7%D0%B8%D0%BC%D0%BD%D0%B8%D0%B8-%D1%84%D0%B5%D1%81%D1%82%D0%B8%D0%B2%D0%B0%D0%BB%D1%8C-pianissimo-6a96ea0935bfdcc3b65c41c6';
  assert.equal(
    cyrillicEventRedirectPath(encoded),
    '/events/zimnii-festival-pianissimo-6a96ea0935bfdcc3b65c41c6',
  );
});

test('cyrillicEventRedirectPath leaves latin event slugs alone', () => {
  assert.equal(
    cyrillicEventRedirectPath(
      '/events/zimnii-festival-pianissimo-solnyi-koncert-alihan-kunduhov-v-bolshom-petergofskom-dvorce-6a96ea0935bfdcc3b65c41c6',
    ),
    null,
  );
  assert.equal(cyrillicEventRedirectPath('/events'), null);
});

test('cyrillicCityRedirectPath transliterates Cyrillic city hub URLs', () => {
  assert.equal(cyrillicCityRedirectPath('/cities/москва'), '/cities/moskva');
  assert.equal(cyrillicCityRedirectPath('/cities/санкт-петербург'), '/cities/sankt-peterburg');
  assert.equal(
    cyrillicCityRedirectPath('/cities/%D0%BC%D0%BE%D1%81%D0%BA%D0%B2%D0%B0'),
    '/cities/moskva',
  );
  assert.equal(cyrillicCityRedirectPath('/places/c/казань'), '/places/c/kazan');
});

test('cyrillicCityRedirectPath leaves latin city slugs alone', () => {
  assert.equal(cyrillicCityRedirectPath('/cities/moskva'), null);
  assert.equal(cyrillicCityRedirectPath('/cities'), null);
  assert.equal(cyrillicCityRedirectPath('/'), null);
});
