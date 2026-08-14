import { describe, expect, it } from 'vitest';

import { catalogSearchHintsFromFacets, splitCatalogCategories } from './catalog-category-rail';
import { buildCatalogDateRailChips, isDateRailChipActive, toLocalIsoDay } from './catalog-date-rail';

describe('catalog-date-rail', () => {
  it('builds presets plus upcoming calendar days', () => {
    const now = new Date(2026, 7, 9); // Sun Aug 9 local
    const chips = buildCatalogDateRailChips(now, 7);
    expect(chips[0]).toMatchObject({ kind: 'preset', value: 'all' });
    expect(chips[1]).toMatchObject({ kind: 'preset', value: 'today' });
    expect(chips[2]).toMatchObject({ kind: 'preset', value: 'tomorrow' });
    expect(chips[3]).toMatchObject({ kind: 'preset', value: 'weekend' });
    const days = chips.filter((c) => c.kind === 'day');
    expect(days).toHaveLength(7);
    expect(days[0]?.kind === 'day' && days[0].iso).toBe(toLocalIsoDay(new Date(2026, 7, 11)));
  });

  it('marks exact day active', () => {
    const chip = { kind: 'day' as const, iso: '2026-08-12', label: 'ср 12', shortLabel: 'ср 12', weekday: 'ср' };
    expect(isDateRailChipActive(chip, { from: '2026-08-12', to: '2026-08-12' })).toBe(true);
    expect(isDateRailChipActive(chip, { date: 'today' })).toBe(false);
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
