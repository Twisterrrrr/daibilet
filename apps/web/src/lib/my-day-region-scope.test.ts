import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicDestinationDto } from '@daibilet/contracts/public';

import {
  listCityToRegionChildren,
  myDayCityChipLabel,
  resolveMyDayRegionAlternatives,
} from './my-day-region-scope.ts';

function dest(
  partial: Partial<PublicDestinationDto> & Pick<PublicDestinationDto, 'name' | 'type'>,
): PublicDestinationDto {
  return {
    id: partial.id || partial.slug || partial.name,
    slug: partial.slug || partial.name,
    sourceSlug: partial.sourceSlug || null,
    name: partial.name,
    type: partial.type,
    events: partial.events ?? 0,
    venues: partial.venues ?? 0,
    categories: partial.categories || [],
  };
}

test('listCityToRegionChildren returns LO towns', () => {
  const names = listCityToRegionChildren('Ленинградская область');
  assert.ok(names.includes('Выборг'));
  assert.ok(names.some((n) => n.startsWith('Отрадное')));
});

test('resolveMyDayRegionAlternatives offers Spb hub + oblast cities', () => {
  const destinations = [
    dest({ name: 'Ленинградская область', type: 'region', slug: 'leningradskaya-oblast', events: 40 }),
    dest({ name: 'Санкт-Петербург', type: 'city', slug: 'saint-petersburg', events: 500 }),
    dest({ name: 'Выборг', type: 'city', slug: 'vyborg', events: 12 }),
    dest({
      name: 'Отрадное (Ленинградская область)',
      type: 'city',
      slug: 'otradnoe-lo',
      events: 1,
    }),
  ];
  const alt = resolveMyDayRegionAlternatives(destinations[0], destinations);
  assert.ok(alt);
  assert.equal(alt!.hub?.name, 'Санкт-Петербург');
  assert.ok(alt!.children.some((c) => c.name === 'Выборг'));
  assert.ok(alt!.children.some((c) => c.name.startsWith('Отрадное')));
  assert.ok(!alt!.children.some((c) => c.name === 'Санкт-Петербург'));
});

test('non-region returns null', () => {
  assert.equal(
    resolveMyDayRegionAlternatives(dest({ name: 'Выборг', type: 'city' }), []),
    null,
  );
});

test('chip label strips catalog disambiguator', () => {
  assert.equal(myDayCityChipLabel({ name: 'Отрадное (Ленинградская область)' }), 'Отрадное');
});
