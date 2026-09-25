import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeHeaderSearchItems } from './header-search-results.ts';

test('header search puts Выборг geo-hit above events with formula A href', () => {
  const items = mergeHeaderSearchItems('выборг', [
    {
      type: 'event',
      label: 'Азон в Выборге',
      sublabel: 'Выборг · ZONA BIKE',
      href: '/events/azon-vyborg',
      imageUrl: null,
    },
    {
      type: 'venue',
      label: 'Выборгский замок',
      sublabel: 'Санкт-Петербург',
      href: '/locations/saint-petersburg-vyborgskiy-zamok',
      imageUrl: null,
    },
  ]);

  assert.equal(items[0]?.type, 'city');
  assert.equal(items[0]?.label, 'Выборг, Ленинградская область • Ближайшие события');
  assert.equal(items[0]?.href, '/cities/leningradskaya-oblast?city=vyborg');
  assert.equal(
    items.some((item) => item.href === '/events/azon-vyborg'),
    true,
  );
  assert.equal(
    items.some((item) => item.href === '/locations/saint-petersburg-vyborgskiy-zamok'),
    true,
  );
});

test('header search folds Раменское onto the Moscow oblast hub, not a City row', () => {
  const items = mergeHeaderSearchItems('раменское', [
    {
      type: 'city',
      label: 'Раменское',
      sublabel: 'Город',
      href: '/cities/раменское',
      imageUrl: null,
    },
    {
      type: 'event',
      label: 'Концерт в Раменском',
      href: '/events/ramenskoe-gig',
    },
  ]);

  assert.equal(items[0]?.href, '/cities/moskovskaya-oblast?city=ramenskoe');
  assert.equal(items[0]?.label, 'Раменское, Московская область • Ближайшие события');
  assert.equal(
    items.some((item) => item.href === '/cities/раменское'),
    false,
  );
  assert.equal(
    items.some((item) => item.href === '/events/ramenskoe-gig'),
    true,
  );
});

test('header search keeps venue/place hits when geo is empty', () => {
  const items = mergeHeaderSearchItems('эрмитаж', [
    {
      type: 'venue',
      label: 'Сад Эрмитаж',
      sublabel: 'Москва',
      href: '/venues/sad-ermitazh',
    },
    {
      type: 'event',
      label: 'Концерт в Эрмитаже',
      href: '/events/ermitazh-concert',
    },
  ]);

  assert.equal(
    items.some((item) => item.type === 'venue' && item.href === '/venues/sad-ermitazh'),
    true,
  );
  assert.equal(items.some((item) => item.type === 'event'), true);
});

test('header search still returns Выборг when the API list is empty or crashed', () => {
  assert.equal(mergeHeaderSearchItems('выборг', []).length, 1);
  assert.equal(
    mergeHeaderSearchItems('выборг', [null, undefined])[0]?.href,
    '/cities/leningradskaya-oblast?city=vyborg',
  );
});

test('header search collapses slot twins with the same title and context', () => {
  const items = mergeHeaderSearchItems('матрешки', [
    {
      type: 'event',
      label: 'Билет в Музей Матрешки',
      sublabel: 'Санкт-Петербург · Музей Матрешки',
      href: '/events/matreshki-slot-1',
    },
    {
      type: 'event',
      label: 'Билет в музей матрёшки',
      sublabel: 'Санкт Петербург — Музей Матрешки',
      href: '/events/matreshki-slot-2',
    },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0]?.href, '/events/matreshki-slot-1');
});

test('header search keeps same title at another venue', () => {
  const items = mergeHeaderSearchItems('ночь в музее', [
    {
      type: 'event',
      label: 'Ночь в музее',
      sublabel: 'Москва · Музей А',
      href: '/events/night-a',
    },
    {
      type: 'event',
      label: 'Ночь в музее',
      sublabel: 'Москва · Музей Б',
      href: '/events/night-b',
    },
  ]);

  assert.equal(items.length, 2);
});
