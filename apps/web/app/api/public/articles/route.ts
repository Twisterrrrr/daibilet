import '@/lib/env';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';

export const revalidate = 300;

export async function GET() {
  const payload = await buildPublicArticlesListDto();
  return publicJsonResponse(payload);
}
