import test from 'node:test';
import assert from 'node:assert/strict';
import { eventPageCandidateSlug, readPublicEventPageRouteBySlug } from './event-pages.js';

test('EventPage candidate slug drops a matching provider identity token', () => {
  assert.equal(
    eventPageCandidateSlug('tc-6acfa3c8764820bc2674b31a-organnyi-triumf', 'evt_6acfa3c8764820bc2674b31a'),
    'organnyi-triumf',
  );
  assert.equal(
    eventPageCandidateSlug('organnyi-triumf-6acfa3c8764820bc2674b31a', 'evt_6acfa3c8764820bc2674b31a'),
    'organnyi-triumf',
  );
  assert.equal(eventPageCandidateSlug('artist-show-12345', 'evt_tep_12345'), 'artist-show');
  assert.equal(eventPageCandidateSlug('artist-show-12345', 'evt_tep_67890'), 'artist-show-12345');
});

test('public stable route returns identity and keeps draft page non-indexable', async () => {
  const db = {
    async query(_sql, params) {
      assert.deepEqual(params, ['stable-show-perm']);
      return { rows: [{
        slug: 'stable-show-perm', status: 'DRAFT', isIndexable: false,
        publishedAt: null, eventIds: ['evt-1'], publicEventId: 'evt-1', eventStatus: 'READY',
      }] };
    },
  };
  assert.deepEqual(await readPublicEventPageRouteBySlug(db, 'Stable-Show-Perm'), {
    slug: 'stable-show-perm', eventId: 'evt-1', eventIds: ['evt-1'], status: 'DRAFT', published: false, isIndexable: false,
  });
});

test('public stable route selects a visible event when an earlier linked slot is hidden', async () => {
  const db = {
    async query() {
      return { rows: [{
        slug: 'stable-show-perm', status: 'DRAFT', isIndexable: false,
        publishedAt: null, eventIds: ['evt-hidden', 'evt-live'], publicEventId: 'evt-live', eventStatus: 'READY',
      }] };
    },
  };
  assert.deepEqual(await readPublicEventPageRouteBySlug(db, 'stable-show-perm'), {
    slug: 'stable-show-perm', eventId: 'evt-live', eventIds: ['evt-hidden', 'evt-live'], status: 'DRAFT', published: false, isIndexable: false,
  });
});

test('public stable route does not expose a draft linked only to hidden events', async () => {
  const db = {
    async query() {
      return { rows: [{
        slug: 'stable-show-perm', status: 'DRAFT', isIndexable: false,
        publishedAt: null, eventIds: ['evt-hidden'], publicEventId: null, eventStatus: null,
      }] };
    },
  };
  assert.equal(await readPublicEventPageRouteBySlug(db, 'stable-show-perm'), null);
});

test('public stable route returns null before EventPage migration is present', async () => {
  const db = { async query() { throw Object.assign(new Error('relation does not exist'), { code: '42P01' }); } };
  assert.equal(await readPublicEventPageRouteBySlug(db, 'stable-show-perm'), null);
});
