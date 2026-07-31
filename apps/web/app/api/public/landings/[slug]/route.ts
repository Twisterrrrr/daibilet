import '@/lib/env';
import { buildPublicLandingPageDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const city = new URL(request.url).searchParams.get('city');
  const payload = await buildPublicLandingPageDto(decodeURIComponent(slug), false, city);
  if (!payload?.landing) {
    return publicJsonResponse({ error: 'not_found' }, { status: 404 });
  }
  return publicJsonResponse(payload);
}
