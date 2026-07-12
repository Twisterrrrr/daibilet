import '@/lib/env';
import { buildPublicSearchDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const payload = await buildPublicSearchDto(url.searchParams);
    return publicJsonResponse(payload);
  } catch (error) {
    return publicJsonResponse(
      { error: 'internal_error', message: error instanceof Error ? error.message : 'Failed to load search' },
      { status: 500 },
    );
  }
}
