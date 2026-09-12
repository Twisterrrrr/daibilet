import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeDayRouteHourPlan } from './day-route-soft-timing';
import type { DayRouteVenueItem } from './day-route';

function stop(partial: Partial<DayRouteVenueItem> & { id: string; title: string }): DayRouteVenueItem {
  return { ...partial, id: partial.id, title: partial.title };
}

describe('day-route-hour-plan', () => {
  it('anchors bought tickets and fills free stops', () => {
    const result = computeDayRouteHourPlan(
      [
        stop({ id: 'p1', title: 'Парк' }),
        stop({
          id: 'boat',
          title: 'Теплоход',
          ticketBought: true,
          ticketUrl: '/events/boat',
          startsAt: '2026-08-04T15:00:00+03:00',
          sessionLabel: 'вт, 15:00',
        }),
        stop({ id: 'p2', title: 'Музей' }),
      ],
      { startHHMM: '10:00', endHHMM: '22:00', lunch: false },
    );
    assert.equal(result.byId.boat?.label, 'В 15:00');
    assert.match(result.byId.p1?.label || '', /^\d{2}:\d{2} - \d{2}:\d{2}$/);
    assert.equal(result.overflowIds.length, 0);
  });

  it('puts overflow when day is too short', () => {
    const many = Array.from({ length: 8 }, (_, i) => stop({ id: `s${i}`, title: `Stop ${i}` }));
    const result = computeDayRouteHourPlan(many, {
      startHHMM: '10:00',
      endHHMM: '12:00',
      lunch: false,
    });
    assert.ok(result.overflowIds.length > 0);
    assert.ok(result.hints.length < many.length);
  });

  it('reserves lunch when checked', () => {
    const result = computeDayRouteHourPlan(
      [stop({ id: 'a', title: 'A' }), stop({ id: 'b', title: 'B' }), stop({ id: 'c', title: 'C' })],
      { startHHMM: '10:00', endHHMM: '22:00', lunch: true },
    );
    assert.ok(result.lunchHint);
    assert.match(result.lunchHint!.label, /обед/);
  });
});
