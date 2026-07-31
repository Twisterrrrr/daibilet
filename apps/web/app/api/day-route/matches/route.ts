import '@/lib/env';
import { matchDayRouteVenues } from '@/server/day-route-match';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * GET /api/day-route/matches?venueIds=a,b,c
 * Public read-only match for «Собери свой день».
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('venueIds') || url.searchParams.get('ids') || '';
  const venueIds = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);

  try {
    const payload = await matchDayRouteVenues(venueIds);
    return publicJsonResponse(payload);
  } catch (error) {
    return publicJsonResponse(
      { error: 'internal_error', message: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
