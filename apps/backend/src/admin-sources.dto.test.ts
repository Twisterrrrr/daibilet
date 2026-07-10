import assert from 'node:assert/strict';
import test from 'node:test';
import { mapAdminSourceDto } from './admin-sources.dto.js';

const now = new Date('2026-07-02T12:00:00.000Z');

test('keeps catalog and orders sync health separate', () => {
  const source = mapAdminSourceDto({
    id: 'tc',
    code: 'TICKETSCLOUD',
    name: 'Ticketscloud',
    enabled: true,
    orderCount: 7,
    aggregate: aggregate({
      groupedEvents: 12,
      sourceEvents: 48,
      sessions: 90,
      offers: 12,
      priceFromRub: 290,
      sampleWidgetUrl: 'https://ticketscloud.test/widget',
    }),
    syncRuns: [
      run('orders-polling', 'SUCCESS', '2026-07-02T11:30:00.000Z'),
      run('full-catalog', 'FAILED', '2026-07-02T11:00:00.000Z', 'network timeout'),
      run('full-catalog', 'SUCCESS', '2026-07-02T10:00:00.000Z'),
    ],
  }, {
    ticketscloudPurchaseConfigured: true,
    teplohodApiConfigured: true,
    teplohodPurchaseConfigured: true,
  }, now);

  assert.equal(source.catalogSync?.mode, 'full-catalog');
  assert.equal(source.catalogSync?.status, 'failed');
  assert.equal(source.ordersSync?.mode, 'orders-polling');
  assert.equal(source.ordersSync?.status, 'success');
  assert.equal(source.health.lastSuccessAt, '2026-07-02T10:00:00.000Z');
  assert.equal(source.health.consecutiveErrors, 1);
  assert.equal(source.health.isStale, false);
  assert.equal(source.health.status, 'error');
  assert.equal(source.counts.orders, 7);
  assert.ok(source.health.openIssues.some((issue) => issue.code === 'LAST_SYNC_FAILED'));
});

test('marks a populated source without purchase entry as incomplete', () => {
  const source = mapAdminSourceDto({
    id: 'tc',
    code: 'TICKETSCLOUD',
    name: 'Ticketscloud',
    enabled: true,
    orderCount: 0,
    aggregate: aggregate({ groupedEvents: 3, offers: 3, priceFromRub: 500 }),
    syncRuns: [run('catalog', 'SUCCESS', '2026-07-02T11:00:00.000Z')],
  }, {
    ticketscloudPurchaseConfigured: false,
    teplohodApiConfigured: true,
    teplohodPurchaseConfigured: true,
  }, now);

  assert.equal(source.catalogState, 'incomplete');
  assert.equal(source.purchase.ready, false);
  assert.ok(source.health.openIssues.some((issue) => issue.code === 'PURCHASE_NOT_READY'));
});

test('reports missing Teplohod bridge configuration independently of widget readiness', () => {
  const source = mapAdminSourceDto({
    id: 'tep',
    code: 'TEPLOHOD',
    name: 'Teplohod.info',
    enabled: true,
    orderCount: 0,
    aggregate: aggregate({
      groupedEvents: 6,
      offers: 6,
      priceFromRub: 100,
      sampleDeeplinkUrl: 'https://teplohod.info/event/974',
    }),
    syncRuns: [],
  }, {
    ticketscloudPurchaseConfigured: false,
    teplohodApiConfigured: false,
    teplohodPurchaseConfigured: true,
  }, now);

  assert.equal(source.purchase.ready, true);
  assert.ok(source.health.openIssues.some((issue) => issue.code === 'TEP_API_NOT_CONFIGURED'));
  assert.ok(source.health.openIssues.some((issue) => issue.code === 'NO_SUCCESSFUL_SYNC'));
});

test('does not mark a token-only source without saleable inventory as purchase ready', () => {
  const source = mapAdminSourceDto({
    id: 'tc',
    code: 'TICKETSCLOUD',
    name: 'Ticketscloud',
    enabled: true,
    orderCount: 0,
    aggregate: aggregate({ groupedEvents: 3 }),
    syncRuns: [run('catalog', 'SUCCESS', '2026-07-02T11:00:00.000Z')],
  }, {
    ticketscloudPurchaseConfigured: true,
    teplohodApiConfigured: true,
    teplohodPurchaseConfigured: true,
  }, now);

  assert.equal(source.purchase.ready, false);
  assert.equal(source.catalogState, 'incomplete');
});

test('keeps a disabled source paused instead of reporting stale catalog errors', () => {
  const source = mapAdminSourceDto({
    id: 'paused',
    code: 'TICKETSCLOUD',
    name: 'Ticketscloud',
    enabled: false,
    orderCount: 0,
    aggregate: aggregate(),
    syncRuns: [],
  }, {
    ticketscloudPurchaseConfigured: false,
    teplohodApiConfigured: false,
    teplohodPurchaseConfigured: false,
  }, now);

  assert.equal(source.catalogState, 'paused');
  assert.equal(source.health.status, 'paused');
  assert.equal(source.health.isStale, false);
  assert.deepEqual(source.health.openIssues.map((issue) => issue.code), ['SOURCE_DISABLED']);
});

function run(mode: string, status: string, startedAt: string, error: string | null = null) {
  return {
    id: `${mode}:${startedAt}`,
    mode,
    status,
    startedAt: new Date(startedAt),
    finishedAt: null,
    stats: null,
    error,
  };
}

function aggregate(overrides: Partial<{
  sourceEvents: number;
  groupedEvents: number;
  groupedVenues: number;
  groupedCities: number;
  sessions: number;
  offers: number;
  priceFromRub: number | null;
  sampleWidgetUrl: string | null;
  sampleDeeplinkUrl: string | null;
}> = {}) {
  return {
    sourceId: 'source',
    sourceEvents: 0,
    groupedEvents: 0,
    groupedVenues: 0,
    groupedCities: 0,
    sessions: 0,
    offers: 0,
    priceFromRub: null,
    sampleWidgetUrl: null,
    sampleDeeplinkUrl: null,
    ...overrides,
  };
}
