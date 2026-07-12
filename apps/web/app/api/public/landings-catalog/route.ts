import '@/lib/env';
import { buildPublicLandingsCatalogDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = await buildPublicLandingsCatalogDto(url.searchParams);
  return publicJsonResponse(payload);
}
