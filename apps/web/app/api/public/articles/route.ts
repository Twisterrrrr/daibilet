import '@/lib/env';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const citySlug = url.searchParams.get('citySlug');
  const rankCitySlug = url.searchParams.get('rankCitySlug');
  const includeBroad = url.searchParams.get('includeBroad') === '1';
  const excludeFeatured = url.searchParams.get('excludeFeatured') === '1';
  const cursor = url.searchParams.get('cursor');
  const limitRaw = Number(url.searchParams.get('limit') || 0);
  const payload = await buildPublicArticlesListDto({
    citySlug: citySlug || undefined,
    rankCitySlug: rankCitySlug || undefined,
    includeBroad,
    excludeFeatured,
    cursor: cursor || undefined,
    limit: limitRaw > 0 ? limitRaw : undefined,
  });
  return publicJsonResponse(payload);
}
