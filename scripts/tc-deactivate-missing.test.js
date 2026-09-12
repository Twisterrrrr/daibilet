const assert = require('node:assert/strict');
const test = require('node:test');

const { deactivateMissingTicketscloudEvents } = require('./lib/tc-deactivate-missing');

test('deactivates events, sessions, and offers for every missing source link', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('select esl."eventId"')) {
        return { rows: [{ eventId: 'evt-1' }, { eventId: 'evt-1' }, { eventId: 'evt-2' }] };
      }
      if (sql.includes('update "Event"')) return { rowCount: 1 };
      if (sql.includes('update "EventSession"')) return { rowCount: 2 };
      if (sql.includes('update "EventOffer"')) return { rowCount: 3 };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await deactivateMissingTicketscloudEvents(client, ['live-1']);

  assert.deepEqual(result, {
    missingLinks: 3,
    eventsMarked: 1,
    sessionsMarked: 2,
    offersMarked: 3,
  });
  assert.deepEqual(calls[1].params[0], ['evt-1', 'evt-2']);
  assert.match(calls[3].sql, /"sourceCode" = 'TICKETSCLOUD'/);
});

test('does not issue updates when no source links are missing', async () => {
  let queryCount = 0;
  const client = {
    async query() {
      queryCount += 1;
      return { rows: [] };
    },
  };

  const result = await deactivateMissingTicketscloudEvents(client, ['live-1']);

  assert.equal(queryCount, 1);
  assert.deepEqual(result, {
    missingLinks: 0,
    eventsMarked: 0,
    sessionsMarked: 0,
    offersMarked: 0,
  });
});
