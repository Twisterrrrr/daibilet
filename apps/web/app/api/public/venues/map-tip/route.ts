import { proxyPublicApiRequest } from '@/server/public-api-proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

/**
 * Lightweight tip for map marker click - no full venue page hydrate.
 * GET /api/public/venues/map-tip?id=<venueId|slug>
 */
export async function GET(request: Request) {
  return proxyPublicApiRequest(request, '/api/public/venues/map-tip', { timeoutMs: 2_000 });
}
