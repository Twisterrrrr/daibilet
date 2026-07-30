import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminListingHealthRouteHandlerDependencies {
  buildListingHealthOverview: (searchParams: URLSearchParams) => Promise<unknown>;
}

export function createAdminListingHealthRouteHandler(
  deps: AdminListingHealthRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'GET') return false;
    if (context.pathname !== '/api/admin/listing-health') return false;
    sendJson(context.response, await deps.buildListingHealthOverview(context.searchParams));
    return true;
  };
}
