import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  boatSightseeingScore,
  buildBoatRoutesFromSessions,
  dayRouteItemFromBoatSlot,
  dayRouteSuggestsBoat,
  guessBoatDurationMinutes,
  inferBoatTimeWindow,
  isSpbDayRouteCity,
  rankBoatPiers,
  resolveBoatRankingOrigin,
  SPB_WATER_CENTER,
} from './day-route-boat';

describe('day-route-boat', () => {
  it('detects SPB city labels', () => {
    assert.equal(isSpbDayRouteCity({ slug: 'санкт-петербург' }), true);
    assert.equal(isSpbDayRouteCity({ name: 'Санкт-Петербург' }), true);
    assert.equal(isSpbDayRouteCity({ sourceSlug: 'spb' }), true);
    assert.equal(isSpbDayRouteCity({ name: 'Москва' }), false);
  });

  it('ranks nearer pier higher', () => {
    const ranked = rankBoatPiers(
      [
        {
          id: 'far',
          slug: 'far',
          name: 'Дальний',
          city: 'Санкт-Петербург',
          latitude: 59.9,
          longitude: 30.4,
          events: 10,
        },
        {
          id: 'near',
          slug: 'near',
          name: 'Близкий',
          city: 'Санкт-Петербург',
          latitude: 59.94,
          longitude: 30.315,
          events: 10,
        },
      ],
      SPB_WATER_CENTER,
    );
    assert.equal(ranked[0]!.id, 'near');
    assert.ok((ranked[0]!.distanceM ?? 99999) < (ranked[1]!.distanceM ?? 0));
  });

  it('prefers short sightseeing titles', () => {
    assert.ok(
      boatSightseeingScore('Обзорная экскурсия по каналам') >
        boatSightseeingScore('Ночная вечеринка с ужином на теплоходе'),
    );
    assert.equal(guessBoatDurationMinutes('Прогулка 1 час с гидом'), 60);
  });

  it('formats boat slots in Europe/Moscow and dedupes same HH:mm', () => {
    const routes = buildBoatRoutesFromSessions(
      [
        {
          id: 'evt_bridges',
          title: 'Разводные мосты Петербурга с борта теплохода',
          upcomingSlots: [
            {
              eventId: 'evt_bridges',
              startsAt: '2026-08-09T17:55:00.000Z',
              timeLabel: '20:55',
            },
            {
              eventId: 'evt_bridges_b',
              startsAt: '2026-08-09T20:55:00.000Z',
              timeLabel: '20:55',
            },
            {
              eventId: 'evt_bridges_c',
              startsAt: '2026-08-09T20:55:00.000Z',
              timeLabel: '23:55',
            },
            {
              eventId: 'evt_bridges_d',
              startsAt: '2026-08-10T20:55:00.000Z',
              timeLabel: '23:55',
            },
          ],
        },
      ],
      { earliestMs: null, latestMs: null },
    );
    assert.equal(routes.length, 1);
    const times = routes[0]!.slots.map((s) => s.timeLabel);
    assert.deepEqual(times, ['20:55', '23:55', '23:55']);
    assert.equal(routes[0]!.slots[1]!.timeLabel, '23:55');
    assert.equal(routes[0]!.slots[1]!.startsAt, '2026-08-09T20:55:00.000Z');
  });

  it('builds routes and prefers slot inside time window', () => {
    const window = {
      earliestMs: Date.parse('2026-08-02T10:00:00.000Z'),
      latestMs: Date.parse('2026-08-02T14:00:00.000Z'),
    };
    const routes = buildBoatRoutesFromSessions(
      [
        {
          id: 'evt_a',
          slug: 'cruise-a',
          title: 'Обзорная экскурсия по рекам',
          upcomingSlots: [
            {
              eventId: 'evt_a',
              startsAt: '2026-08-02T08:00:00.000Z',
              timeLabel: '11:00',
              dateLabel: 'вс, 2 авг.',
            },
            {
              eventId: 'evt_a',
              startsAt: '2026-08-02T12:00:00.000Z',
              timeLabel: '15:00',
              dateLabel: 'вс, 2 авг.',
            },
          ],
        },
      ],
      window,
    );
    assert.equal(routes.length, 1);
    assert.equal(routes[0]!.slots[0]!.startsAt, '2026-08-02T12:00:00.000Z');
    assert.equal(routes[0]!.slots[0]!.fitsWindow, true);
    assert.equal(routes[0]!.slots[1]!.fitsWindow, false);
  });

  it('infers time window from neighbor startsAt', () => {
    const window = inferBoatTimeWindow(
      [{ startsAt: '2026-08-02T09:00:00.000Z' }, { startsAt: '2026-08-02T16:00:00.000Z' }],
      1,
    );
    assert.ok(window.earliestMs != null);
    assert.ok(window.latestMs != null);
    assert.ok(window.earliestMs! > Date.parse('2026-08-02T09:00:00.000Z'));
    assert.ok(window.latestMs! < Date.parse('2026-08-02T16:00:00.000Z'));
  });

  it('suggests boat near waterfront text or pier geo', () => {
    assert.equal(
      dayRouteSuggestsBoat([{ title: 'Эрмитаж', address: 'Дворцовая набережная', latitude: null, longitude: null }], []),
      true,
    );
    assert.equal(
      dayRouteSuggestsBoat(
        [{ title: 'Казанский', address: null, latitude: 59.94, longitude: 30.325 }],
        [{ latitude: 59.9398, longitude: 30.3146 }],
      ),
      true,
    );
    assert.equal(
      dayRouteSuggestsBoat(
        [{ title: 'Парк', address: 'далеко', latitude: 60.1, longitude: 30.5 }],
        [{ latitude: 59.9398, longitude: 30.3146 }],
      ),
      false,
    );
  });

  it('falls back to SPB water center without route coords', () => {
    const origin = resolveBoatRankingOrigin([], { cityIsSpb: true });
    assert.equal(origin.source, 'spb-center');
    assert.equal(origin.latitude, SPB_WATER_CENTER.latitude);
  });

  it('pins boat slot with eventId + startsAt', () => {
    const item = dayRouteItemFromBoatSlot({
      pier: {
        id: 'venue_pier',
        slug: 'prichal-x',
        name: 'Причал X',
        city: 'Санкт-Петербург',
        cityId: 'city_1',
        citySlug: 'санкт-петербург',
        address: 'наб. 1',
        latitude: 59.93,
        longitude: 30.32,
        heroImageUrl: null,
      },
      route: {
        eventId: 'evt_tep_1',
        eventSlug: 'cruise-1',
        title: 'Северная Венеция',
        imageUrl: null,
      },
      slot: {
        eventId: 'evt_tep_1',
        startsAt: '2026-08-02T12:00:00.000Z',
        dateLabel: 'вс, 2 авг.',
        timeLabel: '15:00',
        purchaseUrl: 'https://account.teplohod.info/order/x',
      },
    });
    assert.equal(item.eventId, 'evt_tep_1');
    assert.equal(item.startsAt, '2026-08-02T12:00:00.000Z');
    assert.equal(item.id, 'venue_pier');
    assert.ok(String(item.sessionLabel).includes('15:00'));
    assert.ok(String(item.ticketUrl).includes('teplohod.info'));
  });

  it('strips r: from TicketsCloud purchaseUrl on day-route ticket', () => {
    const item = dayRouteItemFromBoatSlot({
      pier: {
        id: 'venue_pier',
        slug: 'fontanka',
        name: 'Фонтанка',
        city: 'Санкт-Петербург',
        cityId: null,
        citySlug: 'saint-petersburg',
        address: null,
        latitude: 59.93,
        longitude: 30.32,
        heroImageUrl: null,
      },
      route: {
        eventId: 'evt_tc_1',
        eventSlug: 'tc-cruise',
        title: 'По рекам и каналам',
        imageUrl: null,
      },
      slot: {
        eventId: 'evt_tc_1',
        startsAt: '2026-08-02T12:00:00.000Z',
        dateLabel: 'вс, 2 авг.',
        timeLabel: '15:00',
        purchaseUrl:
          'https://ticketscloud.org/v1/widgets/common?token=r%3AeyJ.test&event=6a05dd8e',
      },
    });
    assert.ok(item.ticketUrl);
    const parsed = new URL(String(item.ticketUrl));
    assert.equal(parsed.searchParams.get('token'), 'eyJ.test');
    assert.equal(parsed.hostname, 'ticketscloud.com');
  });
});
