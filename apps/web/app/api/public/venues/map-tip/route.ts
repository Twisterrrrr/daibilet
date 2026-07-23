import '@/lib/env';
import { loadVenueMapTip } from '@/server/venue-map-data';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

/**
 * Lightweight tip for map marker click - no full venue page hydrate.
 * GET /api/public/venues/map-tip?id=<venueId|slug>
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || url.searchParams.get('slug') || '';
  try {
    const tip = await loadVenueMapTip(id);
    if (!tip) return publicJsonResponse({ error: 'not_found' }, { status: 404 });
    return publicJsonResponse({ tip });
  } catch (error) {
    return publicJsonResponse(
      { error: 'internal_error', message: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
