import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectDisplaySlotLabels,
  collectDisplaySlotPreview,
  formatCardScheduleLine,
  formatCatalogSlotChipLabel,
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

test('collectDisplaySlotLabels: empty when only primary slot', () => {
  const labels = collectDisplaySlotLabels(
    session({
      startsAt: '2026-07-30T16:30:00Z',
      upcomingSlots: [
        {
          eventId: 'evt-1',
          startsAt: '2026-07-30T16:30:00Z',
          dateLabel: 'чт, 30 июл.',
          timeLabel: '19:30',
        },
      ],
    }),
  );
  assert.deepEqual(labels, []);
});

test('collectDisplaySlotLabels: excludes primary, compact format up to 4', () => {
  const labels = collectDisplaySlotLabels(
    session({
      startsAt: '2026-07-30T16:30:00Z',
      upcomingSlots: [
        {
          eventId: 'evt-1',
          startsAt: '2026-07-30T16:30:00Z',
          dateLabel: 'чт, 30 июл.',
          timeLabel: '19:30',
        },
        {
          eventId: 'evt-2',
          startsAt: '2026-07-31T16:30:00Z',
          dateLabel: 'пт, 31 июл.',
          timeLabel: '19:30',
        },
        {
          eventId: 'evt-3',
          startsAt: '2026-08-01T16:30:00Z',
          dateLabel: 'сб, 1 авг.',
          timeLabel: '19:30',
        },
      ],
    }),
  );
  assert.deepEqual(labels, ['31 июл, 19:30', '1 авг, 19:30']);
});

test('collectDisplaySlotPreview: moreCount after limit', () => {
  const slots = Array.from({ length: 6 }, (_, index) => ({
    eventId: `evt-${index + 2}`,
    startsAt: `2026-08-0${index + 1}T16:30:00Z`,
    dateLabel: `${index + 1} авг.`,
    timeLabel: '19:30',
  }));
  const preview = collectDisplaySlotPreview(
    session({
      startsAt: '2026-07-30T16:30:00Z',
      upcomingSlots: [
        {
          eventId: 'evt-1',
          startsAt: '2026-07-30T16:30:00Z',
          dateLabel: 'чт, 30 июл.',
          timeLabel: '19:30',
        },
        ...slots,
      ],
    }),
    3,
  );
  assert.equal(preview.labels.length, 3);
  assert.equal(preview.moreCount, 3);
  assert.ok(preview.labels.every((label) => !label.includes('чт') && !label.includes('пт')));
});

test('formatCardScheduleLine drops Сегодня when cover already has it', () => {
  const startsAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  const label = formatCardScheduleLine(session({ startsAt }));
  assert.ok(label);
  assert.ok(!/сегодня/i.test(label));
});

