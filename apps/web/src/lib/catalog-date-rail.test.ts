import { describe, expect, it } from 'vitest';

import { catalogSearchHintsFromFacets, splitCatalogCategories } from './catalog-category-rail';
import {
  buildCatalogDateRailChips,
  CATALOG_DATE_RAIL_DAYS_DESKTOP,
  CATALOG_DATE_RAIL_DAYS_TABLET,
  formatCatalogDateRangeLabel,
  isDateRailChipActive,
  nextCatalogDateRailSelection,
  toLocalIsoDay,
} from './catalog-date-rail';

describe('catalog-date-rail', () => {
  it('builds day cards from today (СЕГ / ЗАВ)', () => {
    const now = new Date(2026, 7, 26); // Wed Aug 26
    const chips = buildCatalogDateRailChips(now, CATALOG_DATE_RAIL_DAYS_TABLET);
    expect(chips).toHaveLength(CATALOG_DATE_RAIL_DAYS_TABLET);
    expect(chips[0]).toMatchObject({
      kind: 'day',
      iso: toLocalIsoDay(now),
      weekday: 'сег',
      dayNum: 26,
      monthShort: 'авг',
    });
    expect(chips[1]).toMatchObject({ kind: 'day', weekday: 'зав', dayNum: 27 });
    expect(chips[3]).toMatchObject({ kind: 'day', weekday: 'сб', isWeekend: true });
  });

  it('can build legacy presets for region pages', () => {
    const now = new Date(2026, 7, 9);
    const chips = buildCatalogDateRailChips(now, 7, { includePresets: true });
    expect(chips[0]).toMatchObject({ kind: 'preset', value: 'all' });
    expect(chips[1]).toMatchObject({ kind: 'preset', value: 'today' });
    const days = chips.filter((c) => c.kind === 'day');
    expect(days).toHaveLength(7);
    expect(days[0]?.kind === 'day' && days[0].iso).toBe(toLocalIsoDay(new Date(2026, 7, 11)));
  });

  it('can build a longer desktop day strip', () => {
    const now = new Date(2026, 7, 9);
    const days = buildCatalogDateRailChips(now, CATALOG_DATE_RAIL_DAYS_DESKTOP).filter((c) => c.kind === 'day');
    expect(days).toHaveLength(CATALOG_DATE_RAIL_DAYS_DESKTOP);
  });

  it('marks days inside from–to range active', () => {
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
    expect(isDateRailChipActive(chip, { from: '2026-08-26', to: '2026-09-03' })).toBe(true);
    expect(isDateRailChipActive(chip, { from: '2026-08-12', to: '2026-08-12' })).toBe(false);
    expect(isDateRailChipActive(chip, { date: 'today' })).toBe(false);
  });

  it('nextCatalogDateRailSelection: single → range → collapse → clear', () => {
    expect(nextCatalogDateRailSelection({}, '2026-08-26')).toEqual({
      from: '2026-08-26',
      to: '2026-08-26',
    });
    expect(
      nextCatalogDateRailSelection({ from: '2026-08-26', to: '2026-08-26' }, '2026-09-03'),
    ).toEqual({ from: '2026-08-26', to: '2026-09-03' });
    expect(
      nextCatalogDateRailSelection({ from: '2026-08-26', to: '2026-09-03' }, '2026-08-29'),
    ).toEqual({ from: '2026-08-29', to: '2026-08-29' });
    expect(
      nextCatalogDateRailSelection({ from: '2026-08-29', to: '2026-08-29' }, '2026-08-29'),
    ).toEqual({});
  });

  it('formats range labels in Russian', () => {
    expect(formatCatalogDateRangeLabel('2026-08-26', '2026-08-26')).toBe('26 августа');
    expect(formatCatalogDateRangeLabel('2026-08-26', '2026-09-03')).toBe('26 августа — 3 сентября');
  });
});

describe('catalog-category-rail', () => {
  it('pins excursions/museums and caps primary', () => {
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
    expect(primary[0]?.name).toBe('Экскурсии');
    expect(primary[1]?.name).toBe('Музеи и арт');
    expect(primary[2]?.name).toBe('Стендап');
    expect(primary).toHaveLength(7);
    expect(overflow.length).toBeGreaterThan(0);
  });

  it('builds search hints from facets without inventing', () => {
    const hints = catalogSearchHintsFromFacets([
      { name: 'Экскурсии', events: 12 },
      { name: 'Лекции', events: 2 },
    ]);
    expect(hints.some((h) => h.q === 'выставки')).toBe(true);
    expect(hints.some((h) => h.label === 'Концерты на выходных')).toBe(true);
    expect(hints.some((h) => h.category === 'Лекции')).toBe(true);
    expect(hints.filter((h) => h.label === 'Экскурсии')).toHaveLength(1);
    expect(hints.some((h) => h.q === 'стендап')).toBe(false);
  });
});
