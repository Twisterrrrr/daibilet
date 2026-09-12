import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicEventPageDto } from '@daibilet/contracts/public';

import {
  buildGroupedTicketCategories,
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

test('buy card shows min-max fork when categories differ', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [
      { key: 'adult', title: 'Взрослый', priceRub: 1_300 },
      { key: 'vip', title: 'VIP', priceRub: 2_300 },
    ],
  }));

  assert.deepEqual(range, { min: 1_300, max: 2_300 });
  assert.equal(formatBuyCardPrice(range!), `1${nbsp}300 - 2${nbsp}300 ₽`);
  assert.equal(formatBuyCardPriceHint(range!), 'Вилка по категориям билетов');
});

test('single exact ticket price has no fork or hint', () => {
  const range = getTicketPriceRange(eventPayload({
    ticketPrices: [{ key: 'adult', title: 'Взрослый', priceRub: 1_000 }],
  }));

  assert.deepEqual(range, { min: 1_000, max: 1_000 });
  assert.equal(formatBuyCardPrice(range!), `1${nbsp}000 ₽`);
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

test('open_date eventType is detected', () => {
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

test('TEP adult package variants stay as separate category rows', () => {
  const rows = buildGroupedTicketCategories(
    eventPayload({
      ticketPrices: [
        {
          key: 'a',
          title: 'Взрослый, в одну сторону до Парка «Зарядье»',
          description: 'в одну сторону до Парка «Зарядье»',
          priceRub: 199,
          sortOrder: 0,
        },
        {
          key: 'b',
          title: 'Взрослый, В одну сторону до Парка «Зарядье», с горячим ЛАНЧЕМ, Питание включено',
          description: 'В одну сторону до Парка «Зарядье», с горячим ЛАНЧЕМ, Питание включено',
          priceRub: 467,
          sortOrder: 2,
        },
        {
          key: 'c',
          title: 'Взрослый, для 4-х гостей с горячим ланчем, Для четверых',
          description: 'для 4-х гостей с горячим ланчем, Для четверых',
          priceRub: 1800,
          sortOrder: 3,
        },
      ],
    }),
  );

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => ({ name: row.name, minPrice: row.minPrice, maxPrice: row.maxPrice })),
    [
      { name: 'Взрослый', minPrice: 199, maxPrice: 199 },
      { name: 'Взрослый', minPrice: 467, maxPrice: 467 },
      { name: 'Взрослый', minPrice: 1800, maxPrice: 1800 },
    ],
  );
  assert.match(rows[0]!.description || '', /зарядье/i);
  assert.match(rows[1]!.description || '', /ланч/i);
  assert.match(rows[2]!.description || '', /4-х|четверых/i);
});

test('weekday-only ticket title suffixes still merge into one category', () => {
  const rows = buildGroupedTicketCategories(
    eventPayload({
      ticketPrices: [
        { key: 'wd', title: 'Взрослый, ПН—ЧТ', priceRub: 1_000, sortOrder: 0 },
        { key: 'we', title: 'Взрослый, ПТ—ВС', priceRub: 1_500, sortOrder: 1 },
      ],
    }),
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.name, 'Взрослый');
  assert.equal(rows[0]!.minPrice, 1_000);
  assert.equal(rows[0]!.maxPrice, 1_500);
});
