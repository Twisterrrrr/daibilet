import { NextRequest, NextResponse } from 'next/server';

import '@/lib/env';
import { buildPublicArticlesListDto } from '@daibilet/backend/public-read';

export async function GET() {
  const payload = await buildPublicArticlesListDto();
  return NextResponse.json(payload);
}
