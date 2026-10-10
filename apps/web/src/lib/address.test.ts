import assert from 'node:assert/strict';
import test from 'node:test';

import { formatStreetAddress } from './address.ts';

test('reorders adjectival type-first streets', () => {
  assert.equal(
    formatStreetAddress('Проспект Кольский, 158/1', { city: 'Мурманск' }),
    'Кольский проспект, 158/1',
  );
  assert.equal(formatStreetAddress('Проспект Кольский'), 'Кольский проспект');
  assert.equal(formatStreetAddress('Улица Советская, 10'), 'Советская улица, 10');
  assert.equal(formatStreetAddress('пр. Ленинский'), 'Ленинский проспект');
});

test('strips bilingual /// English tail', () => {
  assert.equal(
    formatStreetAddress('Дворцовая наб., 34///Dvortsovaya Emb., 34', { city: 'Санкт-Петербург' }),
    'Дворцовая наб., 34',
  );
});

test('keeps genitive type-first streets', () => {
  assert.equal(formatStreetAddress('Проспект Мира, 119'), 'Проспект Мира, 119');
  assert.equal(formatStreetAddress('Улица Баумана, 1'), 'Улица Баумана, 1');
  assert.equal(formatStreetAddress('Проспект Революции'), 'Проспект Революции');
});
