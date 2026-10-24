import assert from 'node:assert/strict';
import test from 'node:test';

import { createPublicEventRouteHandler } from './public-event-handler.js';
import type { RouteContext } from './routing.js';

test('event detail handler leaves freshness endpoint to the collection router', async () => {
  let detailCalls = 0;
  const handler = createPublicEventRouteHandler({
    enabled: true,
    buildPublicEvent: async () => {
      detailCalls += 1;
      return null;
    },
  });
  const context = {
    method: 'GET',
    pathname: '/api/public/events/freshness',
    searchParams: new URLSearchParams(),
  } as RouteContext;

  assert.equal(await handler(context), false);
  assert.equal(detailCalls, 0);
});
