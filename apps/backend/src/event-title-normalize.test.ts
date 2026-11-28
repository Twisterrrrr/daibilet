import assert from 'node:assert/strict';
import test from 'node:test';

import { formatPublicEventTitle, normalizeImportEventTitle } from './event-title-normalize.ts';

test('formatPublicEventTitle capitalizes cyrillic first letter', () => {
  assert.equal(formatPublicEventTitle('комбо 1'), 'Комбо 1');
  assert.equal(formatPublicEventTitle('  stand up  '), 'Stand up');
  assert.equal(formatPublicEventTitle('«ночная прогулка»'), '«Ночная прогулка»');
});

test('normalizeImportEventTitle matches formatPublicEventTitle', () => {
  assert.equal(normalizeImportEventTitle('музей гарри поттера'), 'Музей гарри поттера');
  assert.equal(normalizeImportEventTitle(''), '');
});

test('already capitalized titles stay stable', () => {
  assert.equal(formatPublicEventTitle('Комбо 1'), 'Комбо 1');
  assert.equal(formatPublicEventTitle('Stand up'), 'Stand up');
});
