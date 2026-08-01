import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePublicVenueRecord } from './venue-normalize.js';

test('normalizePublicVenueRecord does not invent ул. before city prefix', () => {
  const result = normalizePublicVenueRecord({
    title: 'Исаакиевский собор',
    address: 'г. Санкт-Петербург, Исаакиевская площадь, д. 4',
    city: 'Санкт-Петербург',
  });
  assert.ok(result.address);
  assert.doesNotMatch(String(result.address), /^ул\.\s*г\./i);
  assert.match(String(result.address), /Исаакиевская площадь/i);
  assert.match(String(result.address), /4/);
});

test('normalizePublicVenueRecord keeps Fontanka pier street line intact', () => {
  const result = normalizePublicVenueRecord({
    title: 'Причал на наб. р. Фонтанки 105',
    address: 'набережная реки Фонтанки, 105',
    city: 'Санкт-Петербург',
  });
  assert.equal(result.address, 'набережная реки Фонтанки, 105');
});

test('normalizePublicVenueRecord keeps Ligovsky boarding address useful', () => {
  const result = normalizePublicVenueRecord({
    title: 'Точка сбора',
    address: 'Лиговский проспект, 10',
    city: 'Санкт-Петербург',
  });
  assert.ok(result.address);
  assert.match(String(result.address), /Лиговский/i);
  assert.match(String(result.address), /10/);
});
