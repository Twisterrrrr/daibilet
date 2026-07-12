import '@/lib/env';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET() {
  const payload = await buildPublicArticlesListDto();
  return publicJsonResponse(payload);
}
