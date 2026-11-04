import test from 'node:test';
import assert from 'node:assert/strict';
import { eventPageCandidateSlug, readPublicEventPageRouteBySlug, resolvePublicEventPageEventIds } from './event-pages.js';

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
        id: 'page-1', slug: 'stable-show-perm', status: 'DRAFT', isIndexable: false,
        publishedAt: null, eventIds: ['evt-1'], publicEventId: 'evt-1', eventStatus: 'READY',
      }] };
    },
  };
  assert.deepEqual(await readPublicEventPageRouteBySlug(db, 'Stable-Show-Perm'), {
    id: 'page-1', slug: 'stable-show-perm', eventId: 'evt-1', eventIds: ['evt-1'], status: 'DRAFT', published: false, isIndexable: false,
  });
});

test('public stable route selects a visible event when an earlier linked slot is hidden', async () => {
  const db = {
    async query() {
      return { rows: [{
        id: 'page-1', slug: 'stable-show-perm', status: 'DRAFT', isIndexable: false,
        publishedAt: null, eventIds: ['evt-hidden', 'evt-live'], publicEventId: 'evt-live', eventStatus: 'READY',
      }] };
    },
  };
  assert.deepEqual(await readPublicEventPageRouteBySlug(db, 'stable-show-perm'), {
    id: 'page-1', slug: 'stable-show-perm', eventId: 'evt-live', eventIds: ['evt-hidden', 'evt-live'], status: 'DRAFT', published: false, isIndexable: false,
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

test('stable EventPage expands only matching product siblings with one owner and one target page', async () => {
  let call = 0;
  const db = {
    async query(sql) {
      call += 1;
      if (call === 1) {
        assert.match(sql, /event_provider_metadata/);
        return { rows: [{
          eventId: 'slot-1', title: '25.11.2026 — River Jazz', cityId: 'moscow',
          sourceId: 'tc', metaExternalId: 'parent-1', externalId: 'slot-1-external', metaCount: 1,
          organizerId: 'organizer-1', sellerId: 'seller-1',
        }] };
      }
      assert.match(sql, /jsonb_to_recordset/);
      const groupKey = JSON.stringify(['tc', 'parent-1', 'moscow', 'river jazz']);
      return { rows: [
        { groupKey, id: 'slot-1', title: '25.11.2026 — River Jazz', status: 'READY', venueId: 'pier-a', linkedPageId: 'page-1', organizerId: 'organizer-1', sellerId: 'seller-1', isSaleable: true },
        { groupKey, id: 'slot-2', title: '26.11.2026 — River Jazz', status: 'READY', venueId: 'pier-b', linkedPageId: null, organizerId: 'organizer-1', sellerId: 'seller-1', isSaleable: true },
        { groupKey, id: 'other-show', title: 'Christmas Jazz', status: 'READY', venueId: 'pier-c', linkedPageId: 'page-2', organizerId: 'organizer-1', sellerId: 'seller-1', isSaleable: true },
      ] };
    },
  };

  assert.deepEqual(await resolvePublicEventPageEventIds(db, 'page-1', ['slot-1']), ['slot-1', 'slot-2']);
  assert.equal(call, 2);
});

test('stable EventPage does not expand product siblings when another EventPage owns part of the group', async () => {
  let call = 0;
  const db = {
    async query() {
      call += 1;
      if (call === 1) return { rows: [{
        eventId: 'slot-1', title: 'River Jazz', cityId: 'moscow', sourceId: 'tc',
        metaExternalId: 'parent-1', externalId: 'slot-1-external', metaCount: 1,
        organizerId: 'organizer-1', sellerId: 'seller-1',
      }] };
      const groupKey = JSON.stringify(['tc', 'parent-1', 'moscow', 'river jazz']);
      return { rows: [
        { groupKey, id: 'slot-1', title: 'River Jazz', status: 'READY', venueId: 'pier-a', linkedPageId: 'page-1', organizerId: 'organizer-1', sellerId: 'seller-1', isSaleable: true },
        { groupKey, id: 'slot-2', title: 'River Jazz', status: 'READY', venueId: 'pier-b', linkedPageId: 'page-2', organizerId: 'organizer-1', sellerId: 'seller-1', isSaleable: true },
      ] };
    },
  };
  assert.deepEqual(await resolvePublicEventPageEventIds(db, 'page-1', ['slot-1']), ['slot-1']);
});
