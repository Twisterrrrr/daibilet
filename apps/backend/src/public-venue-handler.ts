import { sendPublicJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { PublicVenuePageDto, PublicVenuesDto } from './types/public.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface PublicVenueHandlerDependencies {
  enabled: boolean;
  buildVenues: (searchParams: URLSearchParams, forceRefresh?: boolean) => Promise<PublicVenuesDto>;
  buildVenue: (slugOrId: string, forceRefresh?: boolean) => Promise<PublicVenuePageDto | null>;
  buildVenueEventCounts?: (venueIds: string[]) => Promise<{ generatedAt: string; counts: Record<string, number> }>;
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
    if (context.pathname === '/api/public/venues/event-counts') {
      const raw = String(context.searchParams.get('ids') || '').trim();
      const ids = raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 100);
      if (!deps.buildVenueEventCounts) {
        sendPublicJson(context.response, { error: 'unavailable' }, { statusCode: 503 });
        return true;
      }
      sendPublicJson(context.response, await deps.buildVenueEventCounts(ids));
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
    const venue = await deps.buildVenue(match[0], forceRefresh);
    if (!venue) {
      // Never 200+null: web generateMetadata treats thrown cache-miss as HTTP 500.
      sendPublicJson(context.response, { error: 'not_found' }, { statusCode: 404 });
      return true;
    }
    sendPublicJson(context.response, venue);
    return true;
  };
}
