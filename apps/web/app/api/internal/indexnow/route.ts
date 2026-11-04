import '@/lib/env';

import { NextResponse } from 'next/server';

import {
  INDEXNOW_DEPLOY_PATHS,
  submitIndexNow,
} from '@/lib/indexnow';
import { isAuthorizedInternalRequest } from '@/lib/internal-route-auth';

export const dynamic = 'force-dynamic';

type IndexNowBody = {
  urls?: string[];
  paths?: string[];
  reason?: string;
  /** If true, submit curated deploy TOP set (not full catalog). */
  deployWarm?: boolean;
};

function isAuthorized(request: Request): boolean {
  return isAuthorizedInternalRequest(request);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: IndexNowBody = {};
  try {
    body = (await request.json()) as IndexNowBody;
  } catch {
    body = {};
  }

  const paths = [
    ...(body.paths || []),
    ...(body.urls || []),
    ...(body.deployWarm ? INDEXNOW_DEPLOY_PATHS : []),
  ];

  if (!paths.length) {
    return NextResponse.json({ error: 'paths_required' }, { status: 400 });
  }

  const result = await submitIndexNow(paths, body.reason || 'api/internal/indexnow');
  return NextResponse.json({
    ...result,
    at: new Date().toISOString(),
  });
}
