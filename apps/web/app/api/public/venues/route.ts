import '@/lib/env';
import { buildPublicVenuesDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.searchParams);
  if (!params.get('limit')) params.set('limit', '500');
  const payload = await buildPublicVenuesDto(params);
  return publicJsonResponse(payload);
}
