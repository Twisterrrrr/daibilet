import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectDisplaySlotLabels,
  collectDisplaySlotPreview,
  formatCardScheduleLine,
  formatCatalogSlotChipLabel,
  formatMagazineCatalogDate,
  formatShowcaseSessionDate,
  formatShowcaseSessionDateCompact,
} from './event-card-meta.ts';
import type { PublicSessionDto } from '@daibilet/contracts/public';

function session(partial: Partial<PublicSessionDto> & { startsAt?: string }): PublicSessionDto {
  return {
    id: 'evt-1',
    slug: 'test-event',
    title: 'Тест',
    city: 'Москва',
    destination: 'Москва',
    destinationType: 'city',
    venue: '',
    category: '',
    tags: [],
    startsAt: '2026-07-25T04:15:00Z',
    dateLabel: '',
    timeLabel: '',
    timeBucket: 'day',
    ...partial,
  } as PublicSessionDto;
}

test('formatShowcaseSessionDate: human mask with full month and weekday', () => {
  const label = formatShowcaseSessionDate(session({ startsAt: '2026-07-25T04:15:00Z' }));
  assert.equal(label, '25 июля, суббота в 07:15');
});

test('formatShowcaseSessionDateCompact: day month time without weekday', () => {
  const label = formatShowcaseSessionDateCompact(session({ startsAt: '2026-07-25T04:15:00Z' }));
  assert.equal(label, '25 июля в 07:15');
});

test('formatMagazineCatalogDate: uppercase day month + time, no сегодня', () => {
  const label = formatMagazineCatalogDate(session({ startsAt: '2026-08-26T16:00:00Z' }));
  assert.match(label, /^26 АВГУСТА, \d{2}:\d{2}$/);
  assert.equal(label.includes('сегодня'), false);
});

test('formatShowcaseSessionDate: open-date label without clock', () => {
  const label = formatShowcaseSessionDate(
    session({
      startsAt: '2026-07-25T04:15:00Z',
      dateLabel: 'Открытая дата',
      kind: 'OPEN_DATE',
    } as Partial<PublicSessionDto>),
  );
  assert.equal(label, 'Открытая дата');
});

test('formatShowcaseSessionDate: no abbreviated system mask', () => {
  const label = formatShowcaseSessionDate(session({ startsAt: '2026-07-25T04:15:00Z' }));
  assert.ok(!label.includes('июл.'));
  assert.ok(!label.includes('сб'));
  assert.ok(!label.includes('·'));
});

test('formatCatalogSlotChipLabel: day short month time without weekday', () => {
  const label = formatCatalogSlotChipLabel(
    session({ startsAt: '2026-07-30T08:20:00Z' }),
    {
      startsAt: '2026-07-30T10:20:00Z',
      dateLabel: 'чт, 30 июл.',
      timeLabel: '13:20',
    },
  );
  assert.equal(label, '30 июл, 13:20');
  assert.ok(!label.includes('чт'));
  assert.ok(!label.includes('.'));
});

/**
 * 29.09. The slot tests below used to pin July/August 2026 dates.
 * `collectUpcomingSlotRows` in event-card-meta.ts drops every slot that starts in
 * the past, which is correct - a card must not advertise a slot that already
 * happened. Once the wall clock passed those dates the filter emptied the array,
 * so the tests failed with no code change: "empty when only primary slot" passed
 * for the wrong reason, and the other two failed expecting 2 and 3 labels.
 *
 * Rebuilt relative to now so they keep describing an upcoming run of slots.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** An ISO instant `daysFromNow` days ahead, at a fixed UTC hour. */
function isoDaysFromNow(daysFromNow: number, hourUtc = 16): string {
  const base = new Date();
  base.setUTCHours(hourUtc, 0, 0, 0);
  return new Date(base.getTime() + daysFromNow * DAY_MS).toISOString();
}

test('collectDisplaySlotLabels: empty when only primary slot', () => {
  const labels = collectDisplaySlotLabels(
    session({
      startsAt: isoDaysFromNow(1),
      upcomingSlots: [
        {
          eventId: 'evt-1',
          startsAt: isoDaysFromNow(1),
          timeLabel: '19:30',
        },
      ],
    }),
  );
  // The only slot is the primary one, so nothing is left to advertise.
  assert.deepEqual(labels, []);
});

test('collectDisplaySlotLabels: excludes primary, compact format up to 4', () => {
  const labels = collectDisplaySlotLabels(
    session({
      startsAt: isoDaysFromNow(1),
      upcomingSlots: [
        {
          eventId: 'evt-1',
          startsAt: isoDaysFromNow(1),
          timeLabel: '19:30',
        },
        {
          eventId: 'evt-2',
          startsAt: isoDaysFromNow(2),
          timeLabel: '19:30',
        },
        {
          eventId: 'evt-3',
          startsAt: isoDaysFromNow(3),
          timeLabel: '19:30',
        },
      ],
    }),
  );
  // Primary excluded, the two later slots survive the "starts in the past" filter.
  assert.equal(labels.length, 2);
  // Compact chip shape: `D month, HH:MM` - no weekday, no trailing dot. The clock
  // is deliberately not asserted to a fixed value: formatCatalogSlotChipLabel
  // derives it from startsAt in the city timezone, so it moves with the fixture.
  for (const label of labels) {
    assert.match(label, /^\d{1,2} \p{L}{3}, \d{2}:\d{2}$/u);
  }
});

test('collectDisplaySlotPreview: moreCount after limit', () => {
  // Starts at day+2, not day+1: day+1 is the primary start, and
  // collectAllDisplaySlotLabels drops any slot that repeats the primary, which
  // would silently shrink the pool from 6 to 5 and make moreCount come out 2.
  const slots = Array.from({ length: 6 }, (_, index) => ({
    eventId: `evt-${index + 2}`,
    startsAt: isoDaysFromNow(index + 2),
    timeLabel: '19:30',
  }));
  const preview = collectDisplaySlotPreview(
    session({
      startsAt: isoDaysFromNow(1),
      upcomingSlots: [
        {
          eventId: 'evt-1',
          startsAt: isoDaysFromNow(1),
          timeLabel: '19:30',
        },
        ...slots,
      ],
    }),
    3,
  );
  assert.equal(preview.labels.length, 3);
  // 7 slots total, one is the primary, 3 shown, 3 left over.
  assert.equal(preview.moreCount, 3);
  for (const label of preview.labels) {
    assert.match(label, /^\d{1,2} \p{L}{3}, \d{2}:\d{2}$/u);
  }
});

test('formatCardScheduleLine drops Сегодня when cover already has it', () => {
  const startsAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  const label = formatCardScheduleLine(session({ startsAt }));
  assert.ok(label);
  assert.ok(!/сегодня/i.test(label));
});

