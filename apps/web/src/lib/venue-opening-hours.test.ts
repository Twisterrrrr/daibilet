import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPEN_DATE_HOURS_HOLIDAY_NOTE,
  OPEN_DATE_HOURS_UNKNOWN_NOTE,
  __editorialOpeningHoursCountForTests,
  formatVenueOpeningHoursLines,
  resolveTicketOpeningHours,
  resolveVenueOpenNowStatus,
  resolveVenueOpeningHours,
} from './venue-opening-hours.ts';

test('resolveVenueOpeningHours: butman club has curated evening hours', () => {
  const hours = resolveVenueOpeningHours('dzhaz-klub-igorya-butmana');
  assert.ok(hours);
  assert.ok(hours!.lines.some((line) => /18:00-00:00/.test(line)));
  assert.equal(
    resolveVenueOpeningHours('dzhaz-klub-igorya-butmana-spb')?.lines[0],
    hours!.lines[0],
  );
});

test('resolveVenueOpeningHours: known seed museums', () => {
  const hermitage = resolveVenueOpeningHours('ermitazh');
  assert.ok(hermitage);
  assert.ok(hermitage!.lines.some((line) => /11:00-18:00/.test(line)));
  assert.ok(hermitage!.lines.some((line) => /11:00-20:00/.test(line)));
  assert.ok(hermitage!.lines.some((line) => /Пн - выходной/.test(line)));
  assert.ok(resolveVenueOpeningHours('moscow-tret-yakovskaya-galereya'));
  assert.ok(resolveVenueOpeningHours('erarta')!.lines[0]!.includes('10:00-22:00'));
  assert.ok(resolveVenueOpeningHours('gmii-im-pushkina-672f34b6ebf4808956f1474a'));
  assert.ok(
    resolveVenueOpeningHours('muzei-sovremennogo-iskusstva-permm-5e4423fcaadb42a1889abee3'),
  );
  assert.ok(resolveVenueOpeningHours('saint-petersburg-russkiy-muzey'));
  assert.ok(resolveVenueOpeningHours('moscow-muzey-garazh'));
  assert.equal(__editorialOpeningHoursCountForTests() >= 130, true);
});

test('resolveVenueOpeningHours: unknown slug stays null (no invented hours)', () => {
  assert.equal(resolveVenueOpeningHours('unknown-gallery-xyz'), null);
  assert.equal(resolveVenueOpeningHours(''), null);
});

test('resolveTicketOpeningHours prefers order text over editorial', () => {
  assert.equal(
    resolveTicketOpeningHours({
      venueSlug: 'ermitazh',
      venueOpeningHours: 'Пн-Вс: 10:00-20:00',
    }),
    'Пн-Вс: 10:00-20:00',
  );
  const fromSlug = resolveTicketOpeningHours({ venueSlug: 'erarta', venueOpeningHours: null });
  assert.ok(fromSlug && fromSlug.includes('10:00-22:00'));
});

test('format + copy constants use hyphen only', () => {
  const text = formatVenueOpeningHoursLines(resolveVenueOpeningHours('ermitazh'));
  assert.ok(text);
  assert.equal(text!.includes('—'), false);
  assert.equal(text!.includes('–'), false);
  assert.equal(OPEN_DATE_HOURS_HOLIDAY_NOTE.includes('—'), false);
  assert.equal(OPEN_DATE_HOURS_UNKNOWN_NOTE.includes('—'), false);
});

test('resolveVenueOpenNowStatus: hermitage weekday hours', () => {
  const lines = resolveVenueOpeningHours('ermitazh')!.lines;
  // Wednesday 2026-08-12 14:00 MSK - open 11-18
  const wedOpen = resolveVenueOpenNowStatus({
    lines,
    timeZone: 'Europe/Moscow',
    now: new Date('2026-08-12T11:00:00.000Z'), // 14:00 MSK
  });
  assert.equal(wedOpen, 'open');
  // Monday closed
  const mon = resolveVenueOpenNowStatus({
    lines,
    timeZone: 'Europe/Moscow',
    now: new Date('2026-08-10T12:00:00.000Z'),
  });
  assert.equal(mon, 'closed');
  // Tuesday evening after 20:00 closed
  const tueLate = resolveVenueOpenNowStatus({
    lines,
    timeZone: 'Europe/Moscow',
    now: new Date('2026-08-11T18:30:00.000Z'), // 21:30 MSK
  });
  assert.equal(tueLate, 'closed');
});
