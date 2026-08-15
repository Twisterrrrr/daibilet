import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractAddressFromListDescription,
  formatListDescription,
  isLogisticsListDescription,
} from './event-card-meta.ts';
import { resolveEventCardLocationLabel } from './event-location.ts';

test('formatListDescription strips meeting-point labels', () => {
  assert.equal(
    formatListDescription('Место встречи: г. Санкт-Петербург, ст.м. пл. Восстания'),
    'г. Санкт-Петербург, ст.м. пл. Восстания',
  );
  assert.equal(
    formatListDescription('Место и время встречи • Адрес: г. Санкт Петербург, ст. м. «Площадь»'),
    'г. Санкт Петербург, ст. м. «Площадь»',
  );
});

test('isLogisticsListDescription detects supplier address dumps', () => {
  assert.equal(
    isLogisticsListDescription('Место встречи: г. Санкт-Петербург, ст.м. пл. Восстания'),
    true,
  );
  assert.equal(
    isLogisticsListDescription('Река Карповка, парадная акватория Невы, известные дворцы.'),
    false,
  );
});

test('extractAddressFromListDescription only for logistics text', () => {
  assert.equal(
    extractAddressFromListDescription('Место встречи: ул. Итальянская, 5'),
    'ул. Итальянская, 5',
  );
  assert.equal(extractAddressFromListDescription('Космическое путешествие под куполом'), '');
});

test('resolveEventCardLocationLabel prefers street address over venue name', () => {
  assert.equal(
    resolveEventCardLocationLabel({
      venue: 'Планетарий 1',
      venueAddress: 'Александровский парк, 4',
      city: 'Санкт-Петербург',
    }),
    'Александровский парк, 4',
  );
});
