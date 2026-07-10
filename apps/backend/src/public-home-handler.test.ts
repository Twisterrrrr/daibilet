import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicHomeRouteHandler } from './public-home-handler.js';
import type { RouteContext } from './routing.js';

test('invalidates all public caches before serving typed stats refresh', async () => {
  const calls: string[] = [];
  const handler = createPublicHomeRouteHandler({
    enabled: true,
    invalidateCaches: (reason) => calls.push(`invalidate:${reason}`),
    buildStats: async (forceRefresh) => {
      calls.push(`stats:${String(forceRefresh)}`);
      return {
        generatedAt: '2026-07-09T00:00:00.000Z',
        stats: { events: 1, destinations: 1, cities: 1, venues: 1, landings: 1 },
      };
    },
    buildHome: async () => {
      throw new Error('not expected');
    },
    buildHomePreview: async () => {
      throw new Error('not expected');
    },
  });

  const handled = await handler(routeContext('/api/public/stats?refresh=1'));

  assert.equal(handled, true);
  assert.deepEqual(calls, ['invalidate:public stats refresh', 'stats:true']);
});

test('serves typed stats without invalidation when refresh is absent', async () => {
  const calls: string[] = [];
  const handler = createPublicHomeRouteHandler({
    enabled: true,
    invalidateCaches: (reason) => calls.push(`invalidate:${reason}`),
    buildStats: async (forceRefresh) => {
      calls.push(`stats:${String(forceRefresh)}`);
      return {
        generatedAt: '2026-07-09T00:00:00.000Z',
        stats: { events: 1, destinations: 1, cities: 1, venues: 1, landings: 1 },
      };
    },
    buildHome: async () => {
      throw new Error('not expected');
    },
    buildHomePreview: async () => {
      throw new Error('not expected');
    },
  });

  const handled = await handler(routeContext('/api/public/stats'));

  assert.equal(handled, true);
  assert.deepEqual(calls, ['stats:false']);
});

function routeContext(urlPath: string): RouteContext {
  const url = new URL(urlPath, 'http://127.0.0.1');
  return {
    request: {} as RouteContext['request'],
    response: fakeResponse() as unknown as RouteContext['response'],
    url,
    pathname: url.pathname,
    method: 'GET',
    route: `GET ${url.pathname}`,
    searchParams: url.searchParams,
  };
}

function fakeResponse() {
  return {
    writableEnded: false,
    writeHead() {
      return this;
    },
    end() {
      this.writableEnded = true;
      return this;
    },
  };
}
