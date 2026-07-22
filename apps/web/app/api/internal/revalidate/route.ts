import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { HOME_PAGE_CACHE_TAG } from '@/server/cache-config';
import { clearPublicArticlesDtoCache } from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

type RevalidateBody = {
  tags?: string[];
  paths?: string[];
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.DAIBILET_NEXT_REVALIDATE_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerSecret = request.headers.get('x-revalidate-secret')?.trim() || '';
  return bearer === secret || headerSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: RevalidateBody = {};
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    body = {};
  }

  // Next SSR keeps its own in-memory article DTO cache - clear on every revalidate.
  try {
    clearPublicArticlesDtoCache();
  } catch {
    /* ignore if module unavailable in this runtime */
  }

  const tags = body.tags?.length ? body.tags : [HOME_PAGE_CACHE_TAG];
  const paths = body.paths?.length ? body.paths : ['/'];

  for (const tag of tags) {
    revalidateTag(tag);
  }
  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidatedTags: tags,
    revalidatedPaths: paths,
    at: new Date().toISOString(),
  });
}
