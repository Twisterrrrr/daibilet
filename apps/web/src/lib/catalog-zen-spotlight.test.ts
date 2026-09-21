import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

import { pickCatalogZenSpotlightItems } from './catalog-zen-spotlight';

function item(partial: Partial<PublicCatalogListItemDto> & Pick<PublicCatalogListItemDto, 'id' | 'title'>): PublicCatalogListItemDto {
  return {
    startsAt: '2026-09-21T12:00:00.000Z',
    imageUrl: `https://cdn.example/${partial.id}.jpg`,
    venue: 'Venue',
    venueSlug: 'venue',
    city: 'Москва',
    citySlug: 'moscow',
    priceFrom: 1000,
    ...partial,
  } as PublicCatalogListItemDto;
}

test('pickCatalogZenSpotlightItems: one card per venue (avoids same-price flood)', () => {
  const items = [
    item({ id: 'a1', title: 'Квест А', venueSlug: 'tretyakov', priceFrom: 1350 }),
    item({ id: 'a2', title: 'Квест Б', venueSlug: 'tretyakov', priceFrom: 1350 }),
    item({ id: 'a3', title: 'Квест В', venueSlug: 'tretyakov', priceFrom: 1350 }),
    item({ id: 'b1', title: 'Речная прогулка', venueSlug: 'pier-1', priceFrom: 900 }),
    item({ id: 'c1', title: 'Стендап', venueSlug: 'club-1', priceFrom: 1500 }),
    item({ id: 'd1', title: 'Экскурсия', venueSlug: 'museum-1', priceFrom: 800 }),
  ];

  const picked = pickCatalogZenSpotlightItems(items);
  assert.equal(picked.length, 4);
  assert.deepEqual(
    picked.map((row) => row.venueSlug),
    ['tretyakov', 'pier-1', 'club-1', 'museum-1'],
  );
  assert.deepEqual(
    picked.map((row) => row.priceFrom),
    [1350, 900, 1500, 800],
  );
});

test('pickCatalogZenSpotlightItems: prefers unique priceFrom across different venues', () => {
  const items = [
    item({ id: 'a1', title: 'Квест А', venueSlug: 'estate-a', priceFrom: 1350 }),
    item({ id: 'a2', title: 'Квест Б', venueSlug: 'estate-b', priceFrom: 1350 }),
    item({ id: 'a3', title: 'Квест В', venueSlug: 'estate-c', priceFrom: 1350 }),
    item({ id: 'b1', title: 'Речная прогулка', venueSlug: 'pier-1', priceFrom: 900 }),
    item({ id: 'c1', title: 'Стендап', venueSlug: 'club-1', priceFrom: 1500 }),
    item({ id: 'd1', title: 'Экскурсия', venueSlug: 'museum-1', priceFrom: 800 }),
  ];

  const picked = pickCatalogZenSpotlightItems(items);
  assert.equal(picked.length, 4);
  assert.deepEqual(
    picked.map((row) => row.priceFrom),
    [1350, 900, 1500, 800],
  );
  assert.equal(picked.filter((row) => row.priceFrom === 1350).length, 1);
});
