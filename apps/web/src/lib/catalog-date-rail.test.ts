import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogSearchHintsFromFacets, splitCatalogCategories } from './catalog-category-rail.ts';
import {
  buildCatalogDateRailChips,
  CATALOG_DATE_RAIL_DAYS_DESKTOP,
  CATALOG_DATE_RAIL_DAYS_TABLET,
  formatCatalogDateRangeLabel,
  isDateRailChipActive,
  nextCatalogDateRailSelection,
  toLocalIsoDay,
} from './catalog-date-rail.ts';

test('builds day cards from today (СЕГ / ЗАВ)', () => {
  const now = new Date(2026, 7, 26);
  const chips = buildCatalogDateRailChips(now, CATALOG_DATE_RAIL_DAYS_TABLET);
  assert.equal(chips.length, CATALOG_DATE_RAIL_DAYS_TABLET);
  const first = chips[0];
  assert.equal(first?.kind, 'day');
  if (first?.kind === 'day') {
    assert.equal(first.iso, toLocalIsoDay(now));
    assert.equal(first.weekday, 'сег');
    assert.equal(first.dayNum, 26);
    assert.equal(first.monthShort, 'авг');
  }
  const second = chips[1];
  assert.equal(second?.kind === 'day' && second.weekday, 'зав');
  assert.equal(second?.kind === 'day' && second.dayNum, 27);
  const fourth = chips[3];
  assert.equal(fourth?.kind === 'day' && fourth.isWeekend, true);
});

test('can build legacy presets for region pages', () => {
  const now = new Date(2026, 7, 9);
  const chips = buildCatalogDateRailChips(now, 7, { includePresets: true });
  assert.equal(chips[0]?.kind === 'preset' && chips[0].value, 'all');
  assert.equal(chips[1]?.kind === 'preset' && chips[1].value, 'today');
  const days = chips.filter((c) => c.kind === 'day');
  assert.equal(days.length, 7);
});

test('can build a longer desktop day strip', () => {
  const now = new Date(2026, 7, 9);
  const days = buildCatalogDateRailChips(now, CATALOG_DATE_RAIL_DAYS_DESKTOP).filter((c) => c.kind === 'day');
  assert.equal(days.length, CATALOG_DATE_RAIL_DAYS_DESKTOP);
});

test('marks days inside from–to range active', () => {
  const chip = {
    kind: 'day' as const,
    iso: '2026-08-28',
    label: 'пт 28 авг',
    shortLabel: 'пт 28',
    weekday: 'пт',
    dayNum: 28,
    monthShort: 'авг',
    isWeekend: false,
  };
  assert.equal(isDateRailChipActive(chip, { from: '2026-08-26', to: '2026-09-03' }), true);
  assert.equal(isDateRailChipActive(chip, { from: '2026-08-12', to: '2026-08-12' }), false);
  assert.equal(isDateRailChipActive(chip, { date: 'today' }), false);
});

test('nextCatalogDateRailSelection: single → range → collapse → clear', () => {
  assert.deepEqual(nextCatalogDateRailSelection({}, '2026-08-26'), {
    from: '2026-08-26',
    to: '2026-08-26',
  });
  assert.deepEqual(
    nextCatalogDateRailSelection({ from: '2026-08-26', to: '2026-08-26' }, '2026-09-03'),
    { from: '2026-08-26', to: '2026-09-03' },
  );
  assert.deepEqual(
    nextCatalogDateRailSelection({ from: '2026-08-26', to: '2026-09-03' }, '2026-08-29'),
    { from: '2026-08-29', to: '2026-08-29' },
  );
  assert.deepEqual(
    nextCatalogDateRailSelection({ from: '2026-08-29', to: '2026-08-29' }, '2026-08-29'),
    {},
  );
});

test('formats range labels in Russian', () => {
  assert.equal(formatCatalogDateRangeLabel('2026-08-26', '2026-08-26'), '26 августа');
  assert.equal(formatCatalogDateRangeLabel('2026-08-26', '2026-09-03'), '26 августа — 3 сентября');
});

test('pins excursions/museums and caps primary categories', () => {
  const facets = [
    { name: 'Лекции', events: 40 },
    { name: 'Экскурсии', events: 10 },
    { name: 'Музеи и арт', events: 8 },
    { name: 'Стендап', events: 20 },
    { name: 'A', events: 5 },
    { name: 'B', events: 4 },
    { name: 'C', events: 3 },
    { name: 'D', events: 2 },
    { name: 'E', events: 1 },
  ];
  const { primary, overflow } = splitCatalogCategories(facets);
  assert.equal(primary[0]?.name, 'Экскурсии');
  assert.equal(primary[1]?.name, 'Музеи и арт');
  assert.equal(primary[2]?.name, 'Стендап');
  assert.equal(primary.length, 7);
  assert.ok(overflow.length > 0);
});

test('builds search hints from facets without inventing', () => {
  const hints = catalogSearchHintsFromFacets([
    { name: 'Экскурсии', events: 12 },
    { name: 'Лекции', events: 2 },
  ]);
  assert.ok(hints.some((h) => h.q === 'выставки'));
  assert.ok(hints.some((h) => h.label === 'Концерты на выходных'));
  assert.ok(hints.some((h) => h.category === 'Лекции'));
  assert.equal(hints.filter((h) => h.label === 'Экскурсии').length, 1);
  assert.equal(hints.some((h) => h.q === 'стендап'), false);
});
