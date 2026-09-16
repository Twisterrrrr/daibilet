const assert = require('node:assert/strict');
const test = require('node:test');

const { upsertTicketscloudOffers } = require('./tc-import-catalog');

function fakeClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      return { rowCount: 1, rows: [] };
    },
  };
}

test('disables previous event offers before activating current ticket sets', async () => {
  const client = fakeClient();
  const rowStats = { offers: 0, hasWidgetUrl: false };

  await upsertTicketscloudOffers(client, {
    eventId: 'event-1',
    externalId: 'tc-1',
    event: {
      ticketSets: [
        { id: 'adult', name: 'Взрослый', prices: [1500, 1200] },
        { id: 'child', name: 'Детский', prices: [800] },
      ],
    },
    priceFromRub: 800,
    widgetUrl: 'https://ticketscloud.test/widget',
    rowStats,
  });

  assert.equal(client.calls.length, 3);
  assert.match(client.calls[0].sql, /update "EventOffer"/);
  assert.match(client.calls[0].sql, /"sourceCode" = 'TICKETSCLOUD'/);
  assert.deepEqual(client.calls[0].params, ['event-1']);
  assert.equal(rowStats.offers, 2);
  assert.equal(rowStats.hasWidgetUrl, true);
});

test('leaves no active offer when current event has no saleable price', async () => {
  const client = fakeClient();
  const rowStats = { offers: 0, hasWidgetUrl: false };

  await upsertTicketscloudOffers(client, {
    eventId: 'event-2',
    externalId: 'tc-2',
    event: { ticketSets: [] },
    priceFromRub: null,
    widgetUrl: 'https://ticketscloud.test/widget',
    rowStats,
  });

  assert.equal(client.calls.length, 1);
  assert.match(client.calls[0].sql, /update "EventOffer"/);
  assert.equal(rowStats.offers, 0);
  assert.equal(rowStats.hasWidgetUrl, false);
});
