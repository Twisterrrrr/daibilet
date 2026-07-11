import '@/lib/env';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';
import { PUBLIC_API_REVALIDATE } from '@/server/cache-config';
import { publicJsonResponse } from '@/server/public-json-response';

export const revalidate = PUBLIC_API_REVALIDATE;

export async function GET() {
  const payload = await buildPublicArticlesListDto();
  return publicJsonResponse(payload);
}
