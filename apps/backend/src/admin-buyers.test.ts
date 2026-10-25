import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUnifiedAdminBuyers, mapAdminBuyerRow } from './admin-buyers.js';

test('buyer projection masks contacts and never exposes the SQL identity key', () => {
  const row = mapAdminBuyerRow({
    identityKey: 'g:anna@example.com', accountId: null,
    name: 'Анна Крылова', email: 'anna@example.com', phone: '+7 999 123-45-67',
    orders: 2, internalOrders: 1, externalOrders: 1, tickets: 2,
    lastOrderNumber: '1234567',
  });
  const body = JSON.stringify(row);
  assert.equal(row.kind, 'guest');
  assert.equal(row.email, 'a***@example.com');
  assert.equal(row.phone, '***67');
  assert.equal(row.name, 'А. К.');
  assert.equal(row.lookup, '1234567');
  assert.equal(row.orders, 2);
  assert.equal(row.internalOrders, 1);
  assert.equal(row.externalOrders, 1);
  assert.doesNotMatch(body, /anna@example.com|Анна Крылова|999 123/);
});

test('unified buyer read model is paginated and does not send raw SQL row fields', async () => {
  const db = { async query(_sql: string, args: unknown[]) {
    assert.deepEqual(args, [false, 'anna', 2, 2]);
    return { rows: [{ identityKey: 'a:secret', accountId: 'secret', emailVerified: true,
      name: 'Анна', email: 'anna@example.com', orders: 1, internalOrders: 1, externalOrders: 0,
      totalRows: 3, allOrders: 4, allTickets: 4, allAttention: 0, withContacts: 3 }] };
  } };
  const result = await buildUnifiedAdminBuyers(db, new URLSearchParams('q=anna&limit=2&page=2'));
  assert.equal(result.total, 3);
  assert.equal(result.pages, 2);
  assert.equal(result.piiLevel, 'masked');
  assert.equal(result.rows[0]?.kind, 'account');
  assert.equal(result.rows[0]?.emailVerified, true);
  assert.doesNotMatch(JSON.stringify(result), /anna@example.com|a:secret/);
});
