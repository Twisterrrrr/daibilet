import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminSuppliersRouteHandlerDependencies {
  buildSuppliersList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildSupplierDetail: (idOrSlug: string) => Promise<unknown>;
}

export function createAdminSuppliersRouteHandler(
  deps: AdminSuppliersRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'GET') return false;

    if (context.pathname === '/api/admin/suppliers') {
      sendJson(context.response, await deps.buildSuppliersList(context.searchParams));
      return true;
    }

    const match = matchPath(context.pathname, /^\/api\/admin\/suppliers\/([^/]+)$/);
    if (!match) return false;

    const [idOrSlug] = match;
    if (!idOrSlug) return false;

    sendJson(context.response, await deps.buildSupplierDetail(idOrSlug));
    return true;
  };
}
