import { NextResponse } from 'next/server';

import '@/lib/env';
import { buildPublicLandingsCatalogDto } from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = await buildPublicLandingsCatalogDto(url.searchParams);
  return NextResponse.json(payload);
}
