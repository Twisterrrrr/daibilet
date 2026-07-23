import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityToGenitive,
  cityToNominative,
  cityToPrepositional,
  isSeoExpansionCity,
  resolveCityCases,
} from '@/lib/city-declension';

test('Kazan / Ekaterinburg cases by name', () => {
  assert.deepEqual(resolveCityCases('Казань'), {
    nominative: 'Казань',
    genitive: 'Казани',
    prepositional: 'Казани',
  });
  assert.deepEqual(resolveCityCases('Екатеринбург'), {
    nominative: 'Екатеринбург',
    genitive: 'Екатеринбурга',
    prepositional: 'Екатеринбурге',
  });
});

test('cases resolve by slug', () => {
  assert.equal(cityToNominative('kazan'), 'Казань');
  assert.equal(cityToPrepositional('ekaterinburg'), 'Екатеринбурге');
  assert.equal(cityToGenitive('kazan'), 'Казани');
});

test('Moscow / SPB still decline', () => {
  assert.equal(cityToPrepositional('Москва'), 'Москве');
  assert.equal(cityToGenitive('Санкт-Петербург'), 'Санкт-Петербурга');
});

test('isSeoExpansionCity', () => {
  assert.equal(isSeoExpansionCity('Казань'), true);
  assert.equal(isSeoExpansionCity({ slug: 'ekaterinburg' }), true);
  assert.equal(isSeoExpansionCity({ name: 'Москва', slug: 'moscow' }), false);
});
