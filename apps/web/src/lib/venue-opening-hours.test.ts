import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPEN_DATE_HOURS_HOLIDAY_NOTE,
  OPEN_DATE_HOURS_UNKNOWN_NOTE,
  formatVenueOpeningHoursLines,
  resolveTicketOpeningHours,
  resolveVenueOpeningHours,
} from './venue-opening-hours.ts';

test('resolveVenueOpeningHours: known seed museums', () => {
  const hermitage = resolveVenueOpeningHours('ermitazh');
  assert.ok(hermitage);
  assert.ok(hermitage!.lines.some((line) => /11:00-18:00/.test(line)));
  assert.ok(resolveVenueOpeningHours('moscow-tret-yakovskaya-galereya'));
  assert.ok(resolveVenueOpeningHours('erarta')!.lines[0]!.includes('10:00-22:00'));
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
