import { NextResponse } from 'next/server';

import '@/lib/env';
import { buildPublicVenueDto } from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const payload = await buildPublicVenueDto(decodeURIComponent(slug));
  if (!payload?.venue) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(payload);
}
