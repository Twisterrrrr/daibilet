import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicDestinationDto } from '@daibilet/contracts/public';

import {
  CITY_PROMPT_STORAGE_KEY,
  SELECTED_CITY_STORAGE_KEY,
  persistSelectedCity,
} from './selected-city.ts';
import {
  hasCompletedCityPrompt,
  hasExplicitCityChoice,
  markCityPromptCompleted,
  shouldOfferFirstVisitCityPrompt,
  suggestNearestCity,
} from './first-visit-city.ts';

const cities = [
  {
    id: '1',
    name: 'Москва',
    slug: 'moscow',
    type: 'city' as const,
    events: 100,
    venues: 20,
    categories: [],
  },
  {
    id: '2',
    name: 'Санкт-Петербург',
    slug: 'sankt-peterburg',
    sourceSlug: 'saint-petersburg',
    type: 'city' as const,
    events: 80,
    venues: 15,
    categories: [],
  },
  {
    id: '3',
    name: 'Уфа',
    slug: 'ufa',
    type: 'city' as const,
    events: 10,
    venues: 2,
    categories: [],
  },
] satisfies PublicDestinationDto[];

test('shouldOfferFirstVisitCityPrompt skips catalog gates and account', () => {
  assert.equal(shouldOfferFirstVisitCityPrompt('/'), true);
  assert.equal(shouldOfferFirstVisitCityPrompt('/cities'), true);
  assert.equal(shouldOfferFirstVisitCityPrompt('/places'), true);
  assert.equal(shouldOfferFirstVisitCityPrompt('/events'), false);
  assert.equal(shouldOfferFirstVisitCityPrompt('/events/some-slug'), false);
  assert.equal(shouldOfferFirstVisitCityPrompt('/podborki'), false);
  assert.equal(shouldOfferFirstVisitCityPrompt('/checkout/ticket/abc'), false);
  assert.equal(shouldOfferFirstVisitCityPrompt('/login'), false);
  assert.equal(shouldOfferFirstVisitCityPrompt('/admin/events'), false);
});

test('suggestNearestCity maps GPS to catalog city and refuses far points', () => {
  const moscow = suggestNearestCity(cities, 55.7558, 37.6173);
  assert.equal(moscow?.name, 'Москва');

  const spb = suggestNearestCity(cities, 59.9343, 30.3351);
  assert.equal(spb?.name, 'Санкт-Петербург');

  // ~10 km north of Moscow still Moscow.
  const khimki = suggestNearestCity(cities, 55.889, 37.445);
  assert.equal(khimki?.name, 'Москва');

  // Mid-Russia, not near a listed hub.
  assert.equal(suggestNearestCity(cities, 58.0, 40.0), null);
  assert.equal(suggestNearestCity(cities, 0, 0), null);
});

test('hasExplicitCityChoice honors prompted flag without overwriting storage', () => {
  const storage = new Map<string, string>();
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });

  try {
    assert.equal(hasCompletedCityPrompt(), false);
    assert.equal(hasExplicitCityChoice(cities), false);

    markCityPromptCompleted();
    assert.equal(hasCompletedCityPrompt(), true);
    assert.equal(hasExplicitCityChoice(cities), true);
    assert.equal(storage.get(CITY_PROMPT_STORAGE_KEY), '1');
    assert.equal(storage.has('daibilet:selected-city'), false);

    storage.clear();
    storage.set('daibilet:selected-city', 'Уфа');
    assert.equal(hasExplicitCityChoice(cities), true);

    storage.clear();
    persistSelectedCity('all');
    assert.equal(storage.has(SELECTED_CITY_STORAGE_KEY), false);
    assert.equal(storage.get(CITY_PROMPT_STORAGE_KEY), '1');
    assert.equal(hasExplicitCityChoice(cities), true);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
  }
});
