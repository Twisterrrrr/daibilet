import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadCityRoutingConfig } from './city-routing-config.js';
import { resolveCityRoutingPath, resolveProjectRoot } from './project-root.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const expectedRoot = path.resolve(here, '../../..');

test('resolveProjectRoot finds monorepo via import.meta.url', () => {
  const root = resolveProjectRoot(import.meta.url);
  assert.equal(root, expectedRoot);
  assert.ok(resolveCityRoutingPath(import.meta.url).endsWith(path.join('data', 'geo', 'city-routing.ru.json')));
});

test('loadCityRoutingConfig returns standalone cities', () => {
  const routing = loadCityRoutingConfig(import.meta.url);
  assert.ok(Array.isArray(routing.standaloneCities));
  assert.ok((routing.standaloneCities || []).includes('Самара'));
  assert.ok((routing.standaloneCities || []).includes('Владикавказ'));
  assert.ok((routing.standaloneCities || []).includes('Ханты-Мансийск'));
  assert.ok((routing.standaloneCities || []).includes('Тольятти'));
  assert.ok((routing.standaloneCities || []).includes('Сортавала'));
  assert.ok((routing.standaloneCities || []).includes('Сургут'));
  assert.ok((routing.standaloneCities || []).includes('Новокузнецк'));
  assert.equal((routing.cityToRegion || {})['Тольятти'], 'Самарская область');
  assert.equal((routing.cityToRegion || {})['Сортавала'], 'Республика Карелия');
  assert.equal((routing.cityToRegion || {})['Сургут'], 'Ханты-Мансийский автономный округ');
  assert.equal((routing.cityToRegion || {})['Новокузнецк'], 'Кемеровская область');
  assert.equal((routing.cityToRegion || {})['Владикавказ'], undefined);
  assert.equal((routing.cityToRegion || {})['Ханты-Мансийск'], undefined);
  assert.equal((routing.standaloneCities || []).includes('Махачкала'), false);
  assert.equal((routing.standaloneCities || []).includes('Набережные Челны'), false);
});

test('resolveProjectRoot prefers DAIBILET_PROJECT_ROOT when marker exists', () => {
  const prev = process.env.DAIBILET_PROJECT_ROOT;
  process.env.DAIBILET_PROJECT_ROOT = expectedRoot;
  try {
    assert.equal(resolveProjectRoot(undefined), expectedRoot);
  } finally {
    if (prev === undefined) delete process.env.DAIBILET_PROJECT_ROOT;
    else process.env.DAIBILET_PROJECT_ROOT = prev;
  }
});
