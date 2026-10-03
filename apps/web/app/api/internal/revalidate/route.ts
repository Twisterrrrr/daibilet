import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { notifyIndexNowForPaths } from '@/lib/indexnow';
import { isAuthorizedInternalRequest, isSafeRevalidatePath } from '@/lib/internal-route-auth';
import { EVENT_PAGE_CACHE_TAG, HOME_PAGE_CACHE_TAG, eventPageCacheTag } from '@/server/cache-config';
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
  /** Convenience: invalidate `/events/[slug]` Data Cache + Full Route Cache. */
  slug?: string;
  /** Skip IndexNow (rare); default notifies changed HTML paths. */
  skipIndexNow?: boolean;
};

function isAuthorized(request: Request): boolean {
  return isAuthorizedInternalRequest(request);
}

function normalizeEventSlug(raw: unknown): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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

  const tags = new Set<string>(body.tags?.length ? body.tags.filter((tag) => /^[\w:.-]{1,120}$/.test(String(tag))) : []);
  const paths = new Set<string>(
    (body.paths || []).filter((item) => isSafeRevalidatePath(String(item))),
  );

  const slug = normalizeEventSlug(body.slug);
  if (slug) {
    tags.add(EVENT_PAGE_CACHE_TAG);
    tags.add(eventPageCacheTag(slug));
    paths.add(`/events/${encodeURIComponent(slug)}`);
  }

  if (!tags.size && !paths.size) {
    tags.add(HOME_PAGE_CACHE_TAG);
    paths.add('/');
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }
  for (const path of paths) {
    revalidatePath(path);
  }

  const pathList = [...paths];
  // Batch IndexNow for HTML paths only (skips /api/*). Debounced in-process.
  if (!body.skipIndexNow) {
    notifyIndexNowForPaths(pathList, 'revalidate');
  }

  return NextResponse.json({
    ok: true,
    revalidatedTags: [...tags],
    revalidatedPaths: pathList,
    slug: slug || undefined,
    indexNowQueued: !body.skipIndexNow,
    at: new Date().toISOString(),
  });
}
