import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDayRouteFreeWindowCityScope,
  classifyDayRouteCommercialChip,
  computeDayRouteReadiness,
  dayRouteCandidateMatchesCityScope,
  dayRouteOfferIsVenueBound,
  dayRouteStopIsCommerce,
  dayRouteStopReorderLocked,
  dayRouteStopTicketQrData,
  dayRouteVenueBoundPriceLabel,
  findDayRouteFreeWindowGaps,
  formatDayRouteOfferChip,
  resolveDayRouteOfferTitle,
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

  it('needs ticket when checkout exists without time - empty label (no «Билет оформляется»)', () => {
    const chip = classifyDayRouteCommercialChip(
      stop({ id: 'venue_3', slug: 'museum-3', title: 'Музей', ticketUrl: '/events/museum-ticket', eventId: 'evt_z' }),
    );
    assert.equal(chip.kind, 'needs_ticket');
    assert.equal(chip.label, '');
  });

  it('detects venue-bound offer vs event-as-stop', () => {
    assert.equal(
      dayRouteOfferIsVenueBound(
        stop({
          id: 'venue_sp',
          slug: 'siniy-pushkin',
          title: 'Синий Пушкин',
          ticketUrl: '/events/pushkin-show',
          eventId: 'evt_pushkin',
          priceFromRub: 290,
        }),
      ),
      true,
    );
    assert.equal(
      dayRouteOfferIsVenueBound(
        stop({
          id: 'evt_pushkin',
          slug: 'pushkin-show',
          title: 'Шоу',
          ticketUrl: '/events/pushkin-show',
          eventId: 'evt_pushkin',
          eventSlug: 'pushkin-show',
          priceFromRub: 290,
        }),
      ),
      false,
    );
    assert.equal(
      dayRouteOfferIsVenueBound(
        stop({
          id: 'venue_sp',
          slug: 'siniy-pushkin',
          title: 'Синий Пушкин',
          ticketUrl: '/events/pushkin-show',
          eventId: 'evt_pushkin',
          startsAt: '2026-08-06T20:00:00+03:00',
          sessionLabel: 'чт, 20:00',
        }),
      ),
      false,
    );
    assert.equal(dayRouteVenueBoundPriceLabel(stop({ id: 'x', title: 'X', priceFromRub: 290 })), 'от 290 ₽');
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

  it('locks reorder for bought or timed session', () => {
    assert.equal(
      dayRouteStopReorderLocked(
        stop({
          id: 'boat',
          title: 'Прогулка',
          ticketUrl: '/events/boat',
          startsAt: '2026-08-02T14:00:00+03:00',
          sessionLabel: 'сб, 14:00',
        }),
      ),
      true,
    );
    assert.equal(
      dayRouteStopReorderLocked(stop({ id: 'free', title: 'Парк', ticketBought: true })),
      true,
    );
    assert.equal(dayRouteStopReorderLocked(stop({ id: 'park', title: 'Парк' })), false);
  });

  it('marks commerce stops and never invents QR', () => {
    assert.equal(
      dayRouteStopIsCommerce(stop({ id: 't', title: 'Билет', ticketUrl: '/events/x', eventId: 'e1' })),
      true,
    );
    assert.equal(dayRouteStopIsCommerce(stop({ id: 'p', title: 'Парк' })), false);
    assert.equal(dayRouteStopTicketQrData(stop({ id: 't', title: 'Билет' })), null);
    assert.equal(
      dayRouteStopTicketQrData(stop({ id: 't', title: 'Билет', ticketQrData: ' CODE ' })),
      'CODE',
    );
  });
});

describe('day-route-commercial city scope line (Lovable H1)', () => {
  it('formats points and suburbs like Lovable', async () => {
    const { buildMyDayCityScopeLine } = await import('./day-route-commercial.ts');
    assert.equal(buildMyDayCityScopeLine({ availablePoints: 7, suburbCount: 3 }), '7 точек · 3 пригорода');
    assert.equal(buildMyDayCityScopeLine({ availablePoints: 1, suburbCount: 1 }), '1 точка · 1 пригород');
    assert.equal(buildMyDayCityScopeLine({ availablePoints: 5, suburbCount: 0 }), '5 точек');
    assert.equal(buildMyDayCityScopeLine({ availablePoints: 0, suburbCount: 2 }), '2 пригорода');
    assert.equal(buildMyDayCityScopeLine({ availablePoints: 0, suburbCount: 0 }), null);
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

  it('scopes free-window candidates to day city, not header mismatch', () => {
    const scope = buildDayRouteFreeWindowCityScope({
      pageCityId: 'city_sortavala',
      pageCityName: 'Сортавала',
      pageCitySlug: 'sortavala',
      routeVenues: [
        { city: 'Пермь', cityId: 'city_perm', citySlug: 'perm' },
        { city: 'Пермь', cityId: 'city_perm', citySlug: 'perm' },
      ],
    });
    assert.equal(
      dayRouteCandidateMatchesCityScope(
        {
          city: 'Сортавала',
          citySlug: 'respublika-kareliya',
        },
        scope,
      ),
      false,
    );
    assert.equal(
      dayRouteCandidateMatchesCityScope({ city: 'Пермь', citySlug: 'perm' }, scope),
      true,
    );
  });

  it('rejects candidates without city when scope is set', () => {
    const scope = buildDayRouteFreeWindowCityScope({
      pageCityName: 'Пермь',
      pageCitySlug: 'perm',
      routeVenues: [],
    });
    assert.equal(dayRouteCandidateMatchesCityScope({}, scope), false);
    assert.equal(dayRouteCandidateMatchesCityScope({ citySlug: 'perm' }, scope), true);
  });
});

describe('day-route-commercial offer chips', () => {
  it('never drops event title for buy chip', () => {
    const chip = formatDayRouteOfferChip({
      title: 'Элитный Stand-up',
      priceFromRub: 600,
    });
    assert.equal(chip.title, 'Элитный Stand-up');
    assert.equal(chip.price, 'от 600 ₽');
    assert.equal(chip.label, 'Элитный Stand-up · от 600 ₽');
  });

  it('falls back through session then venue when match title empty', () => {
    assert.equal(
      resolveDayRouteOfferTitle('', 'сб, 19:00', 'Comedy Club'),
      'сб, 19:00',
    );
    assert.equal(resolveDayRouteOfferTitle(null, null, 'Comedy Club'), 'Comedy Club');
    assert.equal(resolveDayRouteOfferTitle('Купить билет', null, 'Микс'), 'Микс');
  });

  it('strips Рядом prefix and parenthetical price from line fallbacks', () => {
    assert.equal(
      resolveDayRouteOfferTitle('', 'Рядом: Микс (от 1 500 ₽)', 'Venue'),
      'Микс',
    );
  });
});
