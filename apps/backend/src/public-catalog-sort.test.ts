import assert from 'node:assert/strict';
import test from 'node:test';

import { orderHydratedCatalogPage } from './public-catalog.dto.ts';
import type { PublicSessionDto } from '@daibilet/contracts/public';

function session(partial: Partial<PublicSessionDto> & { id: string; title: string }): PublicSessionDto {
  return {
    slug: partial.id,
    city: 'Москва',
    ...partial,
  } as PublicSessionDto;
}

test('orderHydratedCatalogPage sorts time by startsAt after slot hydrate', () => {
  const later = session({
    id: 'later',
    title: 'Позже',
    startsAt: '2026-09-10T18:00:00.000Z',
    priceFrom: 1000,
  });
  const sooner = session({
    id: 'sooner',
    title: 'Раньше',
    startsAt: '2026-09-04T18:00:00.000Z',
    priceFrom: 3000,
  });
  const ordered = orderHydratedCatalogPage([later, sooner], 'time');
  assert.deepEqual(ordered.map((item) => item.id), ['sooner', 'later']);
});

test('orderHydratedCatalogPage sorts price_asc by priceFrom', () => {
  const expensive = session({
    id: 'exp',
    title: 'Дорого',
    startsAt: '2026-09-04T18:00:00.000Z',
    priceFrom: 5000,
  });
  const cheap = session({
    id: 'cheap',
    title: 'Дешево',
    startsAt: '2026-09-10T18:00:00.000Z',
    priceFrom: 500,
  });
  const ordered = orderHydratedCatalogPage([expensive, cheap], 'price_asc');
  assert.deepEqual(ordered.map((item) => item.id), ['cheap', 'exp']);
});

test('orderHydratedCatalogPage keeps popular score ahead of later cheaper events', () => {
  const popular = session({
    id: 'pop',
    title: 'Хит',
    startsAt: '2026-09-12T18:00:00.000Z',
    priceFrom: 4000,
    sessionCount: 12,
    landingSlugs: ['afisha'],
  });
  const rare = session({
    id: 'rare',
    title: 'Разовое',
    startsAt: '2026-09-04T18:00:00.000Z',
    priceFrom: 400,
    sessionCount: 1,
  });
  const ordered = orderHydratedCatalogPage([rare, popular], 'popular');
  assert.equal(ordered[0]?.id, 'pop');
});
