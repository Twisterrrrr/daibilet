import { proxyPublicApiRequest } from '@/server/public-api-proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return proxyPublicApiRequest(request, `/api/public/articles/${encodeURIComponent(decodeURIComponent(slug))}`);
}
