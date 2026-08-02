import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyHotPickOfferToItem,
  buildHotPickCards,
  classifyHotPickOffer,
  dayPartForStop,
  findHotPickEventForPlace,
  resolveHotPickTicketTarget,
} from './day-route-hot-picks';
import type { DayRouteVenueItem } from './day-route';

describe('day-route-hot-picks offers', () => {
  it('scenario 1 affiche for entertainment event', () => {
    const offer = classifyHotPickOffer(
      { name: 'Селёдка и Кофе', venueSlug: 'seledka' },
      {
        id: 'e1',
        slug: 'standup-nn',
        title: 'Вечерний стендап в Селёдка и Кофе',
        venueSlug: 'seledka',
        priceFromRub: 900,
      },
    );
    assert.equal(offer.kind, 'affiche');
    assert.equal(offer.badge, 'Каждый вечер');
    assert.equal(offer.ctaLabel, 'Выбрать дату и билеты');
    assert.equal(offer.dayPart, 'evening');
    assert.equal(offer.sessionLabel, 'Вечерний сеанс');
    assert.equal(offer.ticketUrl, '/events/standup-nn');
  });

  it('affiche never uses venue slug as /events/{venueSlug}', () => {
    const offer = classifyHotPickOffer(
      { name: 'Niko1560', venueSlug: 'niko1560' },
      {
        id: 'niko1560',
        slug: 'niko1560',
        title: 'Стендап в Niko1560',
        venueSlug: 'niko1560',
      },
    );
    assert.equal(offer.kind, 'affiche');
    assert.equal(offer.ticketUrl, '/venues/niko1560');
    assert.equal(offer.eventId, null);
    assert.equal(offer.eventSlug, null);
    assert.ok(!String(offer.ticketUrl).includes('/events/niko1560'));
  });

  it('resolveHotPickTicketTarget keeps real event slug', () => {
    const target = resolveHotPickTicketTarget(
      { name: 'Niko1560', venueSlug: 'niko1560' },
      {
        id: 'evt_1',
        slug: 'standup-po-zhenski',
        title: 'Standup',
        venueSlug: 'niko1560',
      },
    );
    assert.equal(target.ticketUrl, '/events/standup-po-zhenski');
    assert.equal(target.eventSlug, 'standup-po-zhenski');
  });

  it('scenario 2 open_date for museum event', () => {
    const offer = classifyHotPickOffer(
      { name: 'Арсенал', venueSlug: 'arsenal', type: 'MUSEUM' },
      {
        id: 'e2',
        slug: 'arsenal-ticket',
        title: 'Билет в Арсенал',
        venueSlug: 'arsenal',
        venueKind: 'museum',
        priceFromRub: 400,
      },
    );
    assert.equal(offer.kind, 'open_date');
    assert.equal(offer.badge, 'Билет на любой день');
    assert.match(offer.ctaLabel, /Купить билет/);
    assert.equal(offer.dayPart, 'day');
    assert.equal(offer.sessionLabel, undefined);
  });

  it('free landmark without event', () => {
    const offer = classifyHotPickOffer(
      { name: 'Кремль', locationSlug: 'nizhny-novgorod-nizhegorodskiy-kreml' },
      null,
    );
    assert.equal(offer.kind, 'free');
    assert.equal(offer.ctaLabel, 'Добавить в план');
  });

  it('applyHotPickOfferToItem clears startsAt for paid offers', () => {
    const base: DayRouteVenueItem = {
      id: 'v1',
      title: 'Шоу',
      startsAt: '2026-08-02T18:30:00+03:00',
    };
    const next = applyHotPickOfferToItem(base, {
      kind: 'affiche',
      badge: 'Вечерний сеанс',
      ctaLabel: 'Выбрать дату и билеты',
      dayPart: 'evening',
      ticketUrl: '/events/x',
      sessionLabel: 'Вечерний сеанс',
      eventId: 'x',
    });
    assert.equal(next.startsAt, null);
    assert.equal(next.sessionLabel, 'Вечерний сеанс');
    assert.equal(next.ticketBought, false);
  });
});

describe('day-route-hot-picks matching + tabs', () => {
  it('matches event by venueSlug', () => {
    const ev = findHotPickEventForPlace(
      { name: 'Yale', venueSlug: 'yale' },
      { slug: 'yale', title: 'Yale' },
      [{ id: '1', venueSlug: 'yale', title: 'Ужин' }],
    );
    assert.equal(ev?.id, '1');
  });

  it('tips tab curates ≤6 non-gastro cards', () => {
    const rows = [
      {
        place: { name: 'Кремль', locationSlug: 'kreml' },
        item: { id: '1', title: 'Кремль', slug: 'kreml' },
        hook: 'Стены и вид на стрелку',
      },
      {
        place: { name: 'Пакгаузы', locationSlug: 'pakgauzy' },
        item: { id: '2', title: 'Пакгаузы', slug: 'pakgauzy' },
        hook: 'Культурный кластер на Стрелке',
      },
      {
        place: { name: 'Yale', venueSlug: 'yale', type: 'CLUB_BAR_RESTAURANT' },
        item: { id: '3', title: 'Yale', slug: 'yale' },
        hook: 'Вино и малые тарелки',
      },
    ];
    const tips = buildHotPickCards({ rows, events: [], tab: 'tips', max: 6 });
    assert.equal(tips.length, 2);
    assert.ok(tips.every((c) => c.offer.kind === 'free'));
    const food = buildHotPickCards({ rows, events: [], tab: 'food', max: 6 });
    assert.equal(food.length, 1);
    assert.equal(food[0]!.item.slug, 'yale');
  });
});

describe('dayPartForStop', () => {
  it('maps soft evening label and free stops', () => {
    assert.equal(dayPartForStop({ sessionLabel: 'Вечерний сеанс' }), 'evening');
    assert.equal(dayPartForStop({}), 'day');
    assert.equal(
      dayPartForStop({ startsAt: '2026-08-02T10:00:00+03:00', sessionLabel: '10:00' }),
      'morning',
    );
  });

  it('maps timed afternoon sessions to day bucket', () => {
    assert.equal(
      dayPartForStop({
        startsAt: '2026-08-02T14:00:00+03:00',
        sessionLabel: '14:00',
      }),
      'day',
    );
    assert.equal(
      dayPartForStop({
        startsAt: '2026-08-02T19:00:00+03:00',
        sessionLabel: '19:00',
      }),
      'evening',
    );
  });
});
