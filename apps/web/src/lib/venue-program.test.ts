import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVenueDateOptions,
  buildVenueDateRailChips,
  buildVenueAvailableMonths,
  buildVenueMonthRailChips,
  buildVenueProgramGroups,
  buildVenueProgramMonthView,
  expandVenuePlaybillEntries,
} from './venue-program.ts';

/**
 * 29.09. These three tests pinned absolute dates in September 2026. The venue
 * date rail filters every day before today (`key >= todayKey` in
 * `buildVenueDateOptions`), which is correct production behaviour - nobody wants
 * to be offered a playbill slot that already happened. But once the wall clock
 * passed 2026-09-14 the fixtures were entirely in the past, so `availableDates`
 * came back empty and all three tests failed without any code changing.
 *
 * The failures were never a logic bug: they were a calendar rotting the test.
 * The fix is to build the fixtures relative to now, so they keep describing an
 * upcoming playbill instead of expiring on a fixed date.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** An ISO instant `daysFromNow` days ahead, at a fixed UTC hour for stability. */
function isoDaysFromNow(daysFromNow: number, hourUtc = 10): string {
  const base = new Date();
  base.setUTCHours(hourUtc, 0, 0, 0);
  return new Date(base.getTime() + daysFromNow * DAY_MS).toISOString();
}

/** `YYYY-MM` key `monthsAhead` months ahead, so month-rail tests never expire. */
function monthKeyMonthsAhead(monthsAhead: number): string {
  const d = new Date();
  const anchor = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthsAhead, 1, 12));
  return `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** An ISO instant inside `monthKey`, on `day` of that month. */
function isoInMonth(monthKey: string, day: number, hourUtc = 16): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day, hourUtc)).toISOString();
}

test('lists every upcoming day from expanded upcomingSlots', () => {
  const sessions = [
    {
      id: 'evt_pier_1',
      title: 'Речная прогулка',
      category: 'Экскурсии',
      venue: 'Адмиралтейская наб. 10',
      startsAt: isoDaysFromNow(1),
      purchaseReady: true,
      upcomingSlots: [
        { eventId: 'evt_pier_1', startsAt: isoDaysFromNow(1), purchaseUrl: 'https://example.test/1' },
        { eventId: 'evt_pier_1', startsAt: isoDaysFromNow(2), purchaseUrl: 'https://example.test/2' },
        { eventId: 'evt_pier_1', startsAt: isoDaysFromNow(3), purchaseUrl: 'https://example.test/3' },
        { eventId: 'evt_pier_1', startsAt: isoDaysFromNow(5), purchaseUrl: 'https://example.test/4' },
      ],
    },
  ];

  const options = buildVenueDateOptions(sessions as never);
  assert.ok(options.availableDates.length >= 3);

  const chips = buildVenueDateRailChips(options.availableDates);
  const dayChips = chips.filter((chip) => chip.kind === 'day');
  assert.ok(dayChips.length >= 3);
  assert.deepEqual(
    dayChips.map((chip) => (chip.kind === 'day' ? chip.iso : '')).filter(Boolean),
    options.availableDates.slice(0, 21),
  );
});

test('keeps groups for a later selected day when slots exist on that day', () => {
  const sessions = [
    {
      id: 'evt_pier_1',
      title: 'Речная прогулка',
      category: 'Экскурсии',
      venue: 'Адмиралтейская наб. 10',
      groupKey: 'pier|walk',
      startsAt: isoDaysFromNow(1),
      purchaseReady: true,
      upcomingSlots: [
        { eventId: 'evt_pier_1', startsAt: isoDaysFromNow(1), purchaseUrl: 'https://example.test/1' },
        { eventId: 'evt_pier_1', startsAt: isoDaysFromNow(3), purchaseUrl: 'https://example.test/2' },
      ],
    },
  ];

  const options = buildVenueDateOptions(sessions as never);
  const laterDay = options.availableDates.find((iso) => iso > (options.smartDate || ''));
  assert.ok(laterDay);

  const groups = buildVenueProgramGroups(sessions as never, laterDay!, options.smartDate);
  assert.ok(groups.some((group) => group.hasSlotsOnSelectedDate));
});

test('month rail defaults to current month and spills next month when sparse', () => {
  // Both shows must sit in the future for the rail to offer them at all, so the
  // fixture month is the NEXT month rather than the current one: on the 29th the
  // current month has no future days left, and the test would rot on day one of
  // each month. The rail contract under test is "sparse month spills into the
  // next one", which holds for any pair of consecutive future months.
  const primaryMonth = monthKeyMonthsAhead(1);
  const spillMonth = monthKeyMonthsAhead(2);
  const sessions = [
    {
      id: 'a',
      title: 'Сет 1',
      category: 'Джаз',
      venue: 'Клуб',
      groupKey: 'a',
      startsAt: isoInMonth(primaryMonth, 3),
      purchaseReady: true,
      priceFrom: 2500,
    },
    {
      id: 'b',
      title: 'Сет 2',
      category: 'Джаз',
      venue: 'Клуб',
      groupKey: 'b',
      startsAt: isoInMonth(primaryMonth, 5),
      purchaseReady: true,
      priceFrom: 2500,
    },
    {
      id: 'c',
      title: 'Сет 3',
      category: 'Джаз',
      venue: 'Клуб',
      groupKey: 'c',
      startsAt: isoInMonth(spillMonth, 1),
      purchaseReady: true,
      priceFrom: 2500,
    },
  ];

  const options = buildVenueDateOptions(sessions as never);
  const months = buildVenueAvailableMonths(options.availableDates);
  assert.ok(months.includes(primaryMonth));
  assert.ok(months.includes(spillMonth));

  const chips = buildVenueMonthRailChips(months);
  assert.equal(chips[0]?.kind, 'month');
  assert.equal(chips[0]?.kind === 'month' ? chips[0].iso : '', primaryMonth);

  const view = buildVenueProgramMonthView(sessions as never, primaryMonth, { minPrimary: 5 });
  assert.equal(view.primary.length, 2);
  assert.equal(view.spilloverMonth, spillMonth);
  assert.equal(view.spillover.length, 1);
});

test('expandVenuePlaybillEntries splits distinct catalog sessions into separate rows', () => {
  const sessions = [
    {
      id: 'syutkin_a',
      title: 'Валерий Сюткин',
      category: 'Мероприятия',
      venue: 'Бутман',
      groupKey: 'syutkin',
      startsAt: '2026-09-14T15:00:00Z',
      timeLabel: '18:00',
      purchaseReady: true,
      priceFrom: 2500,
      ageLimit: 6,
    },
    {
      id: 'syutkin_b',
      title: 'Валерий Сюткин',
      category: 'Мероприятия',
      venue: 'Бутман',
      groupKey: 'syutkin',
      startsAt: '2026-09-14T18:00:00Z',
      timeLabel: '21:00',
      purchaseReady: true,
      priceFrom: 2500,
      ageLimit: 6,
    },
  ];
  const view = buildVenueProgramMonthView(sessions as never, '2026-09', { minPrimary: 1 });
  const rows = expandVenuePlaybillEntries(view.primary);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.session.timeLabel, '18:00');
  assert.equal(rows[1]?.session.timeLabel, '21:00');
});

test('expandVenuePlaybillEntries ignores ghost upcomingSlots not on the venue page', () => {
  const sessions = [
    {
      id: 'evt_syutkin_18',
      title: 'Валерий Сюткин и ансамбль S.O.S',
      category: 'Мероприятия',
      venue: 'Бутман',
      groupKey: 'syutkin-sos',
      startsAt: '2026-09-14T15:00:00Z',
      timeLabel: '18:00',
      purchaseReady: true,
      priceFrom: 2500,
      ageLimit: 6,
      upcomingSlots: [
        {
          eventId: 'evt_syutkin_18',
          startsAt: '2026-09-14T15:00:00Z',
          timeLabel: '18:00',
        },
        {
          eventId: 'evt_syutkin_21_ghost',
          startsAt: '2026-09-14T18:00:00Z',
          timeLabel: '21:00',
        },
      ],
    },
  ];
  const view = buildVenueProgramMonthView(sessions as never, '2026-09', { minPrimary: 1 });
  const rows = expandVenuePlaybillEntries(view.primary);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.session.timeLabel, '18:00');
  assert.equal(rows[0]?.session.id, 'evt_syutkin_18');
});
