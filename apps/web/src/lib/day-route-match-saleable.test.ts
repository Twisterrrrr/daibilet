import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isDayRouteMatchSaleable } from '../server/day-route-match-saleable';
import {
  applyMatchCommerceToVenues,
  pickAdmissionMatchForStop,
  type DayRouteMatchOfferStub,
} from './day-route-commercial';
import type { DayRouteVenueItem } from './day-route';

function stop(partial: Partial<DayRouteVenueItem> & { id: string; title: string }): DayRouteVenueItem {
  return { ...partial, id: partial.id, title: partial.title };
}

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

describe('day-route-match-saleable', () => {
  it('rejects thin TC without schedule or purchase', () => {
    assert.equal(
      isDayRouteMatchSaleable({
        status: 'REVIEW',
        kind: 'SINGLE',
        sessions: [],
        offers: [],
        sourceLinks: [],
      }),
      false,
    );
  });

  it('accepts upcoming session + TC source link', () => {
    assert.equal(
      isDayRouteMatchSaleable({
        status: 'READY',
        kind: 'SINGLE',
        sessions: [{ startsAt: future, sourceStatus: null }],
        offers: [],
        sourceLinks: [{ externalId: '6a32bd448e99703657131cdc', source: { code: 'TICKETSCLOUD' } }],
      }),
      true,
    );
  });

  it('accepts open_date with widget offer', () => {
    assert.equal(
      isDayRouteMatchSaleable({
        status: 'PUBLISHED',
        kind: 'OPEN_DATE',
        sessions: [],
        offers: [{ active: true, widgetUrl: 'https://widget.ticketscloud.ru/?token=x&event=abc' }],
        sourceLinks: [],
      }),
      true,
    );
  });

  it('rejects HIDDEN even with widget', () => {
    assert.equal(
      isDayRouteMatchSaleable({
        status: 'HIDDEN',
        kind: 'OPEN_DATE',
        offers: [{ active: true, widgetUrl: 'https://example.com' }],
      }),
      false,
    );
  });
});

describe('day-route-commercial purchaseReady guard', () => {
  const polet = stop({
    id: 'venue_polet',
    slug: 'stadion-polet',
    title: 'Стадион Полет',
  });

  const thinMatch: DayRouteMatchOfferStub = {
    eventId: 'evt_thin_tc',
    slug: 'tc-6a32bd448e99703657131cdc-nizhnii-novgorod',
    title: 'Нижний Новгород',
    priceFromRub: null,
    purchaseReady: false,
    covered: { stop: [], start: ['venue_polet'], nearby: [] },
    routeVenues: [{ id: 'venue_polet' }],
  };

  const saleableMatch: DayRouteMatchOfferStub = {
    eventId: 'evt_ok',
    slug: 'nn-stadium-tour',
    title: 'Экскурсия по стадиону',
    priceFromRub: 500,
    purchaseReady: true,
    covered: { stop: [], start: ['venue_polet'], nearby: [] },
    routeVenues: [{ id: 'venue_polet' }],
  };

  it('does not attach unsaleable admission match as buy CTA', () => {
    assert.equal(pickAdmissionMatchForStop(polet, [thinMatch]), null);
    const { venues, changed } = applyMatchCommerceToVenues([polet], [thinMatch]);
    assert.equal(changed, false);
    assert.equal(venues[0]?.ticketUrl, undefined);
    assert.equal(venues[0]?.eventId, undefined);
  });

  it('attaches saleable admission match', () => {
    const picked = pickAdmissionMatchForStop(polet, [thinMatch, saleableMatch]);
    assert.equal(picked?.eventId, 'evt_ok');
    const { venues, changed } = applyMatchCommerceToVenues([polet], [saleableMatch]);
    assert.equal(changed, true);
    assert.equal(venues[0]?.eventSlug, 'nn-stadium-tour');
    assert.equal(venues[0]?.ticketUrl, '/events/nn-stadium-tour');
  });

  it('culls venue-hosted unsaleable ticket poison from localStorage', () => {
    const poisoned = stop({
      id: 'venue_polet',
      slug: 'stadion-polet',
      title: 'Стадион Полет',
      eventId: 'evt_thin_tc',
      eventSlug: 'tc-6a32bd448e99703657131cdc-nizhnii-novgorod',
      ticketUrl: '/events/tc-6a32bd448e99703657131cdc-nizhnii-novgorod',
    });
    const { venues, changed } = applyMatchCommerceToVenues([poisoned], [saleableMatch]);
    assert.equal(changed, true);
    // thin poison cleared; saleable admission attached instead
    assert.equal(venues[0]?.eventId, 'evt_ok');
    assert.equal(venues[0]?.ticketUrl, '/events/nn-stadium-tour');
  });

  it('keeps true event stop when matches omit it', () => {
    const eventStop = stop({
      id: 'evt_standup',
      slug: 'standup-night',
      title: 'Стендап',
      eventId: 'evt_standup',
      eventSlug: 'standup-night',
      ticketUrl: '/events/standup-night',
    });
    const { venues, changed } = applyMatchCommerceToVenues([eventStop], [saleableMatch]);
    assert.equal(changed, false);
    assert.equal(venues[0]?.ticketUrl, '/events/standup-night');
    assert.equal(venues[0]?.eventId, 'evt_standup');
  });
});
