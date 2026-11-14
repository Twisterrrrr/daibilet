import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSoftGeocodeQuery, softGeocodeFailureMessage } from './soft-geocode.ts';

test('buildSoftGeocodeQuery appends city when missing', () => {
  assert.equal(buildSoftGeocodeQuery('Ленина 1', 'Пермь'), 'Ленина 1, Пермь');
  assert.equal(buildSoftGeocodeQuery('Пермь, Ленина 1', 'Пермь'), 'Пермь, Ленина 1');
  assert.equal(buildSoftGeocodeQuery('  ', 'Пермь'), '');
});

test('softGeocodeFailureMessage stays list-only friendly', () => {
  assert.match(softGeocodeFailureMessage('not_found'), /только в списке/);
  assert.match(softGeocodeFailureMessage('network'), /без карты/);
});
