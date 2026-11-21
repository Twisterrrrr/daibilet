import { proxyPublicApiRequest } from '@/server/public-api-proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

/**
 * In production nginx sends this path directly to daibilet-api. In local dev
 * proxy to the same backend instead of rebuilding a second catalog in Next.
 */
export async function GET(request: Request) {
  return proxyPublicApiRequest(request, '/api/public/events');
}
