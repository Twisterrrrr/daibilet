import assert from 'node:assert/strict';
import test from 'node:test';
import { listFinanceAdminAudit, recordFinanceAdminAudit } from './admin-finance-audit.js';
import type { DbClient } from './types/db.js';

test('finance admin audit stores actor and resource identity without personal or payment payloads', async () => {
  let queryText = '';
  let params: readonly unknown[] = [];
  const db = {
    async query(text: string, values: readonly unknown[] = []) { queryText = text; params = values; return { rows: [] }; },
  } as unknown as DbClient;
  await recordFinanceAdminAudit(db, {
    actorId: 'staff-1', actorName: 'Иван Финансов', sessionId: 'session-1', assertionId: 'assertion-1',
    action: 'orders.pii.read', resourceType: 'order', resourceId: '8558943', outcome: 'allowed',
  });
  assert.match(queryText, /INSERT INTO "FinanceAdminAuditEvent"/iu);
  assert.deepEqual(params.slice(1), ['staff-1', 'Иван Финансов', 'session-1', 'assertion-1', 'orders.pii.read', 'order', '8558943', 'allowed']);
  assert.equal(params.some((value) => String(value).includes('@')), false);
});

test('finance audit query uses parameterized filters and bounded pagination', async () => {
  const queries: Array<{ sql: string; params: readonly unknown[] }> = [];
  const db = {
    async query(sql: string, params: readonly unknown[] = []) {
      queries.push({ sql, params });
      return queries.length === 1
        ? { rows: [{ total: 1 }] }
        : { rows: [{ id: 'audit-1', actorId: 'staff-1', action: 'finance.read' }] };
    },
  } as unknown as DbClient;
  const result = await listFinanceAdminAudit(db, {
    actorId: 'staff-1', action: 'finance.read', resourceType: 'order', resourceId: '8558943',
    outcome: 'allowed', from: new Date('2026-10-01T00:00:00.000Z'), to: new Date('2026-10-25T00:00:00.000Z'),
    page: 2, limit: 25,
  });
  assert.equal(result.total, 1);
  assert.equal(result.page, 2);
  assert.equal(result.limit, 25);
  assert.equal(result.items.length, 1);
  assert.match(queries[0]!.sql, /"actorId" = \$1/u);
  assert.match(queries[0]!.sql, /"createdAt" <= \$7/u);
  assert.match(queries[1]!.sql, /limit \$8 offset \$9/u);
  assert.deepEqual(queries[1]!.params.slice(-2), [25, 25]);
  assert.equal(queries.some(({ sql }) => /email|phone|buyerSnapshot|payment/u.test(sql)), false);
});
