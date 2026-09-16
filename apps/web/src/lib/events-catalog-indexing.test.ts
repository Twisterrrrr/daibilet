import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EVENTS_CATALOG_NOINDEX,
  evaluateEventsCatalogIndexing,
  isEventsCatalogSitemapEligibleUrl,
  normalizeEventsCatalogQuery,
  publicEventsCatalogSeoHeaders,
  type EventsCatalogPromotion,
} from './events-catalog-indexing.ts';
import { assertSitemapNoindexInvariant } from './sitemap-data.ts';

test('clean events hub is indexable and sitemap eligible', () => {
  const decision = evaluateEventsCatalogIndexing('/events');
  assert.equal(decision.urlClass, 'hub');
  assert.equal(decision.canonicalPath, '/events');
  assert.equal(decision.robots, null);
  assert.equal(decision.sitemapEligible, true);
});

test('tracking, presentation, and catalog defaults collapse to the clean hub', () => {
  const decision = evaluateEventsCatalogIndexing(
    '/events?utm_source=vk&view=list&page=1&limit=50&sort=time&date=all',
  );
  assert.equal(decision.urlClass, 'duplicate');
  assert.equal(decision.normalizedQuery, '');
  assert.equal(decision.canonicalPath, '/events');
  assert.equal(decision.robots, null);
  assert.equal(decision.sitemapEligible, false);
});

test('facet query is normalized, self-canonical, and noindex', () => {
  const decision = evaluateEventsCatalogIndexing(
    '/events?priceMax=3000&city=sankt-peterburg&dateFrom=2026-09-20',
  );
  assert.equal(decision.urlClass, 'facet');
  assert.equal(
    decision.normalizedQuery,
    'city=sankt-peterburg&from=2026-09-20&maxPrice=3000',
  );
  assert.equal(decision.canonicalPath, `/events?${decision.normalizedQuery}`);
  assert.equal(decision.robots, EVENTS_CATALOG_NOINDEX);
});

test('pure pagination is self-canonical but remains noindex while SSR is page one', () => {
  const decision = evaluateEventsCatalogIndexing('/events?page=2');
  assert.equal(decision.urlClass, 'pagination');
  assert.equal(decision.canonicalPath, '/events?page=2');
  assert.equal(decision.robots, EVENTS_CATALOG_NOINDEX);
});

test('filter plus pagination inherits the facet policy', () => {
  const decision = evaluateEventsCatalogIndexing('/events?page=3&category=Экскурсии');
  assert.equal(decision.urlClass, 'facet');
  assert.equal(decision.robots, EVENTS_CATALOG_NOINDEX);
  assert.match(decision.canonicalPath, /category=/);
  assert.match(decision.canonicalPath, /page=3/);
});

test('unknown parameters fail closed', () => {
  const decision = evaluateEventsCatalogIndexing('/events?madeUp=1');
  assert.equal(decision.urlClass, 'unknown');
  assert.equal(decision.robots, EVENTS_CATALOG_NOINDEX);

  const emptyUnknown = evaluateEventsCatalogIndexing('/events?madeUp=');
  assert.equal(emptyUnknown.urlClass, 'unknown');
  assert.equal(emptyUnknown.robots, EVENTS_CATALOG_NOINDEX);
});

test('promoted filters redirect to a clean editorial route', () => {
  const promotions: readonly EventsCatalogPromotion[] = [
    {
      signature: 'city=moskva&landing=standup',
      destinationPath: '/standup/moskva',
      active: true,
    },
  ];
  const decision = evaluateEventsCatalogIndexing(
    '/events?landing=standup&city=moskva',
    promotions,
  );
  assert.equal(decision.urlClass, 'promoted');
  assert.equal(decision.redirectPath, '/standup/moskva');
  assert.equal(decision.robots, null);
});

test('public SEO headers are emitted only for final 200 responses', () => {
  const decision = evaluateEventsCatalogIndexing('/events?city=moskva');
  assert.deepEqual(publicEventsCatalogSeoHeaders(decision, 404), {});
  assert.deepEqual(publicEventsCatalogSeoHeaders(decision, 500), {});
  assert.deepEqual(publicEventsCatalogSeoHeaders(decision, 301), {});
  assert.deepEqual(publicEventsCatalogSeoHeaders(decision, 200), {
    Link: '<https://daibilet.ru/events?city=moskva>; rel="canonical"',
    'X-Robots-Tag': 'noindex, follow',
  });
});

test('sitemap eligibility excludes every events query URL', () => {
  assert.equal(isEventsCatalogSitemapEligibleUrl('https://daibilet.ru/events'), true);
  assert.equal(isEventsCatalogSitemapEligibleUrl('https://daibilet.ru/events?page=2'), false);
  assert.equal(isEventsCatalogSitemapEligibleUrl('https://daibilet.ru/events?utm_source=vk'), false);
  assert.equal(isEventsCatalogSitemapEligibleUrl('https://daibilet.ru/events/example-event'), true);
});

test('sitemap invariant rejects a noindex events facet', () => {
  assert.doesNotThrow(() =>
    assertSitemapNoindexInvariant([{ url: 'https://daibilet.ru/events' }]),
  );
  assert.throws(
    () =>
      assertSitemapNoindexInvariant([
        { url: 'https://daibilet.ru/events?city=moskva' },
      ]),
    /noindex events catalog URL/,
  );
});

test('excludeLanding values are stable and aliases do not duplicate canonical keys', () => {
  const normalized = normalizeEventsCatalogQuery(
    new URLSearchParams('excludeLanding=standup,river-cruises,standup&from=2026-09-20&dateFrom=2020-01-01'),
  );
  assert.equal(
    normalized.params.toString(),
    'excludeLanding=river-cruises%2Cstandup&from=2026-09-20',
  );
});
