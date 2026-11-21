import assert from 'node:assert/strict';
import test from 'node:test';

import { collectScheduleTimeChips } from './landing-time-chips.ts';

test('collectScheduleTimeChips: same clock time from different dates collapses to one chip', () => {
  const chips = collectScheduleTimeChips([
    {
      startsAt: '2026-10-11T18:30:00+03:00',
      timeLabel: '18:30',
      upcomingSlots: [
        { startsAt: '2026-10-11T18:30:00+03:00', timeLabel: '18:30' },
        { startsAt: '2026-10-12T18:30:00+03:00', timeLabel: '18:30' },
        { startsAt: '2026-10-12T18:30:00+03:00', timeLabel: '18:30' },
      ],
    },
    { startsAt: '2026-10-13T18:30:00+03:00', timeLabel: '18:30' },
    { startsAt: '2026-10-14T18:30:00+03:00', timeLabel: '18:30' },
  ]);
  assert.deepEqual(
    chips.map((chip) => chip.label),
    ['18:30'],
  );
});

test('collectScheduleTimeChips: slots with different times are merged into one sorted row', () => {
  const chips = collectScheduleTimeChips([
    {
      startsAt: '2026-10-24T11:00:00+03:00',
      timeLabel: '11:00',
      upcomingSlots: [
        { startsAt: '2026-10-24T11:00:00+03:00', timeLabel: '11:00' },
        { startsAt: '2026-10-24T12:30:00+03:00', timeLabel: '12:30' },
        { startsAt: '2026-10-25T10:30:00+03:00', timeLabel: '10:30' },
      ],
    },
  ]);
  assert.deepEqual(
    chips.map((chip) => chip.label),
    ['10:30', '11:00', '12:30'],
  );
});

test('collectScheduleTimeChips: duplicated time pairs across dates dedupe by time label', () => {
  const chips = collectScheduleTimeChips([
    {
      startsAt: '2026-10-26T10:00:00+03:00',
      timeLabel: '10:00',
      upcomingSlots: [
        { startsAt: '2026-10-26T10:00:00+03:00', timeLabel: '10:00' },
        { startsAt: '2026-10-26T12:00:00+03:00', timeLabel: '12:00' },
        { startsAt: '2026-11-02T10:00:00+03:00', timeLabel: '10:00' },
        { startsAt: '2026-11-02T12:00:00+03:00', timeLabel: '12:00' },
      ],
    },
  ]);
  assert.deepEqual(
    chips.map((chip) => chip.label),
    ['10:00', '12:00'],
  );
});

test('collectScheduleTimeChips: caps at 8 earliest distinct times and keeps keys unique', () => {
  const labels = ['09:00', '08:00', '07:00', '06:00', '05:00', '04:00', '03:00', '02:00', '01:00', '10:00', '11:00', '12:00'];
  const chips = collectScheduleTimeChips([
    {
      startsAt: '2026-11-10T09:00:00+03:00',
      timeLabel: '09:00',
      upcomingSlots: labels.map((timeLabel) => ({
        startsAt: `2026-11-10T${timeLabel}:00+03:00`,
        timeLabel,
      })),
    },
  ]);
  assert.deepEqual(
    chips.map((chip) => chip.label),
    ['01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00'],
  );
  assert.equal(new Set(chips.map((chip) => chip.key)).size, chips.length);
});

test('collectScheduleTimeChips: labels without a clock time dedupe and go last', () => {
  const chips = collectScheduleTimeChips([
    { startsAt: null, timeLabel: 'Гибкий график' },
    { startsAt: null, timeLabel: 'Гибкий график' },
    { startsAt: '2026-11-05T19:30:00+03:00', timeLabel: '19:30' },
    { startsAt: null, timeLabel: 'Время уточняется' },
  ]);
  assert.deepEqual(
    chips.map((chip) => chip.label),
    ['19:30', 'Гибкий график', 'Время уточняется'],
  );
});