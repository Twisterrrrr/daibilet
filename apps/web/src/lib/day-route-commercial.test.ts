import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyDayRouteCommercialChip,
  computeDayRouteReadiness,
  findDayRouteFreeWindowGaps,
} from './day-route-commercial';
import type { DayRouteVenueItem } from './day-route';

function stop(partial: Partial<DayRouteVenueItem> & { id: string; title: string }): DayRouteVenueItem {
  return { ...partial, id: partial.id, title: partial.title };
}

describe('day-route-commercial chips', () => {
  it('marks bought over session/ticket', () => {
    const chip = classifyDayRouteCommercialChip(
      stop({
        id: '1',
        title: 'Эрмитаж',
        ticketBought: true,
        ticketUrl: '/events/x',
        sessionLabel: 'сб, 14:00',
        startsAt: '2026-08-02T14:00:00+03:00',
      }),
    );
    assert.equal(chip.kind, 'bought');
    assert.equal(chip.label, 'Билет отмечен');
  });

  it('prefers session label when timed', () => {
    const chip = classifyDayRouteCommercialChip(
      stop({
        id: '2',
        title: 'Шоу',
        ticketUrl: '/events/y',
        sessionLabel: 'вс, 19:30',
        startsAt: '2026-08-02T19:30:00+03:00',
      }),
    );
    assert.equal(chip.kind, 'session');
    assert.equal(chip.label, 'Сеанс 19:30');
  });

  it('needs ticket when checkout exists without time', () => {
    const chip = classifyDayRouteCommercialChip(
      stop({ id: 'venue_3', slug: 'museum-3', title: 'Музей', ticketUrl: '/events/museum-ticket', eventId: 'evt_z' }),
    );
    assert.equal(chip.kind, 'needs_ticket');
    assert.equal(chip.label, 'Билет оформляется…');
  });

  it('keeps soft evening session label without inventing clock time', () => {
    const chip = classifyDayRouteCommercialChip(
      stop({
        id: 'venue_3b',
        slug: 'standup-club',
        title: 'Стендап',
        ticketUrl: '/events/standup-night',
        eventId: 'evt_standup',
        sessionLabel: 'Вечерний сеанс',
      }),
    );
    assert.equal(chip.kind, 'needs_ticket');
    assert.equal(chip.label, 'Вечерний сеанс');
  });

  it('free when no commerce signals (no badge label)', () => {
    const chip = classifyDayRouteCommercialChip(stop({ id: '4', title: 'Набережная' }));
    assert.equal(chip.kind, 'free');
    assert.equal(chip.label, '');
  });
});

describe('day-route-commercial readiness', () => {
  it('returns 0% for empty route', () => {
    const r = computeDayRouteReadiness([]);
    assert.equal(r.percent, 0);
    assert.equal(r.pointsCount, 0);
    assert.equal(r.summaryLine, '0 точек из 10');
    assert.match(r.percentLabel, /0%/);
  });

  it('header summary: points of SOFT + unpaid tickets only', () => {
    const venues = [
      stop({ id: 'a', title: 'Парк' }),
      stop({ id: 'venue_b', slug: 'show-hall', title: 'Шоу', ticketUrl: '/events/standup-b', eventId: 'evt_b' }),
      stop({
        id: 'venue_c',
        slug: 'theatre-c',
        title: 'Театр',
        ticketUrl: '/events/play-c',
        eventId: 'evt_c',
        ticketBought: true,
        sessionLabel: '18:00',
        startsAt: '2026-08-02T18:00:00+03:00',
      }),
    ];
    const r = computeDayRouteReadiness(venues, { segmentMeters: [400, 2000] });
    assert.equal(r.pointsCount, 3);
    assert.equal(r.ticketsToBuy, 1);
    assert.equal(r.freeWindows, 1);
    assert.equal(r.slotsWithoutTime, 1);
    assert.equal(r.summaryLine, '3 точки из 10 · 1 билет');
    assert.doesNotMatch(r.summaryLine, /свободное окно/);
    assert.doesNotMatch(r.summaryLine, /без билетов/);
    assert.ok(r.percent > 0 && r.percent <= 100);
  });

  it('omits tickets part when nothing unpaid', () => {
    const venues = [
      stop({ id: 'a', title: 'Парк' }),
      stop({
        id: 'venue_c',
        slug: 'theatre-c',
        title: 'Театр',
        ticketUrl: '/events/play-c',
        eventId: 'evt_c',
        ticketBought: true,
      }),
    ];
    const r = computeDayRouteReadiness(venues);
    assert.equal(r.summaryLine, '2 точки из 10');
    assert.equal(r.ticketsToBuy, 0);
  });
});

describe('day-route-commercial free windows', () => {
  it('filters gaps by threshold', () => {
    const gaps = findDayRouteFreeWindowGaps([500, 1500, null, 3000], 1200);
    assert.deepEqual(gaps, [
      { afterIndex: 1, meters: 1500 },
      { afterIndex: 3, meters: 3000 },
    ]);
  });
});
