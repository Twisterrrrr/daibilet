import { proxyPublicApiRequest } from '@/server/public-api-proxy';

export async function GET(request: Request) {
  return proxyPublicApiRequest(request, '/api/public/orders', { timeoutMs: 3_000 });
}
