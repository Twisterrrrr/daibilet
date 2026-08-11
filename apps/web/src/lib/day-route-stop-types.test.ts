import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDayRouteTypeCounts,
  dayRouteStopTypeTag,
  estimateDayRouteDwellMinutes,
} from './day-route-stop-types.ts';

test('dayRouteStopTypeTag classifies custom / suburb / event', () => {
  assert.equal(dayRouteStopTypeTag({ id: 'text_1', title: 'Кафе' }), 'Своё место');
  assert.equal(dayRouteStopTypeTag({ id: 'v1', title: 'Кунгур', isSuburb: true }), 'Пригород');
  assert.equal(
    dayRouteStopTypeTag({ id: 'v2', title: 'Концерт', eventId: 'evt_1' }),
    'Событие',
  );
  assert.equal(dayRouteStopTypeTag({ id: 'v3', title: 'Площадь' }), 'Место');
  assert.equal(dayRouteStopTypeTag({ id: 'v4', title: 'Эрмитаж' }, 'Музей'), 'Музей');
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
    60,
  );
});
