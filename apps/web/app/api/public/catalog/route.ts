import { NextResponse } from 'next/server';
import { publicCatalogQuerySchema } from '@daibilet/contracts/schemas';
import { getCachedUnifiedCatalog } from '@/server/unified-catalog-data';
import { parseCatalogApiQuery } from '@/server/catalog-query';

export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const parsed = publicCatalogQuerySchema.safeParse(Object.fromEntries(params.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_catalog_query' }, { status: 400 });
    }
    const query = parseCatalogApiQuery(params);
    return NextResponse.json(await getCachedUnifiedCatalog(query), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'catalog_unavailable' }, { status: 503 });
  }
}
