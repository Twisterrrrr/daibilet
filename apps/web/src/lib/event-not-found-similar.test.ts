import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSimilarEvents } from './event-not-found-similar.ts';

function item(id: string) {
  return {
    id,
    title: `Event ${id}`,
    city: 'Москва',
    destination: 'Москва',
    destinationType: 'city' as const,
    venue: 'Площадка',
    venueKind: 'venue',
    category: 'concerts',
    tags: [],
    startsAt: '2026-11-01T19:00:00.000Z',
    dateLabel: '1 ноября',
    timeLabel: '19:00',
    timeBucket: 'evening' as const,
  };
}

test('event 404 prefers items over legacy sessions', () => {
  const items = [item('a')];
  const sessions = [item('b')];
  assert.deepEqual(
    resolveSimilarEvents({ items, sessions }),
    items,
  );
});

test('event 404 falls back to sessions when items missing', () => {
  const sessions = [item('b')];
  assert.deepEqual(resolveSimilarEvents({ sessions }), sessions);
  assert.deepEqual(resolveSimilarEvents(null), []);
});
