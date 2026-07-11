import '@/lib/env';
import { buildPublicLandingsCatalogDto } from '@daibilet/backend/public-read';
import { PUBLIC_API_REVALIDATE } from '@/server/cache-config';
import { publicJsonResponse } from '@/server/public-json-response';
export const revalidate = PUBLIC_API_REVALIDATE;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = await buildPublicLandingsCatalogDto(url.searchParams);
  return publicJsonResponse(payload);
}
