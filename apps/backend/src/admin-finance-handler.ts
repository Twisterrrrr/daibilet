import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import { adminFinanceClosePeriodPayloadSchema } from './types/schemas.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export interface AdminFinanceHandlerDependencies {
  enabled: boolean;
  buildLedger: (searchParams: URLSearchParams) => Promise<unknown>;
  closePeriod: (payload: {
    supplierId: string;
    periodStart: string;
    periodEnd: string;
    basis?: 'SOLD' | 'COMPLETED' | undefined;
    issueDocuments?: boolean | undefined;
  }) => Promise<unknown>;
}

export function createAdminFinanceRouteHandler(
  deps: AdminFinanceHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled) return false;
    if (context.method === 'GET') {
      if (context.pathname !== '/api/admin/finance/ledger' && context.pathname !== '/api/admin/finance/reconcile') return false;
      sendJson(context.response, await deps.buildLedger(context.searchParams));
      return true;
    }
    if (context.method === 'POST' && context.pathname === '/api/admin/finance/close-period') {
      const payload = await parseJsonBody(adminFinanceClosePeriodPayloadSchema, context.request);
      try {
        sendJson(context.response, await deps.closePeriod(payload), { statusCode: 201 });
      } catch (error) {
        if (typeof (error as { statusCode?: unknown })?.statusCode === 'number' && Array.isArray((error as { blockers?: unknown }).blockers)) {
          sendJson(
            context.response,
            { error: error instanceof Error ? error.message : 'finance_period_blocked', blockers: (error as { blockers: string[] }).blockers },
            { statusCode: (error as { statusCode: number }).statusCode },
          );
          return true;
        }
        throw error;
      }
      return true;
    }
    return false;
  };
}
