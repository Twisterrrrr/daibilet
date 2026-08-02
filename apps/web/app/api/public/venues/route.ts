import { proxyPublicApiRequest } from '@/server/public-api-proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.searchParams);
  if (!params.get('limit')) params.set('limit', '500');
  return proxyPublicApiRequest(request, '/api/public/venues', { searchParams: params });
}
