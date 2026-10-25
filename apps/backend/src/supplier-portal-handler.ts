import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface SupplierPortalRouteHandlerDependencies {
  resolveSearchParams?: (context: RouteContext) => Promise<URLSearchParams>;
  buildDashboard: (searchParams: URLSearchParams) => Promise<unknown>;
  buildProfile: (searchParams: URLSearchParams) => Promise<unknown>;
  buildEventsList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildAdmissionsList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildOrdersList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildFinance: (searchParams: URLSearchParams) => Promise<unknown>;
  buildReviewsList: (searchParams: URLSearchParams) => Promise<unknown>;
}

export function createSupplierPortalRouteHandler(deps: SupplierPortalRouteHandlerDependencies): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'GET') return false;
    if (!context.pathname.startsWith('/api/supplier/')) return false;
    if (context.pathname.startsWith('/api/supplier/auth/')) return false;

    const buildPayload = resolveSupplierPortalBuilder(context.pathname, deps);
    if (!buildPayload) return false;

    const searchParams = deps.resolveSearchParams
      ? await deps.resolveSearchParams(context)
      : context.searchParams;
    sendJson(context.response, await buildPayload(searchParams));
    return true;
  };
}

function resolveSupplierPortalBuilder(
  pathname: string,
  deps: SupplierPortalRouteHandlerDependencies,
): ((searchParams: URLSearchParams) => Promise<unknown>) | null {
  if (pathname === '/api/supplier/me' || pathname === '/api/supplier/profile') return deps.buildProfile;
  if (pathname === '/api/supplier/dashboard') return deps.buildDashboard;
  if (pathname === '/api/supplier/events') return deps.buildEventsList;
  if (pathname === '/api/supplier/admissions') return deps.buildAdmissionsList;
  if (pathname === '/api/supplier/orders') return deps.buildOrdersList;
  if (pathname === '/api/supplier/finance') return deps.buildFinance;
  if (pathname === '/api/supplier/reviews') return deps.buildReviewsList;
  return null;
}
