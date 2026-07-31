import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { notifyIndexNowForPaths } from '@/lib/indexnow';
import { HOME_PAGE_CACHE_TAG } from '@/server/cache-config';
import {
  clearPublicArticlesDtoCache,
  clearPublicCityDtoCache,
  clearPublicEventDtoCache,
  clearPublicVenueDtoCache,
} from '@daibilet/backend/public-read';

export const dynamic = 'force-dynamic';

type RevalidateBody = {
  tags?: string[];
  paths?: string[];
  /** Skip IndexNow (rare); default notifies changed HTML paths. */
  skipIndexNow?: boolean;
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

  // Next SSR keeps its own in-memory DTO caches - clear on every revalidate.
  try {
    clearPublicArticlesDtoCache();
  } catch {
    /* ignore if module unavailable in this runtime */
  }
  try {
    clearPublicEventDtoCache();
  } catch {
    /* ignore if module unavailable in this runtime */
  }
  try {
    clearPublicCityDtoCache();
  } catch {
    /* ignore if module unavailable in this runtime */
  }
  try {
    clearPublicVenueDtoCache();
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

  // Batch IndexNow for HTML paths only (skips /api/*). Debounced in-process.
  if (!body.skipIndexNow) {
    notifyIndexNowForPaths(paths, 'revalidate');
  }

  return NextResponse.json({
    ok: true,
    revalidatedTags: tags,
    revalidatedPaths: paths,
    indexNowQueued: !body.skipIndexNow,
    at: new Date().toISOString(),
  });
}
