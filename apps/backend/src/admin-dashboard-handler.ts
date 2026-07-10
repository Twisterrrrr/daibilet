import type { AdminDashboardDto } from '@daibilet/contracts/admin';
import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminDashboardHandlerDependencies {
  buildDashboard: (forceRefresh?: boolean) => Promise<AdminDashboardDto>;
}

export function createAdminDashboardRouteHandler(
  deps: AdminDashboardHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.route !== 'GET /api/admin/dashboard') return false;
    sendJson(context.response, await deps.buildDashboard(context.searchParams.get('refresh') === '1'));
    return true;
  };
}
