import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchesCatalogDayRange,
  sessionMatchesCatalogDayRange,
  sessionMatchesCatalogPresetDate,
} from './public-catalog-date-filter.js';
import type { PublicSessionDto } from './types/public.js';

function baseSession(overrides: Partial<PublicSessionDto> = {}): PublicSessionDto {
  return {
    id: 'e1',
    title: 'Test',
    city: 'Москва',
    destination: 'Москва',
    destinationType: 'city',
    venue: 'Зал',
    venueKind: 'hall',
    category: 'Концерты',
    tags: [],
    startsAt: '2026-08-27T16:00:00.000Z',
    dateLabel: '27 авг',
    timeLabel: '19:00',
    timeBucket: 'evening',
    ...overrides,
  } as PublicSessionDto;
}

test('matchesCatalogDayRange: evening event matches same ISO day', () => {
  assert.equal(matchesCatalogDayRange('2026-08-27T16:00:00.000Z', '2026-08-27', '2026-08-27'), true);
});

test('matchesCatalogDayRange: rejects wrong day', () => {
  assert.equal(matchesCatalogDayRange('2026-08-27T16:00:00.000Z', '2026-08-28', '2026-08-28'), false);
});

test('sessionMatchesCatalogDayRange: grouped slot on picked day counts', () => {
  const session = baseSession({
    startsAt: '2026-08-26T10:00:00.000Z',
    upcomingSlots: [{ id: 's2', eventId: 'e1', startsAt: '2026-08-27T18:00:00.000Z', dateLabel: '', timeLabel: '' }],
  });
  assert.equal(sessionMatchesCatalogDayRange(session, '2026-08-27', '2026-08-27'), true);
});

test('sessionMatchesCatalogDayRange: open-date excluded on explicit day', () => {
  const session = baseSession({ kind: 'OPEN_DATE', sourceStatus: 'open_date', startsAt: null as unknown as string });
  assert.equal(sessionMatchesCatalogDayRange(session, '2026-08-27', '2026-08-27'), false);
});

test('sessionMatchesCatalogPresetDate: today preset', () => {
  const todayIso = new Date();
  const y = todayIso.getFullYear();
  const m = String(todayIso.getMonth() + 1).padStart(2, '0');
  const d = String(todayIso.getDate()).padStart(2, '0');
  const startsAt = `${y}-${m}-${d}T15:00:00.000Z`;
  assert.equal(sessionMatchesCatalogPresetDate(baseSession({ startsAt }), 'today'), true);
});
