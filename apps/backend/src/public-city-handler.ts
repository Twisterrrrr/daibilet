import { sendPublicJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { PublicCityPageDto } from './types/public.js';
import type { PublicDestinationsDto } from './public-city.dto.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface PublicCityHandlerDependencies {
  enabled: boolean;
  buildDestinations: (forceRefresh?: boolean) => Promise<PublicDestinationsDto>;
  buildCity: (slugOrId: string, forceRefresh?: boolean) => Promise<PublicCityPageDto | null>;
}

export function createPublicCityRouteHandler(
  deps: PublicCityHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    const forceRefresh = context.searchParams.get('refresh') === '1';
    if (context.pathname === '/api/public/destinations') {
      sendPublicJson(context.response, await deps.buildDestinations(forceRefresh));
      return true;
    }
    const match = matchPath(context.pathname, /^\/api\/public\/cities\/([^/]+)$/);
    if (!match?.[0]) return false;
    sendPublicJson(context.response, await deps.buildCity(match[0], forceRefresh));
    return true;
  };
}
