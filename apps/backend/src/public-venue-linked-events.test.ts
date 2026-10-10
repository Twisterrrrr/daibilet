import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dedupePublicVenueLinkedEvents,
  normalizeLinkedEventTitleKey,
  venueLinkedEventDedupeKey,
} from './public-venue-linked-events.ts';

test('normalizeLinkedEventTitleKey collapses hyphen variants', () => {
  assert.equal(
    normalizeLinkedEventTitleKey('Обзорная экскурсия по Санкт-Петербургу'),
    normalizeLinkedEventTitleKey('Обзорная экскурсия по Санкт Петербургу'),
  );
});

test('venueLinkedEventDedupeKey is title+venue for long titles', () => {
  const a = venueLinkedEventDedupeKey({
    id: 'evt_a',
    slug: 'tc-aaa-queen-v-osobnyake-polovcova',
    title: 'Queen в Особняке Половцова',
    venue: 'Особняк А.А. Половцова (Дом Архитектора)',
  });
  const b = venueLinkedEventDedupeKey({
    id: 'evt_b',
    slug: 'queen-v-osobnyake-polovcova-bbb',
    title: 'Queen в Особняке Половцова',
    venue: 'Особняк А.А. Половцова (Дом Архитектора)',
    priceFrom: 3000,
  } as never);
  assert.equal(a, b);
  assert.match(a, /^title:/);
  assert.match(a, /venue:/);
});

test('dedupePublicVenueLinkedEvents keeps one Queen with min price', () => {
  const rows = [
    {
      id: 'evt_1',
      slug: 'tc-1-queen',
      title: 'Queen в Особняке Половцова',
      venue: 'Особняк А.А. Половцова',
      priceFrom: 1750,
    },
    {
      id: 'evt_2',
      slug: 'queen-2',
      title: 'Queen в Особняке Половцова',
      venue: 'Особняк А.А. Половцова',
      priceFrom: 1500,
    },
    {
      id: 'evt_3',
      slug: 'tc-3-queen',
      title: 'Queen в Особняке Половцова',
      venue: 'Особняк А.А. Половцова',
      priceFrom: 3000,
    },
    {
      id: 'evt_4',
      slug: 'tc-4-jazz',
      title: 'Архитектура джаза',
      venue: 'Особняк А.А. Половцова',
      priceFrom: 1500,
    },
  ];
  const unique = dedupePublicVenueLinkedEvents(rows);
  assert.equal(unique.length, 2);
  const queen = unique.find((e) => e.title.startsWith('Queen'));
  assert.ok(queen);
  assert.equal(queen!.id, 'evt_1');
  assert.equal(queen!.priceFrom, 1500);
});

test('dedupePublicVenueLinkedEvents collapses identical Isaakiy siblings', () => {
  const title = 'Обзорная экскурсия по Санкт-Петербургу с посещением Исаакиевского собора';
  const venue = 'Исаакиевский собор';
  const rows = [1, 2, 3, 4].map((n) => ({
    id: `evt_${n}`,
    slug: `obzornaya-${n}`,
    title,
    venue,
    priceFrom: 1200,
  }));
  const unique = dedupePublicVenueLinkedEvents(rows);
  assert.equal(unique.length, 1);
  assert.equal(unique[0]!.priceFrom, 1200);
});

test('same title at different venues stays separate', () => {
  const rows = [
    {
      id: 'evt_a',
      slug: 'tour-a',
      title: 'Обзорная экскурсия по городу длинный заголовок',
      venue: 'Исаакиевский собор',
      priceFrom: 1200,
    },
    {
      id: 'evt_b',
      slug: 'tour-b',
      title: 'Обзорная экскурсия по городу длинный заголовок',
      venue: 'Казанский собор',
      priceFrom: 1300,
    },
  ];
  assert.equal(dedupePublicVenueLinkedEvents(rows).length, 2);
});
