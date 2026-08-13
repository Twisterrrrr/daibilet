import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDayRouteTypeCounts,
  dayRouteStopDwellChipLabel,
  dayRouteStopPriceChipLabel,
  dayRouteStopTypeTag,
  editorialTagFromTitle,
  estimateDayRouteDwellMinutes,
  formatDayRouteSoftMinutes,
} from './day-route-stop-types.ts';

test('editorialTagFromTitle detects theatre and art', () => {
  assert.equal(editorialTagFromTitle('Пермский академический Театр-Театр'), 'Театр');
  assert.equal(editorialTagFromTitle('Скульптура «Пермяк солёные уши»'), 'Арт-объект');
});

test('dayRouteStopTypeTag classifies custom / suburb / event', () => {
  assert.equal(dayRouteStopTypeTag({ id: 'text_1', title: 'Кафе' }), 'Своё место');
  assert.equal(dayRouteStopTypeTag({ id: 'v1', title: 'Кунгур', isSuburb: true }), 'Пригород');
  assert.equal(
    dayRouteStopTypeTag({ id: 'v2', title: 'Концерт', eventId: 'evt_1' }),
    'Событие',
  );
  assert.equal(dayRouteStopTypeTag({ id: 'v3', title: 'Площадь' }), 'Место');
  assert.equal(dayRouteStopTypeTag({ id: 'v4', title: 'Эрмитаж' }, 'Музей'), 'Музей');
  assert.equal(
    dayRouteStopTypeTag({
      id: 'ermitazh',
      slug: 'ermitazh',
      title: 'Эрмитаж',
      eventId: 'ballet_1',
      eventSlug: 'lebedinoe-ozero',
    }, 'Музей'),
    'Музей',
  );
});

test('dayRouteStopPriceChipLabel does not invent free entry for interiors', () => {
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v1', title: 'Дворцовая площадь' }), 'Вход свободный');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v1b', title: 'Аничков мост' }), 'Вход свободный');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v1c', title: 'Дворцовая набережная' }, 'Смотровая'), 'Вход свободный');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v2', title: 'Исаакиевский собор' }), '');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v3', title: 'Колоннада Исаакия' }, 'Смотровая'), '');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v5', title: 'Ботанический сад Петра Великого' }, 'Парк'), '');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v6', title: 'Нижний парк Петергофа' }, 'Парк'), '');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v7', title: 'Павловский парк' }, 'Парк'), '');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v8', title: 'Ленинградский зоопарк' }, 'Семейное'), '');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v9', title: 'Особняк Кельха' }, 'Особняк'), '');
  assert.equal(dayRouteStopPriceChipLabel({ id: 'v10', title: 'Александровский сад' }, 'Парк'), '');
  assert.equal(
    dayRouteStopPriceChipLabel({ id: 'v4', title: 'Театр', ticketUrl: 'https://t.example/1' }),
    'Можно купить билет',
  );
});

test('formatDayRouteSoftMinutes and dwell chip', () => {
  assert.equal(formatDayRouteSoftMinutes(120), '2 ч');
  assert.equal(dayRouteStopDwellChipLabel({ id: 'v1', title: 'X' }, 'Театр'), '~2 ч на месте');
});

test('buildDayRouteTypeCounts sorts by count', () => {
  const counts = buildDayRouteTypeCounts([
    { id: 'text_a', title: 'A' },
    { id: 'text_b', title: 'B' },
    { id: 'v1', title: 'X' },
  ]);
  assert.equal(counts[0]?.tag, 'Своё место');
  assert.equal(counts[0]?.count, 2);
});

test('estimateDayRouteDwellMinutes skips notes', () => {
  assert.equal(
    estimateDayRouteDwellMinutes([
      { id: 'note_1', title: 'Пауза' },
      { id: 'v1', title: 'Парк' },
    ]),
    30,
  );
});
