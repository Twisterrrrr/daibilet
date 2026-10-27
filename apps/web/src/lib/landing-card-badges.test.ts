import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectLandingBadgeFacets,
  deriveLandingCardBadges,
  sessionMatchesLandingBadge,
} from './landing-card-badges.ts';

test('deriveLandingCardBadges: walking / private from title and tags', () => {
  const badges = deriveLandingCardBadges({
    title: 'Индивидуальная пешеходная прогулка по центру',
    category: 'Экскурсии',
    tags: ['Пешеходные'],
    subcategories: [],
  });
  const ids = badges.map((b) => b.id);
  assert.ok(ids.includes('walking'));
  assert.ok(ids.includes('private'));
  assert.equal(ids.includes('hit'), false);
});

test('deriveLandingCardBadges: prefers set-menu over generic dinner', () => {
  const badges = deriveLandingCardBadges({
    title: 'Ужин на теплоходе с сет-меню',
    category: 'Речные прогулки',
    tags: ['Ужин', 'Сет-меню'],
  });
  assert.ok(badges.some((b) => b.id === 'set-menu'));
  assert.equal(badges.some((b) => b.id === 'dinner'), false);
});

test('deriveLandingCardBadges: hit only from real sessionCount / landingSlugs', () => {
  const without = deriveLandingCardBadges({
    title: 'Стендап концерт',
    category: 'Юмор',
    tags: [],
    sessionCount: 1,
    landingSlugs: [],
  });
  assert.equal(without.some((b) => b.id === 'hit'), false);

  const withHit = deriveLandingCardBadges({
    title: 'Стендап концерт',
    category: 'Юмор',
    tags: [],
    sessionCount: 5,
  });
  assert.ok(withHit.some((b) => b.id === 'hit'));
});

test('sessionMatchesLandingBadge filters by id', () => {
  const bus = {
    title: 'Обзорная экскурсия на автобусе',
    category: 'Экскурсии',
    tags: ['Автобусные'],
  };
  assert.equal(sessionMatchesLandingBadge(bus, 'bus'), true);
  assert.equal(sessionMatchesLandingBadge(bus, 'walking'), false);
});

test('collectLandingBadgeFacets returns dinner facets present in set', () => {
  const facets = collectLandingBadgeFacets([
    { title: 'VIP ужин', category: '', tags: ['VIP', 'Ужин'] },
    { title: 'Фуршет круиз', category: '', tags: ['Фуршет'] },
  ]);
  const ids = facets.map((f) => f.id);
  assert.ok(ids.includes('vip'));
  assert.ok(ids.includes('buffet'));
  assert.ok(ids.includes('dinner'));
});
