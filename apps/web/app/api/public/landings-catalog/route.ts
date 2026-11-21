import { isLandingInSelection } from '@/lib/landing-features';
import { proxyPublicApiRequest } from '@/server/public-api-proxy';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  const response = await proxyPublicApiRequest(request, '/api/public/landings-catalog');
  if (!response.ok) return response;
  const payload = (await response.json()) as { items?: Array<{ slug: string }> };
  return Response.json(
    { ...payload, items: (payload.items || []).filter((item) => isLandingInSelection(item.slug)) },
    { status: response.status },
  );
}
