import { NextRequest, NextResponse } from 'next/server';

import '@/lib/env';
import { buildPublicBuyerOrdersDto } from '@daibilet/backend/public-read';

export async function GET(request: NextRequest) {
  const payload = await buildPublicBuyerOrdersDto(request.nextUrl.searchParams);
  return NextResponse.json(payload);
}
