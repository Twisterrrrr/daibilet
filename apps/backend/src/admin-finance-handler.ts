import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminFinanceHandlerDependencies {
  enabled: boolean;
  buildLedger: (searchParams: URLSearchParams) => Promise<unknown>;
}

export function createAdminFinanceRouteHandler(
  deps: AdminFinanceHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    if (context.pathname !== '/api/admin/finance/ledger' && context.pathname !== '/api/admin/finance/reconcile') return false;
    sendJson(context.response, await deps.buildLedger(context.searchParams));
    return true;
  };
}
