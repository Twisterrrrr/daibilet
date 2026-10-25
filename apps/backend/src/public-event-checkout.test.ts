import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { createYooKassaCheckoutRouteHandler } from './checkout-yookassa-handler.js';
import type { RouteContext } from './routing.js';

function context(pathname: string) {
  let status = 0;
  let body = '';
  let headers: Record<string, string> = {};
  const response = {
    writeHead(code: number, values: Record<string, string>) { status = code; headers = values; },
    end(value: string) { body = value; },
  };
  return {
    route: {
      request: Readable.from([]), response, pathname, method: 'GET',
      url: new URL(pathname, 'https://finance-api.daibilet.ru'),
      route: `GET ${pathname}`, searchParams: new URLSearchParams(),
    } as unknown as RouteContext,
    result: () => ({ status, body: JSON.parse(body), headers }),
  };
}

test('public event checkout returns only the readiness projection with no-store', async () => {
  const request = context('/api/public/checkout/events/museum-entry');
  const handler = createYooKassaCheckoutRouteHandler({
    buildEventCheckout: async (slug) => ({
      eventId: 'event-1', slug, title: 'Музей', kind: 'OPEN_DATE', canSell: true,
      offers: [{ id: 'offer-1', title: 'Взрослый', priceRub: 350, canSell: true }],
    }) as never,
  });
  assert.equal(await handler(request.route), true);
  assert.equal(request.result().status, 200);
  assert.equal(request.result().headers['cache-control'], 'no-store');
  assert.deepEqual(request.result().body.offers.map((offer: { id: string }) => offer.id), ['offer-1']);
});

test('public event checkout hides unknown or unpublished event', async () => {
  const request = context('/api/public/checkout/events/draft');
  const handler = createYooKassaCheckoutRouteHandler({ buildEventCheckout: async () => null });
  assert.equal(await handler(request.route), true);
  assert.equal(request.result().status, 404);
  assert.equal(request.result().body.error, 'event_not_found');
});
