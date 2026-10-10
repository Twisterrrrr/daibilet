import assert from 'node:assert/strict';
import test from 'node:test';
import { dedupePublicOffers, preferNamedTicketOffers } from './public-offers.js';
import { formatDate, normalizeStartsAt, timeBucket } from './public-datetime.js';

test('preferNamedTicketOffers drops generic widget titles when named exist', () => {
  const rows = [
    { title: 'TicketsCloud Widget', priceRub: 1000, sourceCode: 'tc' },
    { title: 'Взрослый', priceRub: 1200, sourceCode: 'tc' },
  ];
  const preferred = preferNamedTicketOffers(rows);
  assert.equal(preferred.length, 1);
  assert.equal(preferred[0]?.title, 'Взрослый');
});

test('dedupePublicOffers keeps lowest sortOrder', () => {
  const rows = [
    { title: 'Взрослый', priceRub: 1000, sourceCode: 'tc', sortOrder: 5 },
    { title: 'Взрослый', priceRub: 1000, sourceCode: 'tc', sortOrder: 1 },
  ];
  const deduped = dedupePublicOffers(rows);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.sortOrder, 1);
});

test('normalizeStartsAt and timeBucket stay stable', () => {
  const iso = '2026-07-30T12:00:00.000Z';
  assert.equal(normalizeStartsAt(iso), iso);
  assert.equal(timeBucket(iso, 'Europe/Moscow'), 'day');
  assert.ok(formatDate(iso, 'Europe/Moscow').length > 0);
});
