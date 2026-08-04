import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicEventPageDto } from '@daibilet/contracts/public';

import {
  formatBuyCardPrice,
  formatBuyCardPriceHint,
  formatHeroBuyButtonPrice,
  getTicketOldPrice,
  getTicketPriceRange,
  isOpenDateEvent,
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

test('buy card emphasizes от min price, range is secondary hint', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [
      { key: 'adult', title: 'Взрослый', priceRub: 1_300 },
      { key: 'vip', title: 'VIP', priceRub: 2_300 },
    ],
  }));

  assert.deepEqual(range, { min: 1_300, max: 2_300 });
  assert.equal(formatBuyCardPrice(range!), `от 1${nbsp}300 ₽`);
  assert.equal(formatBuyCardPriceHint(range!), `до 2${nbsp}300 ₽ в зависимости от категории`);
});

test('single exact ticket price uses от label without hint', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [{ key: 'adult', title: 'Взрослый', priceRub: 1_000 }],
  }));

  assert.deepEqual(range, { min: 1_000, max: 1_000 });
  assert.equal(formatBuyCardPrice(range!), `от 1${nbsp}000 ₽`);
  assert.equal(formatBuyCardPriceHint(range!), null);
});

test('oldPrice above min is returned for strikethrough', () => {
  const payload = eventPayload({
    ticketPrices: [
      { key: 'adult', title: 'Взрослый', priceRub: 1_000, oldPriceRub: 1_500 },
      { key: 'vip', title: 'VIP', priceRub: 2_000, oldPriceRub: 2_800 },
    ],
  });
  const range = getTicketPriceRange(payload);
  assert.equal(getTicketOldPrice(payload, range), 2_800);
});

test('open_date eventType is detected for stepper', () => {
  assert.equal(
    isOpenDateEvent(
      eventPayload({
        event: { eventType: 'open_date', priceFrom: 500 } as PublicEventPageDto['event'],
        sessions: [
          {
            id: 's1',
            eventId: 'e1',
            startsAt: null,
            dateLabel: 'Открытая дата',
            timeLabel: 'В виджете',
            timeBucket: 'day',
            sourceStatus: 'open_date',
          },
        ] as PublicEventPageDto['sessions'],
      }),
    ),
    true,
  );
});
