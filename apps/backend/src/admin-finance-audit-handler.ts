import { financeAdminActorHasPermission, verifyFinanceAdminActorAssertion } from './admin-finance-actor.js';
import { listFinanceAdminAudit, type FinanceAdminAuditEntry } from './admin-finance-audit.js';
import { safeEqualString } from './auth.js';
import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { DbClient } from './types/db.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminFinanceAuditHandlerDependencies {
  db: DbClient;
  internalReadToken?: string | null;
  actorAssertionSecret?: string | null;
  auditActorAccess?: (entry: FinanceAdminAuditEntry) => Promise<void>;
}

function parseDate(value: string | null): Date | undefined | null {
  if (value === null) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function boundedText(value: string | null, maxLength: number): string | undefined | null {
  if (value === null) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.length <= maxLength ? normalized : null;
}

export function createAdminFinanceAuditRouteHandler(
  deps: AdminFinanceAuditHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.pathname !== '/api/internal/admin/audit' || context.method !== 'GET') return false;

    const expected = deps.internalReadToken?.trim();
    const header = String(context.request.headers.authorization || '');
    const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!expected || !provided || !safeEqualString(provided, expected)) {
      sendJson(context.response, { error: 'admin_read_auth_required' }, { statusCode: 401 });
      return true;
    }

    const assertion = String(context.request.headers['x-daibilet-admin-assertion'] || '');
    const actor = verifyFinanceAdminActorAssertion(assertion, deps.actorAssertionSecret);
    if (!actor) {
      sendJson(context.response, { error: 'admin_actor_assertion_required' }, { statusCode: 401 });
      return true;
    }
    if (!deps.auditActorAccess) {
      sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
      return true;
    }

    const baseAudit = {
      actorId: actor.id,
      actorName: actor.displayName,
      sessionId: actor.sessionId,
      assertionId: actor.assertionId,
      action: 'audit.read',
      resourceType: 'finance-admin-audit',
      resourceId: null,
    };
    const canRead = financeAdminActorHasPermission(actor, 'audit.read');
    try {
      await deps.auditActorAccess({ ...baseAudit, outcome: canRead ? 'allowed' : 'denied' });
    } catch {
      sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
      return true;
    }
    if (!canRead) {
      sendJson(context.response, { error: 'admin_permission_denied' }, { statusCode: 403 });
      return true;
    }

    const params = context.searchParams;
    const actorId = boundedText(params.get('actorId'), 128);
    const action = boundedText(params.get('action'), 80);
    const resourceType = boundedText(params.get('resourceType'), 80);
    const resourceId = boundedText(params.get('resourceId'), 128);
    const outcomeRaw = params.get('outcome');
    const from = parseDate(params.get('from'));
    const to = parseDate(params.get('to'));
    const pageRaw = params.get('page');
    const limitRaw = params.get('limit');
    const page = pageRaw === null ? 1 : Number(pageRaw);
    const limit = limitRaw === null ? 50 : Number(limitRaw);
    if (
      actorId === null || action === null || resourceType === null || resourceId === null ||
      (outcomeRaw !== null && outcomeRaw !== 'allowed' && outcomeRaw !== 'denied') ||
      from === null || to === null || (from && to && from > to) ||
      !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100
    ) {
      sendJson(context.response, { error: 'invalid_audit_query' }, { statusCode: 400 });
      return true;
    }

    try {
      const result = await listFinanceAdminAudit(deps.db, {
        ...(actorId !== undefined ? { actorId } : {}),
        ...(action !== undefined ? { action } : {}),
        ...(resourceType !== undefined ? { resourceType } : {}),
        ...(resourceId !== undefined ? { resourceId } : {}),
        ...(outcomeRaw !== null ? { outcome: outcomeRaw as 'allowed' | 'denied' } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        page,
        limit,
      });
      sendJson(context.response, result);
    } catch {
      sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
    }
    return true;
  };
}
