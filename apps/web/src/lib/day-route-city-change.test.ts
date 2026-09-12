import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAddForeignCityConfirmMessage,
  buildCityChangeConfirmMessage,
  confirmClearDayRouteForCityChange,
  dayRouteConflictsWithIncomingCity,
  dayRouteNeedsClearForCityChange,
} from './day-route-city-change.ts';
import {
  addToDayRoute,
  clearDayRoute,
  readDayRoute,
  resetDayRouteSnapshotCache,
} from './day-route.ts';

function mockStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  (globalThis as { window?: unknown }).window = globalThis;
  (globalThis as { localStorage?: unknown }).localStorage = localStorage;
  (globalThis as { Event?: unknown }).Event = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
  (globalThis as { dispatchEvent?: unknown }).dispatchEvent = () => true;
  (globalThis as { addEventListener?: unknown }).addEventListener = () => undefined;
  (globalThis as { removeEventListener?: unknown }).removeEventListener = () => undefined;
  resetDayRouteSnapshotCache();
  return store;
}

test('dayRouteNeedsClearForCityChange skips when route empty', () => {
  mockStorage();
  clearDayRoute();
  assert.equal(dayRouteNeedsClearForCityChange('Казань', 'Москва'), false);
});

test('confirmClearDayRouteForCityChange clears on OK and keeps on Cancel', async () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'a', title: 'A', cityId: 'c1', city: 'Москва' });
  assert.equal(readDayRoute().venues.length, 1);

  assert.equal(
    await confirmClearDayRouteForCityChange('Казань', 'Москва', async () => false),
    false,
  );
  assert.equal(readDayRoute().venues.length, 1);

  assert.equal(
    await confirmClearDayRouteForCityChange('Казань', 'Москва', async () => true),
    true,
  );
  assert.equal(readDayRoute().venues.length, 0);
});

test('confirmClearDayRouteForCityChange no-ops when city unchanged', async () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'a', title: 'A', cityId: 'c1', city: 'Москва' });
  let confirmCalls = 0;
  assert.equal(
    await confirmClearDayRouteForCityChange('Москва', 'Москва', async () => {
      confirmCalls += 1;
      return false;
    }),
    true,
  );
  assert.equal(confirmCalls, 0);
  assert.equal(readDayRoute().venues.length, 1);
});

test('confirmClearDayRouteForCityChange denies filled route without confirmFn', async () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'a', title: 'A', city: 'Москва' });
  assert.equal(await confirmClearDayRouteForCityChange('Казань', 'Москва'), false);
  assert.equal(readDayRoute().venues.length, 1);
});

test('buildCityChangeConfirmMessage uses hyphen copy', () => {
  const message = buildCityChangeConfirmMessage('Москва');
  assert.match(message, /г\. Москва/);
  assert.equal(message.includes('—'), false);
  assert.equal(message.includes('–'), false);
});

test('dayRouteConflictsWithIncomingCity detects foreign city', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'a', title: 'A', city: 'Москва', citySlug: 'moscow' });
  const venues = readDayRoute().venues;
  assert.equal(dayRouteConflictsWithIncomingCity(venues, { city: 'Казань', citySlug: 'kazan' }), true);
  assert.equal(dayRouteConflictsWithIncomingCity(venues, { city: 'Москва', citySlug: 'moscow' }), false);
  assert.equal(dayRouteConflictsWithIncomingCity([], { city: 'Казань' }), false);
});

test('buildAddForeignCityConfirmMessage names both cities', () => {
  const message = buildAddForeignCityConfirmMessage('Москва', 'Санкт-Петербург');
  assert.match(message, /г\. Москва/);
  assert.match(message, /г\. Санкт-Петербург/);
});
