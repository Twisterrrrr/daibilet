import { proxyPublicApiRequest } from '@/server/public-api-proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  return proxyPublicApiRequest(request, '/api/public/search/results', { timeoutMs: 5_000 });
}
