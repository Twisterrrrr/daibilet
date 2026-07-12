import '@/lib/env';
import { buildPublicStatsDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  try {
    const payload = await buildPublicStatsDto(forceRefresh);
    return publicJsonResponse(payload);
  } catch (error) {
    return publicJsonResponse(
      { error: 'internal_error', message: error instanceof Error ? error.message : 'Failed to load stats' },
      { status: 500 },
    );
  }
}
