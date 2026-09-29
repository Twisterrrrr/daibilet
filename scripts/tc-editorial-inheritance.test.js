const assert = require('node:assert/strict');
const test = require('node:test');

const { inheritTicketscloudSeriesEditorial } = require('./lib/tc-editorial-inheritance');

test('skips editorial inheritance without a Ticketscloud meta event', async () => {
  let called = false;
  const inherited = await inheritTicketscloudSeriesEditorial(
    { async query() { called = true; return { rowCount: 1, rows: [] }; } },
    { eventId: 'evt-1', sourceId: 'tc', metaExternalId: null, overrideId: 'ovr-1' },
  );
  assert.equal(inherited, false);
  assert.equal(called, false);
});

test('inherits only from an exact sibling edition and never overwrites an override', async () => {
  const calls = [];
  const inherited = await inheritTicketscloudSeriesEditorial(
    {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rowCount: 1, rows: [{ id: 'ovr-1' }] };
      },
    },
    { eventId: 'evt-1', sourceId: 'src-tc', metaExternalId: 'meta-1', overrideId: 'ovr-1' },
  );

  assert.equal(inherited, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, ['ovr-1', 'evt-1', 'src-tc', 'meta-1']);
  assert.match(calls[0].sql, /sibling_event\.title = requested_event\.title/);
  assert.match(calls[0].sql, /sibling_event\.description/);
  assert.match(calls[0].sql, /on conflict \("eventId"\) do nothing/);
});
