import { NextResponse } from 'next/server';

import '@/lib/env';
import { buildPublicCityDto } from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const payload = await buildPublicCityDto(decodeURIComponent(slug));
  if (!payload?.city) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(payload);
}
