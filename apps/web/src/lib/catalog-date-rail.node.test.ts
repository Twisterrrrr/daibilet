import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCatalogDateRailChips,
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
  assert.equal(chips[0]?.kind, 'day');
  if (chips[0]?.kind === 'day') {
    assert.equal(chips[0].iso, toLocalIsoDay(now));
    assert.equal(chips[0].weekday, 'сег');
    assert.equal(chips[0].dayNum, 26);
    assert.equal(chips[0].monthShort, 'авг');
  }
  assert.equal(chips[1]?.kind === 'day' && chips[1].weekday, 'зав');
  assert.equal(chips[3]?.kind === 'day' && chips[3].isWeekend, true);
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
});

test('formats range labels in Russian', () => {
  assert.equal(formatCatalogDateRangeLabel('2026-08-26', '2026-08-26'), '26 августа');
  assert.equal(formatCatalogDateRangeLabel('2026-08-26', '2026-09-03'), '26 августа — 3 сентября');
});
