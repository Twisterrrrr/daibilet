import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterDayRouteScenariosByCity,
  type DayRouteSavedScenario,
} from './day-route-scenarios.ts';

function row(id: string, citySlug: string | null): DayRouteSavedScenario {
  return {
    id,
    name: id,
    title: id,
    citySlug,
    cityName: citySlug,
    items: id,
    travelMode: 'walk',
    hourStart: '10:00',
    hourEnd: '22:00',
    hourPlanOn: false,
    savedAt: 1,
  };
}

test('filterDayRouteScenariosByCity keeps city matches and snapshots without a city', () => {
  const list = [row('perm', 'perm'), row('msk', 'moscow'), row('any', null)];
  assert.deepEqual(
    filterDayRouteScenariosByCity(list, 'perm').map((s) => s.id),
    ['perm', 'any'],
  );
});

test('filterDayRouteScenariosByCity returns the full list when city is empty', () => {
  const list = [row('perm', 'perm'), row('msk', 'moscow')];
  assert.equal(filterDayRouteScenariosByCity(list, null).length, 2);
});
