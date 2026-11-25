import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicCatalogQuery } from '@daibilet/contracts/schemas';
import type { FinanceAdmissionProduct } from '@/lib/finance-projection';
import {
  matchesAdmissionCatalogFilters,
  planUnifiedEventWindow,
  sortUnifiedCatalogItems,
  toPublicAdmissionCatalogItem,
} from '@/lib/unified-catalog';

const taxonomy = {
  category: { slug: 'museums-and-art', title: 'Музеи и арт' },
  subcategory: { slug: 'museums', title: 'Музеи' },
};

function product(overrides: Partial<FinanceAdmissionProduct> = {}): FinanceAdmissionProduct {
  return {
    id: 'admission-1',
    slug: 'faberge-museum',
    title: 'Билет в музей Фаберже',
    type: 'MUSEUM_ENTRY',
    validityMode: 'OPEN_DATE',
    canSell: true,
    priceFromRub: 850,
    offers: [{ id: 'offer-1', title: 'Взрослый', priceRub: 850 }],
    city: { slug: 'saint-petersburg', title: 'Санкт-Петербург', citySlug: 'saint-petersburg', cityTitle: 'Санкт-Петербург' },
    venue: { slug: 'faberge', title: 'Музей Фаберже', citySlug: 'saint-petersburg', cityTitle: 'Санкт-Петербург' },
    ...overrides,
  };
}

test('admission filters keep open date tickets for a selected future date', () => {
  assert.equal(matchesAdmissionCatalogFilters(product(), taxonomy, {
    from: '2026-12-15', to: '2026-12-15', city: 'saint-petersburg', category: 'museums', maxPrice: 1000,
  } as PublicCatalogQuery, new Date('2026-11-25T09:00:00+03:00')), true);
});

test('admission city filters resolve public moskva URLs to canonical moscow records', () => {
  const moscowProduct = product({
    city: { slug: 'moscow', title: 'Москва', citySlug: 'moscow', cityTitle: 'Москва' },
    venue: { slug: 'virtual-museum', title: 'Виртуальный музей', citySlug: 'moscow', cityTitle: 'Москва' },
  });

  assert.equal(matchesAdmissionCatalogFilters(moscowProduct, taxonomy, { city: 'moskva' } as PublicCatalogQuery), true);
  assert.equal(matchesAdmissionCatalogFilters(moscowProduct, taxonomy, { destination: 'moskva' } as PublicCatalogQuery), true);
});

test('admission date filters exclude tickets whose fixed validity ended before the requested range', () => {
  assert.equal(matchesAdmissionCatalogFilters(product({
    validityMode: 'FIXED_WINDOW', validFrom: '2026-11-01T00:00:00.000Z', validTo: '2026-12-10T20:59:59.999Z',
  }), taxonomy, { from: '2026-12-15', to: '2026-12-15' } as PublicCatalogQuery, new Date('2026-11-25T09:00:00+03:00')), false);
});

test('admission cards say open date and do not invent a session timestamp', () => {
  const card = toPublicAdmissionCatalogItem(product(), taxonomy);
  assert.equal(card.dateLabel, 'Открытая дата');
  assert.equal('startsAt' in card, false);
});

test('unified time sort places fixed date products before open date products', () => {
  const open = toPublicAdmissionCatalogItem(product(), taxonomy);
  const fixed = toPublicAdmissionCatalogItem(product({
    id: 'admission-2', slug: 'fixed-ticket', validityMode: 'FIXED_WINDOW', validFrom: '2026-12-01T00:00:00.000Z',
  }), taxonomy);
  const result = sortUnifiedCatalogItems([open, fixed], 'time');
  assert.deepEqual(result.map((item) => item.id), ['admission-2', 'admission-1']);
});

test('non-saleable admission products are excluded by catalog filters', () => {
  assert.equal(matchesAdmissionCatalogFilters(product({ canSell: false }), taxonomy, {} as PublicCatalogQuery), false);
  assert.equal(matchesAdmissionCatalogFilters(product({ offers: [] }), taxonomy, {} as PublicCatalogQuery), false);
});

test('bounded event windows produce exact mixed pages without gaps or duplicates', () => {
  const events = Array.from({ length: 223 }, (_, index) => ({ kind: 'event' as const, order: index * 3 }));
  const admissions = Array.from({ length: 37 }, (_, index) => ({ kind: 'admission' as const, order: index * 17 + 5 }));
  const all = [...events, ...admissions].sort((left, right) => left.order - right.order || (left.kind === 'event' ? -1 : 1));

  for (const offset of [0, 50, 100, 150, 200, 250]) {
    const limit = 50;
    const plan = planUnifiedEventWindow({ offset, limit, admissionCount: admissions.length, eventTotal: events.length });
    const candidates = [...events.slice(plan.eventStart, plan.eventStart + plan.eventCount), ...admissions]
      .sort((left, right) => left.order - right.order || (left.kind === 'event' ? -1 : 1));
    assert.deepEqual(candidates.slice(plan.pageOffset, plan.pageOffset + limit), all.slice(offset, offset + limit));
  }
});
