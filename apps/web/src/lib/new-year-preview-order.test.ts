import assert from 'node:assert/strict';
import test from 'node:test';

import { appendUniqueNewYearPreviewEvents, getNewYearPreviewPage, sortNewYearPreviewEvents } from './new-year-preview-order';
import { parseNewYearPreviewQuery } from './new-year-preview-query';

test('sort order is deterministic for equal dates and prices', () => {
  const events = [
    { id: 'z', groupKey: 'z', priceFrom: 900, upcomingSlots: [{ startsAt: '2026-12-20T10:00:00+03:00' }] },
    { id: 'a', groupKey: 'a', priceFrom: 900, upcomingSlots: [{ startsAt: '2026-12-20T10:00:00+03:00' }] },
    { id: 'b', groupKey: 'b', priceFrom: 1500, upcomingSlots: [{ startsAt: '2026-12-20T10:00:00+03:00' }] },
  ];

  assert.deepEqual(sortNewYearPreviewEvents(events, 'date').map((event) => event.id), ['a', 'b', 'z']);
  assert.deepEqual(sortNewYearPreviewEvents(events, 'price').map((event) => event.id), ['a', 'z', 'b']);
  assert.deepEqual(sortNewYearPreviewEvents(events, 'price-desc').map((event) => event.id), ['b', 'a', 'z']);
});

test('pagination advances by the number of records consumed and reports the true remainder', () => {
  const records = Array.from({ length: 67 }, (_, index) => index);
  const first = getNewYearPreviewPage(records, records.length, 0, 30);
  const second = getNewYearPreviewPage(records, records.length, first.nextOffset, 30);
  const last = getNewYearPreviewPage(records, records.length, second.nextOffset, 30);

  assert.equal(first.items.length, 30);
  assert.equal(first.nextOffset, 30);
  assert.equal(first.hasMore, true);
  assert.equal(second.nextOffset, 60);
  assert.equal(last.items.length, 7);
  assert.equal(last.nextOffset, 67);
  assert.equal(last.hasMore, false);
});

test('append keeps order and removes duplicate event-day groups', () => {
  const current = [{ id: 'event-1', groupKey: 'program:1:date:2026-12-19' }];
  const next = [
    { id: 'event-1-copy', groupKey: 'program:1:date:2026-12-19' },
    { id: 'event-2', groupKey: 'program:2:date:2026-12-20' },
  ];

  assert.deepEqual(appendUniqueNewYearPreviewEvents(current, next).map((event) => event.id), ['event-1', 'event-2']);
});

test('query parser defaults pagination to the first page and rejects invalid date, sort, and offset values', () => {
  assert.equal(parseNewYearPreviewQuery(new URLSearchParams('city=Казань&date=dec31')).offset, 0);
  assert.equal(parseNewYearPreviewQuery(new URLSearchParams('offset=30&sort=price')).offset, 30);
  assert.throws(() => parseNewYearPreviewQuery(new URLSearchParams('date=not-a-date')));
  assert.throws(() => parseNewYearPreviewQuery(new URLSearchParams('sort=random')));
  assert.throws(() => parseNewYearPreviewQuery(new URLSearchParams('offset=-5')));
  assert.throws(() => parseNewYearPreviewQuery(new URLSearchParams('date=2026-02-30')));
});
