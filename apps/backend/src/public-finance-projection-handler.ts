import type { IncomingMessage } from 'node:http';
import { safeEqualString } from './auth.js';
import { sendJson, sendPublicJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface PublicFinanceProjectionRouteHandlerDependencies {
  projectionToken?: string | null;
  buildAdmissionProductsList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildAdmissionProductDetail: (slugOrId: string) => Promise<unknown | null>;
  buildVenueAdmissionProducts: (venueSlugOrId: string, searchParams: URLSearchParams) => Promise<unknown | null>;
  buildSupplierProjection: (supplierSlugOrId: string, searchParams: URLSearchParams) => Promise<unknown | null>;
}

export function createPublicFinanceProjectionRouteHandler(
  deps: PublicFinanceProjectionRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'GET') return false;

    if (context.pathname === '/api/public/admission-products' || context.pathname === '/api/public/finance/admission-products') {
      if (!authorizeProjectionRequest(context, deps.projectionToken)) return true;
      sendPublicJson(context.response, await deps.buildAdmissionProductsList(context.searchParams));
      return true;
    }

    const admissionMatch = matchPath(context.pathname, /^\/api\/public(?:\/finance)?\/admission-products\/([^/]+)$/);
    if (admissionMatch?.[0]) {
      if (!authorizeProjectionRequest(context, deps.projectionToken)) return true;
      const detail = await deps.buildAdmissionProductDetail(admissionMatch[0]);
      sendPublicJson(context.response, detail || { error: 'admission_product_not_found' }, { statusCode: detail ? 200 : 404 });
      return true;
    }

    const venueMatch = matchPath(context.pathname, /^\/api\/public(?:\/finance)?\/venues\/([^/]+)\/admission-products$/);
    if (venueMatch?.[0]) {
      if (!authorizeProjectionRequest(context, deps.projectionToken)) return true;
      const detail = await deps.buildVenueAdmissionProducts(venueMatch[0], context.searchParams);
      sendPublicJson(context.response, detail || { error: 'venue_not_found' }, { statusCode: detail ? 200 : 404 });
      return true;
    }

    const supplierMatch = matchPath(context.pathname, /^\/api\/public(?:\/finance)?\/suppliers\/([^/]+)$/);
    if (supplierMatch?.[0]) {
      if (!authorizeProjectionRequest(context, deps.projectionToken)) return true;
      const detail = await deps.buildSupplierProjection(supplierMatch[0], context.searchParams);
      sendPublicJson(context.response, detail || { error: 'supplier_not_found' }, { statusCode: detail ? 200 : 404 });
      return true;
    }

    return false;
  };
}

export function isProjectionRequestAuthorized(request: IncomingMessage, projectionToken?: string | null): boolean {
  const expected = cleanString(projectionToken);
  if (!expected) return true;
  const provided = bearerToken(request.headers.authorization) || firstHeader(request.headers['x-daibilet-projection-token']);
  return Boolean(provided && safeEqualString(provided, expected));
}

function authorizeProjectionRequest(context: RouteContext, projectionToken?: string | null): boolean {
  if (isProjectionRequestAuthorized(context.request, projectionToken)) return true;
  sendJson(context.response, { error: 'finance_projection_auth_required' }, { statusCode: 401 });
  return false;
}

function bearerToken(value: string | string[] | undefined): string | null {
  const header = firstHeader(value);
  if (!header) return null;
  if (!header.startsWith('Bearer ')) return null;
  return cleanString(header.slice('Bearer '.length));
}

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}
