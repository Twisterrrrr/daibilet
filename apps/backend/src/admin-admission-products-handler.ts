import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminAdmissionProductsRouteHandlerDependencies {
  buildAdmissionProductsList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildVenueAdmissionProductsList: (venueId: string, searchParams: URLSearchParams) => Promise<unknown>;
}

export function createAdminAdmissionProductsRouteHandler(
  deps: AdminAdmissionProductsRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'GET') return false;

    if (context.pathname === '/api/admin/admission-products') {
      sendJson(context.response, await deps.buildAdmissionProductsList(context.searchParams));
      return true;
    }

    const venueMatch = matchPath(context.pathname, /^\/api\/admin\/venues\/([^/]+)\/admission-products$/);
    if (venueMatch) {
      const [venueId] = venueMatch;
      if (!venueId) return false;
      sendJson(context.response, await deps.buildVenueAdmissionProductsList(venueId, context.searchParams));
      return true;
    }

    return false;
  };
}
