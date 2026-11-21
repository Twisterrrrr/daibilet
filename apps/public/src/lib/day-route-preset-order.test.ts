import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dayRoutePresetsWithLinesAtTail,
  isPaintedWalkingLinePreset,
} from './day-route-preset-order.ts';

test('detects painted lines by id and title', () => {
  assert.equal(isPaintedWalkingLinePreset({ id: 'moscow-green-line' }), true);
  assert.equal(isPaintedWalkingLinePreset({ id: 'ekaterinburg-purple-line' }), true);
  assert.equal(isPaintedWalkingLinePreset({ title: 'Красная линия (романтический маршрут)' }), true);
  assert.equal(isPaintedWalkingLinePreset({ id: 'msk-1', title: 'Классический парадный центр' }), false);
  assert.equal(isPaintedWalkingLinePreset({ title: 'Приморский экспресс - коса и Зеленоградск' }), false);
});

test('moves painted lines to the tail and keeps relative order', () => {
  const ordered = dayRoutePresetsWithLinesAtTail([
    { id: 'city-green-line', title: 'Зелёная линия' },
    { id: 'city-classic', title: 'Классика' },
    { id: 'city-red-line', title: 'Красная линия' },
    { id: 'city-art', title: 'Арт' },
  ]);
  assert.deepEqual(
    ordered.map((row) => row.id),
    ['city-classic', 'city-art', 'city-green-line', 'city-red-line'],
  );
});

test('no-op when there are only lines or only classics', () => {
  const onlyLines = [
    { id: 'a-green-line' },
    { id: 'a-red-line' },
  ];
  assert.equal(dayRoutePresetsWithLinesAtTail(onlyLines), onlyLines);
  const onlyCore = [{ id: 'a' }, { id: 'b' }];
  assert.equal(dayRoutePresetsWithLinesAtTail(onlyCore), onlyCore);
});
