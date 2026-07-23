import { sendPublicJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { PublicVenuePageDto, PublicVenuesDto } from './types/public.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface PublicVenueHandlerDependencies {
  enabled: boolean;
  buildVenues: (searchParams: URLSearchParams, forceRefresh?: boolean) => Promise<PublicVenuesDto>;
  buildVenue: (slugOrId: string, forceRefresh?: boolean) => Promise<PublicVenuePageDto | null>;
}

export function createPublicVenueRouteHandler(
  deps: PublicVenueHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    const forceRefresh = context.searchParams.get('refresh') === '1';
    if (context.pathname === '/api/public/venues') {
      sendPublicJson(context.response, await deps.buildVenues(context.searchParams, forceRefresh));
      return true;
    }
    if (context.pathname === '/api/public/venues/map-tip') {
      const { loadVenueMapTip } = await import('./public-venue-map-tip.js');
      const tipId = String(context.searchParams.get('id') || context.searchParams.get('slug') || '').trim();
      const tip = await loadVenueMapTip(tipId);
      if (!tip) {
        sendPublicJson(context.response, { error: 'not_found' }, { statusCode: 404 });
        return true;
      }
      sendPublicJson(context.response, { tip });
      return true;
    }
    const match = matchPath(context.pathname, /^\/api\/public\/venues\/([^/]+)$/);
    if (!match?.[0]) return false;
    sendPublicJson(context.response, await deps.buildVenue(match[0], forceRefresh));
    return true;
  };
}
