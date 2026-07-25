import assert from 'node:assert/strict';
import test from 'node:test';

import {
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
