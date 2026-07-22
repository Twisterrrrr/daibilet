import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicEventPageDto } from '@daibilet/contracts/public';

import {
  formatBuyCardPrice,
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

test('hero CTA shows only the lowest ticket price', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [
      { key: 'adult', title: 'Взрослый', priceRub: 1_000 },
      { key: 'vip', title: 'VIP', priceRub: 3_000 },
    ],
  }));

  assert.deepEqual(range, { min: 1_000, max: 3_000 });
  assert.equal(formatHeroBuyButtonPrice(range!), 'от 1 000 ₽');
  assert.equal(formatBuyCardPrice(range!), '1 000 - 3 000 ₽');
});

test('single exact ticket price has no range in buy card', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [{ key: 'adult', title: 'Взрослый', priceRub: 1_000 }],
  }));

  assert.deepEqual(range, { min: 1_000, max: 1_000 });
  assert.equal(formatBuyCardPrice(range!), '1 000 ₽');
});
