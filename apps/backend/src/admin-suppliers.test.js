import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addAdminSupplierUser,
  addAdminSupplierVenue,
  createAdminSupplier,
  listAdminSuppliers,
  setAdminSupplierStatus,
  setAdminSupplierUser,
  setAdminSupplierVenue,
} from './admin-suppliers.js';

function transactionDb(handler) {
  return { transaction: async (callback) => callback({ query: handler }) };
}

test('supplier creation is draft-only and audited', async () => {
  const calls = [];
  const db = transactionDb(async (sql, values) => {
    calls.push({ sql: String(sql), values });
    if (String(sql).includes('INSERT INTO "Supplier"')) return { rows: [{ id: values[0], slug: values[1], title: values[2], status: 'DRAFT' }] };
    return { rows: [] };
  });
  const result = await createAdminSupplier(db, { title: 'Тестовый поставщик', slug: 'codex-staging', email: 'TEST@example.org' });
  assert.equal(result.status, 'DRAFT');
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /'DRAFT'::"SupplierStatus"/);
  assert.equal(calls[0].values[3], 'test@example.org');
  assert.match(calls[1].sql, /SUPPLIER_CREATED/);
  await assert.rejects(createAdminSupplier(db, { title: 'Bad', slug: 'not valid' }), /Invalid supplier slug/);
});

test('supplier account assignment requires an existing active SiteUser and is audited', async () => {
  const calls = [];
  const db = transactionDb(async (sql, values) => {
    const query = String(sql);
    calls.push({ query, values });
    if (query.includes('SELECT id FROM "Supplier"')) return { rows: [{ id: 'supplier-1' }] };
    if (query.includes('SELECT id, email FROM "SiteUser"')) return { rows: [{ id: 'user-1', email: 'operator@example.org' }] };
    if (query.includes('INSERT INTO "SupplierUser"')) return { rows: [{ supplierId: 'supplier-1', siteUserId: 'user-1', role: 'OWNER', isActive: true }] };
    return { rows: [] };
  });
  const result = await addAdminSupplierUser(db, 'supplier-1', { email: ' OPERATOR@EXAMPLE.ORG ', role: 'OWNER' });
  assert.deepEqual(result, { supplierId: 'supplier-1', siteUserId: 'user-1', role: 'OWNER', isActive: true, email: 'operator@example.org' });
  assert.match(calls.find(({ query }) => query.includes('SiteUser')).query, /"isActive" = true/);
  assert.ok(calls.some(({ query }) => query.includes('SUPPLIER_USER_ASSIGNED')));
});

test('supplier membership updates and soft unlink operations are audited', async () => {
  const auditActions = [];
  const db = transactionDb(async (sql) => {
    const query = String(sql);
    const action = query.match(/'(SUPPLIER_[A-Z_]+)'/u)?.[1];
    if (action) auditActions.push(action);
    if (query.includes('UPDATE "SupplierUser"')) return { rows: [{ supplierId: 'supplier-1', siteUserId: 'user-1', role: 'OPERATOR', isActive: false }] };
    if (query.includes('UPDATE "SupplierVenue"')) return { rows: [{ supplierId: 'supplier-1', venueId: 'venue-1', isActive: false }] };
    if (query.includes('UPDATE "Supplier"')) return { rows: [{ id: 'supplier-1', status: 'ARCHIVED' }] };
    return { rows: [] };
  });
  assert.equal((await setAdminSupplierUser(db, 'supplier-1', 'user-1', { isActive: false })).isActive, false);
  assert.equal((await setAdminSupplierVenue(db, 'supplier-1', 'venue-1', false)).isActive, false);
  assert.equal((await setAdminSupplierStatus(db, 'supplier-1', 'ARCHIVED')).status, 'ARCHIVED');
  assert.deepEqual(auditActions, ['SUPPLIER_USER_UPDATED', 'SUPPLIER_VENUE_UPDATED', 'SUPPLIER_STATUS_UPDATED']);
  await assert.rejects(setAdminSupplierUser(db, 'supplier-1', 'user-1', {}), /No supplier membership changes/);
});

test('venue linking checks both records, reactivates the link, and audits it', async () => {
  const calls = [];
  const db = transactionDb(async (sql, values) => {
    const query = String(sql);
    calls.push({ query, values });
    if (query.includes('SELECT id FROM "Supplier"')) return { rows: [{ id: 'supplier-1' }] };
    if (query.includes('SELECT id, title FROM "Venue"')) return { rows: [{ id: 'venue-1', title: 'Музей' }] };
    if (query.includes('INSERT INTO "SupplierVenue"')) return { rows: [{ supplierId: 'supplier-1', venueId: 'venue-1', isPrimary: true, isActive: true }] };
    return { rows: [] };
  });
  const result = await addAdminSupplierVenue(db, 'supplier-1', { venueId: 'venue-1', isPrimary: true });
  assert.equal(result.isActive, true);
  assert.match(calls.find(({ query }) => query.includes('INSERT INTO "SupplierVenue"')).query, /ON CONFLICT/);
  assert.ok(calls.some(({ query }) => query.includes('SUPPLIER_VENUE_LINKED')));
});

test('supplier list exposes linked identities but no financial credentials', async () => {
  let query = '';
  const db = { query: async (sql) => { query = String(sql); return { rows: [] }; } };
  await listAdminSuppliers(db, 'museum');
  assert.match(query, /"SupplierUser"/);
  assert.match(query, /"SupplierVenue"/);
  assert.doesNotMatch(query, /payoutAccount|yookassaShopId|"inn"/i);
});
