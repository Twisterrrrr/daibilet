import { sendPublicJson } from './http.js';
import { type RouteContext } from './routing.js';
import { publicCatalogQuerySchema, type PublicCatalogQuery } from './types/schemas.js';
import type { PublicCatalogDto } from './types/public.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseSearchParams } from './validation.js';

export interface PublicCatalogHandlerDependencies {
  enabled: boolean;
  buildPublicCatalog: (query: PublicCatalogQuery) => Promise<PublicCatalogDto>;
}

export function createPublicCatalogRouteHandler(
  deps: PublicCatalogHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.route !== 'GET /api/public/events') return false;

    const query = parseSearchParams(publicCatalogQuerySchema, context.searchParams);
    sendPublicJson(context.response, await deps.buildPublicCatalog(query));
    return true;
  };
}
