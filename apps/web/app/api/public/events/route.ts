import '@/lib/env';
import { parseCatalogApiQuery } from '@/server/catalog-query';
import { buildPublicCatalogDto } from '@daibilet/backend/public-read';
import { publicJsonResponse } from '@/server/public-json-response';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const query = parseCatalogApiQuery(url.searchParams);
    const payload = await buildPublicCatalogDto(query);
    return publicJsonResponse(payload);
  } catch (error) {
    return publicJsonResponse(
      { error: 'validation_error', message: error instanceof Error ? error.message : 'Invalid query' },
      { status: 400 },
    );
  }
}
