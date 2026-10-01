import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIN_VENUE_EVENTS_FOR_INDEX,
  NON_INDEXABLE_VENUE_TYPES,
  evaluateVenueIndexability,
  robotsForIndexability,
} from '@/lib/hub-indexability';

/**
 * /venues/base shipped as a thin indexable page: 200, self-canonical,
 * `index, follow`, and listed in venues.xml. Its DTO says type `meeting_point`
 * with pageStatus NONE, so it is a pickup address belonging to an excursion
 * rather than a destination. It cleared the bar because a meeting point
 * inherits every event of its parent and MIN_VENUE_EVENTS_FOR_INDEX is 1.
 *
 * Narrowness matters as much as the rule: an over-broad filter would empty
 * venues.xml. Requiring pageStatus === PUBLISHED would have removed all 1391
 * URLs, because editorial has never promoted a single row past CANDIDATE.
 */
test('degenerate venue types are not indexable however many events they inherit', () => {
  const decision = evaluateVenueIndexability({
    events: 999,
    isIndexable: true,
    type: 'meeting_point',
  });
  assert.equal(decision.indexable, false);
  assert.equal(decision.reason, 'non_venue_type');
  assert.deepEqual(robotsForIndexability(decision.indexable), { index: false, follow: true });
});

test('type match is case and whitespace insensitive', () => {
  for (const type of ['MEETING_POINT', ' meeting_point ', 'Meeting_Point']) {
    assert.equal(evaluateVenueIndexability({ events: 5, type }).indexable, false, `type=${type}`);
  }
});

test('real venues keep their indexability and are not affected', () => {
  for (const type of [
    'concert_hall',
    'theater',
    'museum',
    'club_bar_restaurant',
    'art_space',
    'pier',
    'park',
    'temple',
    'bus',
    'monument',
  ]) {
    const decision = evaluateVenueIndexability({
      events: MIN_VENUE_EVENTS_FOR_INDEX,
      isIndexable: true,
      type,
    });
    assert.equal(decision.indexable, true, `type=${type} should stay indexable`);
    assert.equal(decision.reason, 'enough_events');
  }
});

test('a missing type does not change existing behaviour', () => {
  // An undefined type must behave exactly as before the rule existed, otherwise
  // every venue whose DTO omits type would silently drop out of the sitemap.
  assert.deepEqual(
    evaluateVenueIndexability({ events: 3, isIndexable: true }),
    evaluateVenueIndexability({ events: 3, isIndexable: true, type: null }),
  );
  assert.equal(evaluateVenueIndexability({ events: 3, type: undefined }).indexable, true);
  assert.equal(evaluateVenueIndexability({ events: 3, type: 'unknown_future_type' }).indexable, true);
});

test('explicit noindex still wins and thin venues stay out', () => {
  assert.equal(
    evaluateVenueIndexability({ events: 99, isIndexable: false, type: 'museum' }).reason,
    'explicit_noindex',
  );
  assert.equal(evaluateVenueIndexability({ events: 0, type: 'museum' }).reason, 'zero_events');
  assert.equal(evaluateVenueIndexability({ events: 0, type: 'meeting_point' }).reason, 'non_venue_type');
  assert.equal(evaluateVenueIndexability({ events: 3, type: 'museum', detailAvailable: false }).reason, 'detail_unavailable');
});

test('hidden venue stays out while candidate and published statuses retain the existing rule', () => {
  assert.equal(
    evaluateVenueIndexability({ events: 5, type: 'museum', pageStatus: ' hidden ' }).reason,
    'hidden_page',
  );
  for (const pageStatus of ['NONE', 'CANDIDATE', 'PUBLISHED']) {
    assert.equal(
      evaluateVenueIndexability({ events: 5, type: 'museum', pageStatus }).indexable,
      true,
      pageStatus,
    );
  }
});

test('the excluded set stays small and explicit', () => {
  assert.deepEqual([...NON_INDEXABLE_VENUE_TYPES].sort(), ['meeting_point', 'online', 'other']);
});
