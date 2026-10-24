import assert from 'node:assert/strict';
import test from 'node:test';
import { PDP_VARIANTS, emptyPdpContent, normalizePdpDocument, readReadyPdpDocument, savePdpDocument } from './pdp-documents.js';

test('all place scenarios and the event scenario have unique section keys', () => {
  assert.ok(Object.keys(PDP_VARIANTS).length >= 14);
  for (const [variant, sections] of Object.entries(PDP_VARIANTS)) {
    assert.equal(sections.length, new Set(sections).size, variant);
    assert.ok(sections.includes('about'), variant);
  }
});

test('editorial PDP normalizes a museum document without source-derived prices', () => {
  const content = emptyPdpContent('museum');
  content.gallery.push({ url: 'https://example.org/photo.jpg', alt: 'Зал', caption: 'Главный зал', credit: 'Музей' });
  content.sections.find((section) => section.kind === 'exhibitions').items.push({
    title: 'Выставка', description: 'Экспозиция', imageUrl: '', linkUrl: '', meta: '', sourceUrl: '',
    details: [{ label: 'Зал', value: '12' }],
  });
  const result = normalizePdpDocument('venues', { variant: 'museum', status: 'REVIEW', content });
  assert.equal(result.status, 'REVIEW');
  assert.equal(result.content.sections.find((section) => section.kind === 'exhibitions').items[0].details[0].value, '12');
  assert.ok(!('price' in result.content));
});

test('event and venue variants cannot be mixed', () => {
  assert.throws(() => normalizePdpDocument('events', { variant: 'museum', content: emptyPdpContent('museum') }), /variant/);
  assert.throws(() => normalizePdpDocument('venues', { variant: 'event', content: emptyPdpContent('event') }), /variant/);
});

test('conversion intent is stored separately from ticket data', () => {
  const content = emptyPdpContent('museum');
  content.conversion = { mode: 'admission', primaryAction: 'buy_ticket', label: 'Купить билет', targetEventId: 'event-1', externalUrl: '' };
  const result = normalizePdpDocument('venues', { variant: 'museum', content });
  assert.equal(result.content.conversion.primaryAction, 'buy_ticket');
  assert.equal(result.content.conversion.targetEventId, 'event-1');
  assert.ok(!('price' in result.content.conversion));
  assert.throws(() => normalizePdpDocument('venues', { variant: 'museum', content: { ...content, conversion: { ...content.conversion, externalUrl: 'javascript:alert(1)' } } }), /HTTP/);
});

test('save keeps the entity relation and increments document version', async () => {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT id FROM')) return { rows: [{ id: 'venue-1' }] };
    return { rows: [{ id: 'doc-1', version: 2 }] };
  } };
  const saved = await savePdpDocument(db, 'venues', 'venue-1', { variant: 'museum', content: emptyPdpContent('museum') });
  assert.equal(saved.version, 2);
  assert.match(calls[1].sql, /ON CONFLICT \("venueId"\)/);
  assert.equal(calls[1].values[1], 'venue-1');
});

test('event PDP documents persist against the event relation only', async () => {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT id FROM')) return { rows: [{ id: 'event-1' }] };
    return { rows: [{ id: 'doc-event-1', variant: 'event' }] };
  } };
  const saved = await savePdpDocument(db, 'events', 'event-1', { variant: 'event', content: emptyPdpContent('event') });
  assert.equal(saved.variant, 'event');
  assert.match(calls[0].sql, /FROM "Event"/);
  assert.match(calls[1].sql, /ON CONFLICT \("eventId"\)/);
  assert.equal(calls[1].values[1], 'event-1');
});

test('public PDP reader emits READY content only and uses the requested owner relation', async () => {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    return { rows: [{ variant: 'event', content: { summary: 'Ready content' } }] };
  } };
  const document = await readReadyPdpDocument(db, 'events', 'event-1');
  assert.deepEqual(document, { variant: 'event', content: { summary: 'Ready content' } });
  assert.match(calls[0].sql, /"eventId" = \$1 AND status = 'READY'/);
  assert.deepEqual(calls[0].values, ['event-1']);

  const draftDb = { query: async () => ({ rows: [] }) };
  assert.equal(await readReadyPdpDocument(draftDb, 'venues', 'venue-1'), null);
  await assert.rejects(readReadyPdpDocument(db, 'users', 'user-1'), /Invalid PDP entity/);
});

test('public PDP reader fails soft when the optional migration is absent', async () => {
  const missingTable = Object.assign(new Error('relation "PdpDocument" does not exist'), { code: '42P01' });
  const db = { query: async () => { throw missingTable; } };
  assert.equal(await readReadyPdpDocument(db, 'venues', 'venue-1'), null);
  await assert.rejects(readReadyPdpDocument({ query: async () => { throw new Error('database unavailable'); } }, 'venues', 'venue-1'), /database unavailable/);
});
