import { describe, expect, it } from 'vitest';

import {
  buildVenueDateOptions,
  buildVenueDateRailChips,
  buildVenueProgramGroups,
} from './venue-program';

describe('venue-program date rail', () => {
  it('lists every upcoming day from expanded upcomingSlots, not only the primary startsAt', () => {
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
    expect(options.availableDates.length).toBeGreaterThanOrEqual(3);

    const chips = buildVenueDateRailChips(options.availableDates);
    const dayChips = chips.filter((chip) => chip.kind === 'day');
    expect(dayChips.length).toBeGreaterThanOrEqual(3);
    expect(dayChips.map((chip) => (chip.kind === 'day' ? chip.iso : '')).filter(Boolean)).toEqual(
      options.availableDates.slice(0, 21),
    );
  });

  it('keeps groups for a later selected day when slots exist on that day', () => {
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
    expect(laterDay).toBeTruthy();

    const groups = buildVenueProgramGroups(sessions as never, laterDay!, options.smartDate);
    expect(groups.some((group) => group.hasSlotsOnSelectedDate)).toBe(true);
  });
});
