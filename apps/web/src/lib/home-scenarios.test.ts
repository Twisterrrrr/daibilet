import assert from 'node:assert/strict';
import test from 'node:test';

import { buildHomeHeroQuickChips, HERO_QUICK_CHIP_LIMIT } from './home-scenarios.ts';

test('national chips fill soft rail without exceeding cap', () => {
  const chips = buildHomeHeroQuickChips({
    landings: [
      { slug: 'river-cruises', title: 'Речные прогулки', events: 40 },
      { slug: 'rooftops', title: 'Крыши', events: 12 },
      { slug: 'concerts-genre', title: 'Концерты', events: 30 },
      { slug: 'family-kids', title: 'Семейные', events: 18 },
      { slug: 'bus-tours', title: 'Автобусные', events: 22 },
      { slug: 'walking-tours', title: 'Пешие', events: 15 },
      { slug: 'standup', title: 'Стендап', events: 9 },
    ],
  });

  assert.ok(chips.length >= 8);
  assert.ok(chips.length <= HERO_QUICK_CHIP_LIMIT);
  assert.ok(chips.some((chip) => /речн|прогулк/i.test(chip.label)));
  assert.ok(chips.some((chip) => chip.href.includes('/events')));
});

test('Moscow hero chips prefer hub landings and stay within one row cap', () => {
  const chips = buildHomeHeroQuickChips({
    citySlug: 'moscow',
    landings: [
      { slug: 'moscow-city-day', title: 'День города в Москве', events: 11 },
      { slug: 'concerts-genre', title: 'Концерты', events: 40 },
      { slug: 'river-cruises', title: 'Речные прогулки', events: 30 },
      { slug: 'bus-tours', title: 'Автобусные', events: 20 },
      { slug: 'moscow-museums', title: 'Музеи и выставки в Москве', events: 61 },
    ],
    categories: [
      { name: 'Театр', events: 15 },
      { name: 'Музеи и арт', events: 40 },
    ],
    hubTags: [{ kind: 'landing', slug: 'river-cruises', label: 'Речные прогулки' }],
  });

  assert.ok(chips.length >= 6);
  assert.ok(chips.length <= 12);
  assert.equal(chips[0]?.label, 'День города в Москве');
  assert.ok(chips.some((chip) => chip.label === 'Речные прогулки'));
  assert.ok(chips.some((chip) => /москв|moscow/i.test(chip.href) || chip.href.includes('/events')));
});

test('landlocked city does not promote river baseline chip', () => {
  const chips = buildHomeHeroQuickChips({
    citySlug: 'ekaterinburg',
    landings: [
      { slug: 'standup', title: 'Стендап', events: 12 },
      { slug: 'concerts-genre', title: 'Концерты', events: 20 },
      { slug: 'river-cruises', title: 'Речные прогулки', events: 5 },
    ],
    categories: [{ name: 'Театр', events: 8 }],
  });

  assert.ok(!chips.some((chip) => /речн/i.test(chip.label)));
  assert.ok(chips.some((chip) => /стендап/i.test(chip.label)));
});
