import '@/lib/env';
import { buildPublicCityDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const payload = await buildPublicCityDto(decodeURIComponent(slug));
  if (!payload?.city) {
    return publicJsonResponse({ error: 'not_found' }, { status: 404 });
  }
  return publicJsonResponse(payload);
}
