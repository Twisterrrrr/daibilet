import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupeCrossSourceCatalogSessions,
  regroupMappedPublicCatalogSessions,
  sessionHasCoverImage,
} from './public-catalog-grouping.js';
import type { PublicSessionDto } from './types/public.js';

function session(overrides: Partial<PublicSessionDto>): PublicSessionDto {
  return {
    id: 'event-1',
    slug: 'test',
    sourceSlug: 'test',
    title: 'Тест',
    city: 'Санкт-Петербург',
    destination: 'Санкт-Петербург',
    destinationType: 'city',
    venue: 'Причал 1',
    category: 'Экскурсии',
    tags: [],
    startsAt: '2026-08-01T12:00:00.000Z',
    dateLabel: '1 авг.',
    timeLabel: '15:00',
    timeBucket: 'day',
    priceFrom: 1000,
    imageUrl: 'https://cdn.example/event.jpg',
    ...overrides,
  } as PublicSessionDto;
}

test('sessionHasCoverImage rejects city placeholders', () => {
  assert.equal(sessionHasCoverImage({ imageUrl: '/images/cities/moscow.png' }), false);
  assert.equal(sessionHasCoverImage({ imageUrl: 'https://cdn.example/cover.jpg' }), true);
});

test('sessionHasCoverImage rejects sharp evt-auto category gradients', () => {
  assert.equal(
    sessionHasCoverImage({ imageUrl: '/images/events/generated/evt-auto-34e6ebcbf9bd.jpg' }),
    false,
  );
  assert.equal(
    sessionHasCoverImage({ imageUrl: '/images/venues/generated/venue-auto-abc123.jpg' }),
    false,
  );
});

test('regroupMappedPublicCatalogSessions merges slots by groupKey', () => {
  const grouped = regroupMappedPublicCatalogSessions([
    session({
      id: 'a',
      groupKey: 'g1',
      groupEventIds: ['a'],
      startsAt: '2026-08-02T12:00:00.000Z',
    }),
    session({
      id: 'b',
      groupKey: 'g1',
      groupEventIds: ['b'],
      startsAt: '2026-08-01T12:00:00.000Z',
    }),
  ]);
  assert.equal(grouped.length, 1);
  const merged = grouped[0];
  assert.ok(merged);
  assert.deepEqual(merged.groupEventIds, ['a', 'b']);
});

test('dedupeCrossSourceCatalogSessions leaves non-widget sessions untouched', () => {
  const input = [session({ id: 'only' })];
  assert.deepEqual(dedupeCrossSourceCatalogSessions(input), input);
});
