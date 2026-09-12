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

test('lists every upcoming day from expanded upcomingSlots', () => {
  const sessions = [
    {
      id: 'evt_pier_1',
      title: 'Речная прогулка',
      category: 'Экскурсии',
      venue: 'Адмиралтейская наб. 10',
      startsAt: '2026-09-10T10:00:00Z',
      purchaseReady: true,
      upcomingSlots: [
        { eventId: 'evt_pier_1', startsAt: '2026-09-10T10:00:00Z', purchaseUrl: 'https://example.test/1' },
        { eventId: 'evt_pier_1', startsAt: '2026-09-11T10:00:00Z', purchaseUrl: 'https://example.test/2' },
        { eventId: 'evt_pier_1', startsAt: '2026-09-12T10:00:00Z', purchaseUrl: 'https://example.test/3' },
        { eventId: 'evt_pier_1', startsAt: '2026-09-14T10:00:00Z', purchaseUrl: 'https://example.test/4' },
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
      startsAt: '2026-09-10T10:00:00Z',
      purchaseReady: true,
      upcomingSlots: [
        { eventId: 'evt_pier_1', startsAt: '2026-09-10T10:00:00Z', purchaseUrl: 'https://example.test/1' },
        { eventId: 'evt_pier_1', startsAt: '2026-09-12T12:00:00Z', purchaseUrl: 'https://example.test/2' },
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
  const sessions = [
    {
      id: 'a',
      title: 'Сет 1',
      category: 'Джаз',
      venue: 'Клуб',
      groupKey: 'a',
      startsAt: '2026-09-03T16:30:00Z',
      purchaseReady: true,
      priceFrom: 2500,
    },
    {
      id: 'b',
      title: 'Сет 2',
      category: 'Джаз',
      venue: 'Клуб',
      groupKey: 'b',
      startsAt: '2026-09-05T16:30:00Z',
      purchaseReady: true,
      priceFrom: 2500,
    },
    {
      id: 'c',
      title: 'Сет 3',
      category: 'Джаз',
      venue: 'Клуб',
      groupKey: 'c',
      startsAt: '2026-10-01T16:30:00Z',
      purchaseReady: true,
      priceFrom: 2500,
    },
  ];

  const options = buildVenueDateOptions(sessions as never);
  const months = buildVenueAvailableMonths(options.availableDates);
  assert.ok(months.includes('2026-09'));
  assert.ok(months.includes('2026-10'));

  const chips = buildVenueMonthRailChips(months);
  assert.equal(chips[0]?.kind, 'month');
  assert.equal(chips[0]?.kind === 'month' ? chips[0].iso : '', '2026-09');

  const view = buildVenueProgramMonthView(sessions as never, '2026-09', { minPrimary: 5 });
  assert.equal(view.primary.length, 2);
  assert.equal(view.spilloverMonth, '2026-10');
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
