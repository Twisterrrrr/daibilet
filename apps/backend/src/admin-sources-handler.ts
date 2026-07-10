import type { AdminSourcesDto } from '@daibilet/contracts/source';
import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminSourcesHandlerDependencies {
  buildSources: () => Promise<AdminSourcesDto>;
}

export function createAdminSourcesRouteHandler(
  deps: AdminSourcesHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.route !== 'GET /api/admin/sources') return false;
    sendJson(context.response, await deps.buildSources());
    return true;
  };
}
