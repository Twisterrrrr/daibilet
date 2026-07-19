import assert from 'node:assert/strict';
import test from 'node:test';

import { enrichBuyerOrdersWithEventLinks } from './buyer-order-event-links.js';

test('enrichBuyerOrdersWithEventLinks swaps past slug to meta-sibling with future session', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (String(sql).includes('with seed as')) {
        return {
          rows: [
            {
              seed_id: 'evt_past',
              eventId: 'evt_future',
              slug: 'tc-abc-future-slot',
              startsAt: new Date(Date.now() + 86400000).toISOString(),
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  const [order] = await enrichBuyerOrdersWithEventLinks(db, [
    {
      id: 'ord1',
      eventId: 'evt_past',
      eventUrl: '/events/tc-abc-past-slot',
      ticketCount: 1,
      tickets: [
        {
          id: 't1',
          eventId: 'evt_past',
          eventUrl: '/events/tc-abc-past-slot',
        },
      ],
    },
  ]);

  assert.equal(order.eventUrl, '/events/tc-abc-future-slot');
  assert.equal(order.tickets[0].eventUrl, '/events/tc-abc-future-slot');
  assert.equal(order.eventId, 'evt_past');
  assert.equal(order.tickets[0].eventId, 'evt_past');
});

test('enrichBuyerOrdersWithEventLinks keeps own slug when no siblings', async () => {
  const db = {
    async query(sql) {
      if (String(sql).includes('with seed as')) {
        return { rows: [] };
      }
      return {
        rows: [{ id: 'evt_only', slug: 'tc-only-event' }],
      };
    },
  };

  const [order] = await enrichBuyerOrdersWithEventLinks(db, [
    {
      id: 'ord2',
      eventId: 'evt_only',
      eventUrl: '/events/tc-only-event',
      ticketCount: 1,
      tickets: [{ id: 't2', eventId: 'evt_only', eventUrl: '/events/tc-only-event' }],
    },
  ]);

  assert.equal(order.eventUrl, '/events/tc-only-event');
  assert.equal(order.eventId, 'evt_only');
});
