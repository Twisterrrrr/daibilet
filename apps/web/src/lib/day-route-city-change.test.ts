import assert from 'node:assert/strict';
import test from 'node:test';

import { confirmClearDayRouteForCityChange } from './day-route-city-change.ts';
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

test('confirmClearDayRouteForCityChange skips dialog when route empty', () => {
  mockStorage();
  clearDayRoute();
  let confirmCalls = 0;
  const prevConfirm = window.confirm;
  window.confirm = () => {
    confirmCalls += 1;
    return false;
  };
  try {
    assert.equal(confirmClearDayRouteForCityChange('Казань', 'Москва'), true);
    assert.equal(confirmCalls, 0);
  } finally {
    window.confirm = prevConfirm;
  }
});

test('confirmClearDayRouteForCityChange clears on OK and keeps on Cancel', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'a', title: 'A', cityId: 'c1', city: 'Москва' });
  assert.equal(readDayRoute().venues.length, 1);

  let answer = false;
  const prevConfirm = window.confirm;
  window.confirm = () => answer;
  try {
    assert.equal(confirmClearDayRouteForCityChange('Казань', 'Москва'), false);
    assert.equal(readDayRoute().venues.length, 1);

    answer = true;
    assert.equal(confirmClearDayRouteForCityChange('Казань', 'Москва'), true);
    assert.equal(readDayRoute().venues.length, 0);
  } finally {
    window.confirm = prevConfirm;
  }
});

test('confirmClearDayRouteForCityChange no-ops when city unchanged', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'a', title: 'A', cityId: 'c1' });
  let confirmCalls = 0;
  const prevConfirm = window.confirm;
  window.confirm = () => {
    confirmCalls += 1;
    return false;
  };
  try {
    assert.equal(confirmClearDayRouteForCityChange('Москва', 'Москва'), true);
    assert.equal(confirmCalls, 0);
    assert.equal(readDayRoute().venues.length, 1);
  } finally {
    window.confirm = prevConfirm;
  }
});
