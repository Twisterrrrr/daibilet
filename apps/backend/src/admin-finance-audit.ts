import { randomUUID } from 'node:crypto';
import type { DbClient } from './types/db.js';

export type FinanceAdminAuditEntry = {
  actorId: string;
  actorName: string;
  sessionId: string;
  assertionId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: 'allowed' | 'denied';
};

/** Persist a minimal access record. Never pass buyer fields, search terms, or payment data here. */
export async function recordFinanceAdminAudit(db: DbClient, entry: FinanceAdminAuditEntry): Promise<void> {
  await db.query(`
    insert into "FinanceAdminAuditEvent"
      ("id", "actorId", "actorName", "sessionId", "assertionId", "action", "resourceType", "resourceId", "outcome", "createdAt")
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
  `, [randomUUID(), entry.actorId, entry.actorName, entry.sessionId, entry.assertionId, entry.action, entry.resourceType, entry.resourceId, entry.outcome]);
}

export type FinanceAdminAuditFilters = {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: 'allowed' | 'denied';
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
};

export async function listFinanceAdminAudit(db: DbClient, filters: FinanceAdminAuditFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };

  if (filters.actorId) add('"actorId" = ?', filters.actorId);
  if (filters.action) add('action = ?', filters.action);
  if (filters.resourceType) add('"resourceType" = ?', filters.resourceType);
  if (filters.resourceId) add('"resourceId" = ?', filters.resourceId);
  if (filters.outcome) add('outcome = ?', filters.outcome);
  if (filters.from) add('"createdAt" >= ?', filters.from);
  if (filters.to) add('"createdAt" <= ?', filters.to);

  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  const count = await db.query<{ total: string | number }>(
    `select count(*)::int as total from "FinanceAdminAuditEvent" ${where}`,
    values,
  );
  const pageValues = [...values, filters.limit, (filters.page - 1) * filters.limit];
  const rows = await db.query<{
    id: string;
    actorId: string;
    actorName: string;
    sessionId: string;
    assertionId: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    outcome: 'allowed' | 'denied';
    createdAt: string | Date;
  }>(
    `select "id", "actorId", "actorName", "sessionId", "assertionId", "action", "resourceType", "resourceId", "outcome", "createdAt"
       from "FinanceAdminAuditEvent" ${where}
      order by "createdAt" desc, "id" desc
      limit $${values.length + 1} offset $${values.length + 2}`,
    pageValues,
  );
  const total = Number(count.rows[0]?.total || 0);
  return {
    items: rows.rows,
    page: filters.page,
    limit: filters.limit,
    total,
    pages: Math.ceil(total / filters.limit),
  };
}
