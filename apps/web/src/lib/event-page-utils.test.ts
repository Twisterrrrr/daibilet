import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicEventPageDto } from '@daibilet/contracts/public';

import {
  formatBuyCardPrice,
  formatBuyCardPriceHint,
  formatHeroBuyButtonPrice,
  getTicketPriceRange,
} from './event-page-utils.ts';

function eventPayload(overrides: Partial<PublicEventPageDto> = {}): PublicEventPageDto {
  return {
    generatedAt: '2026-07-23T00:00:00.000Z',
    event: { priceFrom: null },
    stats: { sessions: 0, priceFrom: null },
    sessions: [],
    offers: [],
    related: [],
    landings: [],
    ...overrides,
  } as PublicEventPageDto;
}

/** ru-RU thousands separator from Number.toLocaleString */
const nbsp = '\u00a0';

test('hero CTA shows only the lowest ticket price', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [
      { key: 'adult', title: 'Взрослый', priceRub: 1_000 },
      { key: 'vip', title: 'VIP', priceRub: 3_000 },
    ],
  }));

  assert.deepEqual(range, { min: 1_000, max: 3_000 });
  assert.equal(formatHeroBuyButtonPrice(range!), `от 1${nbsp}000 ₽`);
});

test('buy card shows full price range when min and max differ', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [
      { key: 'adult', title: 'Взрослый', priceRub: 1_300 },
      { key: 'vip', title: 'VIP', priceRub: 2_300 },
    ],
  }));

  assert.deepEqual(range, { min: 1_300, max: 2_300 });
  assert.equal(formatBuyCardPrice(range!), `1${nbsp}300 - 2${nbsp}300 ₽`);
  assert.equal(formatBuyCardPriceHint(range!), null);
});

test('single exact ticket price has no range in buy card', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [{ key: 'adult', title: 'Взрослый', priceRub: 1_000 }],
  }));

  assert.deepEqual(range, { min: 1_000, max: 1_000 });
  assert.equal(formatBuyCardPrice(range!), `1${nbsp}000 ₽`);
  assert.equal(formatBuyCardPriceHint(range!), null);
});
