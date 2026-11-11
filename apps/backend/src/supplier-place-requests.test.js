import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSupplierPlaceWorkspace, submitSupplierPlaceRequest } from './supplier-place-requests.js';
import { emptyPdpContent } from './pdp-documents.js';

test('supplier workspace exposes linked PDP drafts and their status', async () => {
  const workspace = await buildSupplierPlaceWorkspace({ query: async (sql) => {
    if (sql.includes('FROM "SupplierUser" su') && sql.includes('JOIN "SupplierVenue"')) {
      assert.doesNotMatch(sql, /page\.status\s*=\s*'READY'/);
      return { rows: [{ supplierId: 'supplier-1', supplierRole: 'OPERATOR', venueId: 'venue-1', title: 'Музей', pdpVariant: 'museum', pdpStatus: 'DRAFT', pdpContent: { summary: 'Черновик' } }] };
    }
    return { rows: [] };
  } }, 'user-1');

  assert.equal(workspace.venues[0].pdpStatus, 'DRAFT');
  assert.equal(workspace.venues[0].pdpContent.summary, 'Черновик');
});

test('supplier text edits preserve editor-owned section data and DRAFT status', async () => {
  const content = emptyPdpContent('museum');
  content.summary = 'Старое краткое описание';
  content.conversion = { mode: 'admission', primaryAction: 'buy_ticket', label: 'Билеты', targetEventId: 'event-1', externalUrl: '' };
  content.gallery.push({ url: 'https://example.org/museum.jpg', alt: 'Музей', caption: 'Фасад', credit: 'Музей' });
  content.facts.push({ label: 'Год основания', value: '1900', sourceUrl: 'https://example.org', verifiedAt: '2026-11-01' });
  content.sources.push({ title: 'Официальный сайт', url: 'https://example.org', checkedAt: '2026-11-01' });
  content.sections.find((section) => section.kind === 'exhibitions').items.push({
    title: 'Выставка', description: 'Экспозиция', imageUrl: 'https://example.org/exhibition.jpg',
    linkUrl: 'https://example.org/exhibition', meta: 'До декабря', sourceUrl: 'https://example.org',
    details: [{ label: 'Зал', value: '12' }],
  });
  const current = { variant: 'museum', status: 'DRAFT', content, version: 1 };
  let inserted;
  const db = { query: async (sql, values) => {
    if (sql.includes('SELECT role FROM "SupplierUser"')) return { rows: [{ role: 'OPERATOR' }] };
    if (sql.includes('FROM "SupplierVenue" link')) return { rows: [{ id: 'venue-1', title: 'Музей', placeType: 'MUSEUM' }] };
    if (sql.includes('FROM "PdpDocument" WHERE "venueId"')) return { rows: [current] };
    if (sql.includes('INSERT INTO "SupplierPlaceRequest"')) { inserted = JSON.parse(values[6]); return { rows: [] }; }
    throw new Error(`Unexpected query: ${sql}`);
  } };

  const result = await submitSupplierPlaceRequest(db, 'user-1', {
    type: 'UPDATE', supplierId: 'supplier-1', venueId: 'venue-1',
    pdpContent: {
      summary: 'Новое краткое описание',
      conversion: { mode: 'none', primaryAction: 'none' },
      gallery: [], facts: [], sources: [],
      sections: [{ id: 'exhibitions', kind: 'exhibitions', title: 'Новые выставки', body: 'Уточнённый текст' }],
    },
  });
  // The captured INSERT payload is held from its positional bind parameters.
  assert.equal(result.status, 'SUBMITTED');
  const proposed = inserted.pdpDocument.content;
  assert.equal(inserted.pdpDocument.status, 'DRAFT');
  assert.equal(proposed.summary, 'Новое краткое описание');
  assert.deepEqual(proposed.conversion, content.conversion);
  assert.deepEqual(proposed.gallery, content.gallery);
  assert.deepEqual(proposed.facts, content.facts);
  assert.deepEqual(proposed.sources, content.sources);
  assert.equal(proposed.sections.find((section) => section.kind === 'exhibitions').title, 'Новые выставки');
  assert.deepEqual(proposed.sections.find((section) => section.kind === 'exhibitions').items, content.sections.find((section) => section.kind === 'exhibitions').items);
  assert.equal(proposed.sections.find((section) => section.kind === 'about').title, content.sections.find((section) => section.kind === 'about').title);
  await assert.rejects(() => {
    // An editor-owned block cannot be injected or duplicated by a supplier payload.
    const badContent = { ...content, sections: [{ id: 'not_a_section', kind: 'about', title: 'x', body: 'x' }] };
    return submitSupplierPlaceRequest(db, 'user-1', { type: 'UPDATE', supplierId: 'supplier-1', venueId: 'venue-1', pdpContent: badContent });
  }, /Unknown or duplicate PDP section/);
});
