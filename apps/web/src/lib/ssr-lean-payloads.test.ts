import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';
import {
  filterFingerprintsForSessions,
  leanCatalogForSsr,
  toCatalogSsrItem,
  toHomeSsrSession,
  toSlimCityDestination,
} from './ssr-lean-payloads';

function sampleSession(overrides: Partial<PublicCatalogListItemDto> = {}): PublicCatalogListItemDto {
  return {
    id: 'e1',
    title: 'Экскурсия по центру',
    city: 'Москва',
    destination: 'Москва',
    destinationType: 'city',
    venue: 'Красная площадь',
    venueKind: 'attraction',
    category: 'Экскурсии',
    tags: ['a', 'b', 'c', 'd', 'e'],
    startsAt: '2026-09-10T12:00:00+03:00',
    dateLabel: '10 сен',
    timeLabel: '12:00',
    timeBucket: 'day',
    description: 'Очень длинное описание карточки которое не нужно в SSR HTML payload для сетки.',
    deeplinkUrl: 'https://example.com/deep',
    purchaseUrl: 'https://example.com/buy',
    widgetUrl: 'https://example.com/widget',
    imageUrl: 'https://cdn.example/cover.jpg',
    upcomingSlots: [
      { startsAt: '2026-09-10T12:00:00+03:00', dateLabel: '10 сен', timeLabel: '12:00' },
      { startsAt: '2026-09-11T12:00:00+03:00', dateLabel: '11 сен', timeLabel: '12:00' },
      { startsAt: '2026-09-12T12:00:00+03:00', dateLabel: '12 сен', timeLabel: '12:00' },
      { startsAt: '2026-09-13T12:00:00+03:00', dateLabel: '13 сен', timeLabel: '12:00' },
      { startsAt: '2026-09-14T12:00:00+03:00', dateLabel: '14 сен', timeLabel: '12:00' },
    ],
    ...overrides,
  };
}

describe('ssr-lean-payloads', () => {
  it('toHomeSsrSession drops description and caps slots', () => {
    const lean = toHomeSsrSession(sampleSession());
    assert.equal(lean.description, undefined);
    assert.equal(lean.deeplinkUrl, undefined);
    assert.equal(lean.purchaseUrl, 'https://example.com/buy');
    assert.equal(lean.upcomingSlots?.length, 3);
    assert.equal(lean.tags.length, 4);
  });

  it('toCatalogSsrItem strips blurb but keeps purchase CTA', () => {
    const lean = toCatalogSsrItem(sampleSession());
    assert.equal(lean.description, undefined);
    assert.equal(lean.purchaseUrl, 'https://example.com/buy');
    assert.ok((lean.upcomingSlots?.length || 0) <= 4);
  });

  it('leanCatalogForSsr maps items', () => {
    const catalog = leanCatalogForSsr({
      generatedAt: new Date().toISOString(),
      items: [sampleSession()],
      total: 1,
      limit: 50,
      offset: 0,
      hasMore: false,
      facets: {
        cities: Array.from({ length: 100 }, (_, i) => ({ name: `City ${i}`, events: i })),
        categories: [],
        subcategories: [],
        landings: [],
        priceSteps: [],
      },
    });
    assert.equal(catalog.items[0]?.description, undefined);
    assert.equal(catalog.facets.cities.length, 80);
  });

  it('toSlimCityDestination clears category trees', () => {
    const slim = toSlimCityDestination({
      name: 'Казань',
      type: 'city',
      events: 12,
      venues: 3,
      slug: 'kazan',
      categories: [{ name: 'Музеи', count: 4 }],
    });
    assert.deepEqual(slim.categories, []);
    assert.equal(slim.slug, 'kazan');
  });

  it('filterFingerprintsForSessions keeps only used urls', () => {
    const filtered = filterFingerprintsForSessions(
      { 'https://cdn.example/a.jpg': 'etag:1', 'https://cdn.example/b.jpg': 'etag:2' },
      [{ imageUrl: 'https://cdn.example/a.jpg' }],
    );
    assert.deepEqual(filtered, { 'https://cdn.example/a.jpg': 'etag:1' });
  });
});
