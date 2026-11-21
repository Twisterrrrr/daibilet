import assert from 'node:assert/strict';
import test from 'node:test';

import { readPlaceFavorites, togglePlaceFavorite } from './place-favorites.ts';

test('place favorites toggle add and remove', () => {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: () => null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memory });

  assert.deepEqual(readPlaceFavorites(), []);
  const item = {
    id: 'v1',
    name: 'Эрмитаж',
    href: '/venues/ermitazh',
    city: 'Санкт-Петербург',
  };
  const added = togglePlaceFavorite(item);
  assert.equal(added.length, 1);
  assert.equal(added[0]?.id, 'v1');
  const removed = togglePlaceFavorite(item);
  assert.equal(removed.length, 0);
});
