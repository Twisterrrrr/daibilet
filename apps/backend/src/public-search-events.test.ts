import assert from 'node:assert/strict';
import test from 'node:test';

import { collapsePublicSearchEventRows } from './public-search-events.ts';

test('search collapses TC slot twins into one logical event', () => {
  const rows = [1, 2, 3, 4].map((index) => ({
    id: `slot-${index}`,
    slug: `bilet-v-muzei-matreshki-${index}`,
    title: 'Билет в Музей Матрешки',
    city: 'Санкт-Петербург',
    venue: 'Музей Матрешки',
  }));

  const result = collapsePublicSearchEventRows(rows, 6);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, 'slot-1');
});

test('same event title in different cities or venues stays distinct', () => {
  const rows = [
    {
      id: 'spb-museum',
      slug: 'night-at-museum-spb',
      title: 'Ночь в музее',
      city: 'Санкт-Петербург',
      venue: 'Музей А',
    },
    {
      id: 'spb-gallery',
      slug: 'night-at-gallery-spb',
      title: 'Ночь в музее',
      city: 'Санкт-Петербург',
      venue: 'Галерея Б',
    },
    {
      id: 'moscow-museum',
      slug: 'night-at-museum-moscow',
      title: 'Ночь в музее',
      city: 'Москва',
      venue: 'Музей А',
    },
  ];

  assert.equal(collapsePublicSearchEventRows(rows, 6).length, 3);
});

test('search fills its limit after duplicate rows are removed', () => {
  const rows = [
    ...[1, 2, 3].map((index) => ({
      id: `slot-${index}`,
      slug: `event-${index}`,
      title: 'Одинаковое событие',
      city: 'Москва',
      venue: 'Клуб',
    })),
    {
      id: 'unique-1',
      slug: 'unique-1',
      title: 'Первое уникальное событие',
      city: 'Москва',
      venue: 'Клуб',
    },
    {
      id: 'unique-2',
      slug: 'unique-2',
      title: 'Второе уникальное событие',
      city: 'Москва',
      venue: 'Клуб',
    },
  ];

  assert.deepEqual(
    collapsePublicSearchEventRows(rows, 3).map((row) => row.id),
    ['slot-1', 'unique-1', 'unique-2'],
  );
});
