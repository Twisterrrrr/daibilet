import test from 'node:test';
import assert from 'node:assert/strict';
import { appendAdminEventPageEventsBatch, eventPageCandidateSlug, readPublicEventPageRouteBySlug, resolvePublicEventPageEventIds } from './event-pages.js';

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

test('EventPage batch append chunks large inserts and safely accepts a repeated request', async () => {
  const requestedIds = Array.from({ length: 501 }, (_, index) => `evt-${index + 1}`);
  const links = new Map();
  const insertChunkSizes = [];
  let revisionCount = 0;
  const page = { id: 'page-1', slug: 'series', status: 'DRAFT', publishedAt: null, isIndexable: false };
  const db = {
    async transaction(callback) {
      return callback({
        async query(sql, params = []) {
          if (/SELECT \* FROM "EventPage" WHERE id = \$1 FOR UPDATE/.test(sql)) return { rows: [page] };
          if (/FROM "Event" event[\s\S]*WHERE event\.id = ANY/.test(sql)) {
            return { rows: params[0].map((id) => ({ id, title: `Title ${id}`, slug: id })) };
          }
          if (/SELECT "eventId", "eventPageId"[\s\S]*FROM "EventPageEvent"/.test(sql)) {
            return { rows: params[0].flatMap((id) => links.has(id) ? [{ eventId: id, eventPageId: links.get(id) }] : []) };
          }
          if (/SELECT count\(\*\)::int AS "eventCount", COALESCE\(max\(position\)/.test(sql)) {
            const positions = [...links.keys()].map((_, index) => index);
            return { rows: [{ eventCount: links.size, maxPosition: positions.length ? Math.max(...positions) : -1 }] };
          }
          if (/SELECT count\(\*\)::int AS "eventCount" FROM "EventPageEvent"/.test(sql)) {
            return { rows: [{ eventCount: links.size }] };
          }
          if (/INSERT INTO "EventPageEvent"/.test(sql)) {
            const rowCount = params.length / 6;
            insertChunkSizes.push(rowCount);
            for (let index = 0; index < rowCount; index += 1) {
              const base = index * 6;
              links.set(params[base + 2], params[base + 1]);
            }
            return { rows: [] };
          }
          if (/UPDATE "EventPage" SET "updatedAt"/.test(sql)) return { rows: [] };
          if (/SELECT "eventId", position, role FROM "EventPageEvent"/.test(sql)) {
            return { rows: [...links.keys()].map((eventId, position) => ({ eventId, position, role: position ? 'PURCHASE_OPTION' : 'PRIMARY' })) };
          }
          if (/SELECT path, kind, source, "createdAt" FROM "EventPageRoute"/.test(sql)) return { rows: [] };
          if (/SELECT "tourGroupId" FROM "EventPage"/.test(sql)) return { rows: [{ tourGroupId: null }] };
          if (/SELECT COALESCE\(MAX\(version\), 0\) \+ 1 AS version/.test(sql)) return { rows: [{ version: ++revisionCount }] };
          if (/INSERT INTO "EventPageRevision"/.test(sql)) return { rows: [] };
          throw new Error(`Unexpected query in test: ${sql}`);
        },
      });
    },
  };

  const first = await appendAdminEventPageEventsBatch(db, 'page-1', { eventIds: requestedIds });
  assert.equal(first.addedCount, 501);
  assert.equal(first.eventCount, 501);
  assert.deepEqual(insertChunkSizes, [500, 1]);
  assert.equal(links.get('evt-1'), 'page-1');

  const second = await appendAdminEventPageEventsBatch(db, 'page-1', { eventIds: requestedIds });
  assert.equal(second.addedCount, 0);
  assert.equal(second.alreadyLinkedCount, 501);
  assert.equal(second.eventCount, 501);
  assert.deepEqual(insertChunkSizes, [500, 1]);

  page.status = 'READY';
  page.publishedAt = new Date();
  page.isIndexable = true;
  await assert.rejects(
    appendAdminEventPageEventsBatch(db, 'page-1', { eventIds: ['evt-502'] }),
    /can only be changed before publication/,
  );
  const publishedAddition = await appendAdminEventPageEventsBatch(
    db,
    'page-1',
    { eventIds: ['evt-502'], changeNote: 'Explicit provider parent match' },
    null,
    { allowPublished: true },
  );
  assert.equal(publishedAddition.addedCount, 1);
  assert.equal(publishedAddition.eventCount, 502);
  assert.equal(links.get('evt-502'), 'page-1');
});

test('EventPage batch append rejects duplicate IDs and batches above 5,000', async () => {
  const db = { transaction() { throw new Error('Should reject before opening a transaction'); } };
  await assert.rejects(
    appendAdminEventPageEventsBatch(db, 'page-1', { eventIds: ['evt-1', 'evt-1'] }),
    /unique within the batch/,
  );
  await assert.rejects(
    appendAdminEventPageEventsBatch(db, 'page-1', { eventIds: Array.from({ length: 5001 }, (_, index) => `evt-${index}`) }),
    /1-5000 Event ids/,
  );
});
