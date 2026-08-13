import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityToAccusative,
  cityToGenitive,
  cityToNominative,
  cityToPrepositional,
  inCityAccusative,
  isSeoExpansionCity,
  resolveCityCases,
} from './city-declension.ts';

test('Kazan / Ekaterinburg cases by name', () => {
  assert.deepEqual(resolveCityCases('Казань'), {
    nominative: 'Казань',
    genitive: 'Казани',
    prepositional: 'Казани',
    accusative: 'Казань',
  });
  assert.deepEqual(resolveCityCases('Екатеринбург'), {
    nominative: 'Екатеринбург',
    genitive: 'Екатеринбурга',
    prepositional: 'Екатеринбурге',
    accusative: 'Екатеринбург',
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

test('accusative for ехать в …', () => {
  assert.equal(cityToAccusative('Москва'), 'Москву');
  assert.equal(inCityAccusative('Москва'), 'в Москву');
  assert.equal(inCityAccusative('Казань'), 'в Казань');
  assert.equal(inCityAccusative('Владимир'), 'во Владимир');
  assert.equal(inCityAccusative('Орёл'), 'в Орёл');
  assert.equal(inCityAccusative('moscow'), 'в Москву');
});

test('Karelia region does not become Карелие', () => {
  assert.equal(cityToPrepositional('Республика Карелия'), 'Республике Карелии');
  assert.equal(cityToPrepositional('Карелия'), 'Карелии');
  assert.equal(cityToPrepositional('respublika-kareliya'), 'Республике Карелии');
  assert.equal(cityToGenitive('Республика Карелия'), 'Республики Карелии');
  assert.equal(cityToAccusative('Республика Карелия'), 'Республику Карелию');
  assert.equal(cityToPrepositional('Московская область'), 'Московской области');
});

test('Bashkortostan second word does not take -а', () => {
  assert.equal(cityToNominative('respublika-bashkortostan'), 'Республика Башкортостан');
  assert.equal(cityToGenitive('Республика Башкортостан'), 'Республики Башкортостан');
  assert.equal(cityToPrepositional('Республика Башкортостан'), 'Республике Башкортостан');
  assert.equal(cityToAccusative('Республика Башкортостан'), 'Республику Башкортостан');
});

test('isSeoExpansionCity', () => {
  assert.equal(isSeoExpansionCity('Казань'), true);
  assert.equal(isSeoExpansionCity({ slug: 'ekaterinburg' }), true);
  assert.equal(isSeoExpansionCity({ name: 'Москва', slug: 'moscow' }), false);
});
