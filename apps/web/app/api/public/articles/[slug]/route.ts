import { NextRequest, NextResponse } from 'next/server';

import '@/lib/env';
import { buildPublicArticlePageDto } from '@daibilet/backend/public-read';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const payload = await buildPublicArticlePageDto(decodeURIComponent(slug));
  if (!payload?.article) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(payload);
}
