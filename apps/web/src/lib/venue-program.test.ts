import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVenueDateOptions,
  buildVenueDateRailChips,
  buildVenueProgramGroups,
} from './venue-program.ts';

test('lists every upcoming day from expanded upcomingSlots', () => {
  const sessions = [
    {
      id: 'evt_pier_1',
      title: 'Речная прогулка',
      category: 'Экскурсии',
      venue: 'Адмиралтейская наб. 10',
      startsAt: '2026-08-10T10:00:00Z',
      purchaseReady: true,
      upcomingSlots: [
        { eventId: 'evt_pier_1', startsAt: '2026-08-10T10:00:00Z', purchaseUrl: 'https://example.test/1' },
        { eventId: 'evt_pier_1', startsAt: '2026-08-11T10:00:00Z', purchaseUrl: 'https://example.test/2' },
        { eventId: 'evt_pier_1', startsAt: '2026-08-12T10:00:00Z', purchaseUrl: 'https://example.test/3' },
        { eventId: 'evt_pier_1', startsAt: '2026-08-14T10:00:00Z', purchaseUrl: 'https://example.test/4' },
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
      startsAt: '2026-08-10T10:00:00Z',
      purchaseReady: true,
      upcomingSlots: [
        { eventId: 'evt_pier_1', startsAt: '2026-08-10T10:00:00Z', purchaseUrl: 'https://example.test/1' },
        { eventId: 'evt_pier_1', startsAt: '2026-08-12T12:00:00Z', purchaseUrl: 'https://example.test/2' },
      ],
    },
  ];

  const options = buildVenueDateOptions(sessions as never);
  const laterDay = options.availableDates.find((iso) => iso > (options.smartDate || ''));
  assert.ok(laterDay);

  const groups = buildVenueProgramGroups(sessions as never, laterDay!, options.smartDate);
  assert.ok(groups.some((group) => group.hasSlotsOnSelectedDate));
});
