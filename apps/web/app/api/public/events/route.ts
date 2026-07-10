import { NextResponse } from 'next/server';

import '@/lib/env';
import { parseCatalogApiQuery } from '@/server/catalog-query';
import { buildPublicCatalogDto } from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const query = parseCatalogApiQuery(url.searchParams);
    const payload = await buildPublicCatalogDto(query);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: 'validation_error', message: error instanceof Error ? error.message : 'Invalid query' },
      { status: 400 },
    );
  }
}
